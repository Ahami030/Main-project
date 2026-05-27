import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@/lib/mongo";
import { unlink } from "fs/promises";
import path from "path";
import Quotation from "@/app/models/Quotation";
import Chat from "@/models/Chat";
import RFQ from "@/app/models/RFQ";
import PDF from "@/app/models/PDF";
import ArchivedChat from "@/app/models/ArchivedChat";
import ArchivedRFQ from "@/app/models/ArchivedRFQ";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions as any);
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const role = (session as any)?.user?.role ?? (session as any)?.role;
  if (role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

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

  // ── Fetch data to archive ──────────────────────────────────────────
  const chats = await Chat.find({ userId });
  const rfq = await RFQ.findOne({ USER_ID: userId });

  // ── Archive chats ──────────────────────────────────────────────────
  let archivedChats = 0;
  if (chats.length > 0) {
    await ArchivedChat.insertMany(
      chats.map((c: any) => ({
        userId: c.userId,
        senderRole: c.senderRole,
        message: c.message,
        originalCreatedAt: c.createdAt,
        archivedAt: new Date(),
        originalQuotationId: quotationId,
      }))
    );
    archivedChats = chats.length;
  }

  // ── Archive RFQ ────────────────────────────────────────────────────
  let archivedRfq = false;
  if (rfq) {
    const rfqObj = rfq.toObject();
    delete rfqObj._id;
    await ArchivedRFQ.create({
      ...rfqObj,
      archivedAt: new Date(),
      originalQuotationId: quotationId,
    });
    archivedRfq = true;
  }

  // ── Delete PDF file from filesystem ───────────────────────────────
  if (quotation.pdfPath) {
    const filePath = path.join(process.cwd(), quotation.pdfPath.replace(/^\//, ""));
    try { await unlink(filePath); } catch {}
  }

  // ── Delete PDF record ──────────────────────────────────────────────
  if (quotation.pdfId) {
    await PDF.findByIdAndDelete(quotation.pdfId);
  }

  // ── Delete live data ───────────────────────────────────────────────
  await Chat.deleteMany({ userId });
  if (rfq) await RFQ.deleteOne({ USER_ID: userId });
  await Quotation.findByIdAndDelete(quotation._id);

  return NextResponse.json({
    success: true,
    archivedChats,
    archivedRfq,
  });
}
