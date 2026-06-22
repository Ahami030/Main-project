import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { connectMongoDB } from "@/lib/mongo";
import { del } from "@vercel/blob";
import Quotation from "@/app/models/Quotation";
import Chat from "@/models/Chat";
import RFQ from "@/app/models/RFQ";
import PDF from "@/app/models/PDF";
import ArchivedChat from "@/app/models/ArchivedChat";
import ArchivedRFQ from "@/app/models/ArchivedRFQ";

export async function POST(req: Request) {
  const sessionOrRes = await requireAdmin();
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;

  const { userId } = await req.json();
  if (!userId) {
    return NextResponse.json({ message: "userId required" }, { status: 400 });
  }

  await connectMongoDB();

  const quotation = await Quotation.findOne({
    userId,
    status: { $in: ["bargaining", "confirmed"] },
  });

  if (!quotation) {
    return NextResponse.json({ message: "No active session found for this user" }, { status: 404 });
  }

  const quotationId = quotation._id.toString();

  const chats = await Chat.find({ userId });
  const rfq = await RFQ.findOne({ USER_ID: userId });

  let archivedChats = 0;
  if (chats.length > 0) {
    await ArchivedChat.create({
      userId,
      originalQuotationId: quotationId,
      archivedAt: new Date(),
      messages: chats.map((c: any) => ({
        senderRole: c.senderRole,
        message: c.message,
        originalCreatedAt: c.createdAt,
      })),
    });
    archivedChats = chats.length;
  }

  let archivedRfq = false;
  if (rfq) {
    const { _id: _rfqId, ...rfqObj } = rfq.toObject();
    await ArchivedRFQ.create({
      ...rfqObj,
      archivedAt: new Date(),
      originalQuotationId: quotationId,
    });
    archivedRfq = true;
  }

  if (quotation.pdfPath?.startsWith("http")) {
    try { await del(quotation.pdfPath); } catch {}
  }

  if (quotation.pdfId) {
    await PDF.findByIdAndDelete(quotation.pdfId);
  }

  await Chat.deleteMany({ userId });
  if (rfq) await RFQ.deleteOne({ USER_ID: userId });
  await Quotation.findByIdAndDelete(quotation._id);

  return NextResponse.json({ success: true, archivedChats, archivedRfq });
}
