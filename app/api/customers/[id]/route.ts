import { NextRequest, NextResponse } from "next/server";
import { requireEmployee } from "@/lib/apiAuth";
import { connectMongoDB } from "@/lib/mongo";
import { del } from "@vercel/blob";
import User from "@/app/models/User";
import WalkinCredential from "@/app/models/WalkinCredential";
import Quotation from "@/app/models/Quotation";
import Chat from "@/models/Chat";
import RFQ from "@/app/models/RFQ";
import PDF from "@/app/models/PDF";
import PurchaseOrder from "@/app/models/PurchaseOrder";
import Billing from "@/app/models/Billing";
import PaymentProof from "@/app/models/PaymentProof";
import ArchivedChat from "@/app/models/ArchivedChat";
import ArchivedRFQ from "@/app/models/ArchivedRFQ";
import { encryptPassword, decryptPassword } from "@/lib/walkinCrypto";
import bcrypt from "bcryptjs";
import crypto from "crypto";

type Params = { params: Promise<{ id: string }> };

async function loadCustomer(id: string) {
  const user = await User.findById(id);
  if (!user) return { error: NextResponse.json({ message: "ไม่พบลูกค้า" }, { status: 404 }) };
  if (user.role !== "user") {
    return { error: NextResponse.json({ message: "ทำได้เฉพาะบัญชีลูกค้า" }, { status: 403 }) };
  }
  return { user };
}

// View a walk-in customer's stored password (staff front desk, "ลูกค้าลืมรหัส")
export async function GET(_req: NextRequest, { params }: Params) {
  const sessionOrRes = await requireEmployee("quotation");
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;

  const { id } = await params;
  await connectMongoDB();

  const { user, error } = await loadCustomer(id);
  if (error) return error;

  const cred = await WalkinCredential.findOne({ userId: user._id.toString() }).lean() as
    { password: string } | null;
  if (!cred) return NextResponse.json({ message: "บัญชีนี้ไม่มีรหัสที่เก็บไว้" }, { status: 404 });

  const password = decryptPassword(cred.password);
  if (!password) {
    // NEXTAUTH_SECRET rotated → old blobs unreadable; reset is the way out
    return NextResponse.json({ message: "อ่านรหัสเดิมไม่ได้ กรุณารีเซ็ตรหัสผ่าน" }, { status: 410 });
  }
  return NextResponse.json({ password });
}

// Reset password — fresh one shown to staff; stored credential updated so it stays viewable
export async function PATCH(_req: NextRequest, { params }: Params) {
  const sessionOrRes = await requireEmployee("quotation");
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;

  const { id } = await params;
  await connectMongoDB();

  const { user, error } = await loadCustomer(id);
  if (error) return error;

  const password = crypto.randomUUID().replace(/-/g, "").slice(0, 10);
  user.password = await bcrypt.hash(password, 10);
  await user.save();

  // keep the stored credential in sync; also adopts pre-feature walk-in accounts
  const isWalkin = (user.email as string).endsWith("@walkin.local");
  const existing = await WalkinCredential.findOne({ userId: user._id.toString() });
  if (existing || isWalkin) {
    await WalkinCredential.updateOne(
      { userId: user._id.toString() },
      { password: encryptPassword(password) },
      { upsert: true }
    );
  }

  return NextResponse.json({ password });
}

// Delete a stale walk-in account: archive chats + RFQs (like /api/admin/reset),
// then remove quotations/PDF files/credential/account. Refuses when PO/billing/payment
// documents exist — those must not lose their owner.
export async function DELETE(_req: NextRequest, { params }: Params) {
  const sessionOrRes = await requireEmployee("quotation");
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;

  const { id } = await params;
  await connectMongoDB();

  const { user, error } = await loadCustomer(id);
  if (error) return error;
  const userId = user._id.toString();

  const [poCount, billCount, payCount] = await Promise.all([
    PurchaseOrder.countDocuments({ userId }),
    Billing.countDocuments({ customerId: userId }),
    PaymentProof.countDocuments({ customerId: userId }),
  ]);
  if (poCount + billCount + payCount > 0) {
    return NextResponse.json(
      { message: "ลบไม่ได้ — บัญชีนี้มีเอกสาร PO/ใบวางบิล/การชำระเงินผูกอยู่" },
      { status: 400 }
    );
  }

  const quotations = await Quotation.find({ userId });
  const latestQuotationId = quotations[0]?._id?.toString() ?? "";

  // archive chats (same shape as /api/admin/reset)
  const chats = await Chat.find({ userId });
  if (chats.length > 0) {
    await ArchivedChat.create({
      userId,
      originalQuotationId: latestQuotationId,
      archivedAt: new Date(),
      messages: chats.map((c: { senderRole: string; message: string; createdAt: Date }) => ({
        senderRole: c.senderRole,
        message: c.message,
        originalCreatedAt: c.createdAt,
      })),
    });
  }

  // archive every RFQ of this user
  const rfqs = await RFQ.find({ USER_ID: userId });
  for (const rfq of rfqs) {
    const { _id: _rfqId, ...rfqObj } = rfq.toObject();
    await ArchivedRFQ.create({ ...rfqObj, archivedAt: new Date(), originalQuotationId: latestQuotationId });
  }

  // delete PDF files + records referenced by the quotations
  for (const q of quotations) {
    if (q.pdfPath?.startsWith("http")) {
      try { await del(q.pdfPath); } catch {}
    }
    if (q.pdfId) await PDF.findByIdAndDelete(q.pdfId);
  }

  await Chat.deleteMany({ userId });
  await RFQ.deleteMany({ USER_ID: userId });
  await Quotation.deleteMany({ userId });
  await WalkinCredential.deleteOne({ userId });
  await User.findByIdAndDelete(id);

  return NextResponse.json({
    success: true,
    archivedChats: chats.length,
    archivedRfqs: rfqs.length,
  });
}
