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

// Archives and removes ONE finished job (quotation + its RFQ). A customer can have several
// jobs, so the RFQ is matched by RFQ number; the shared chat thread is archived and cleared
// only when this was the customer's last job.
export async function POST(req: Request) {
  const sessionOrRes = await requireAdmin();
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;

  const { quotationId, userId } = await req.json();
  if (!quotationId && !userId) {
    return NextResponse.json({ message: "quotationId required" }, { status: 400 });
  }

  await connectMongoDB();

  const finished = { status: { $in: ["bargaining", "confirmed"] } };
  const quotation = quotationId
    ? await Quotation.findOne({ _id: quotationId, ...finished })
    : await Quotation.findOne({ userId, ...finished }); // old callers that only send userId

  if (!quotation) {
    return NextResponse.json({ message: "No active session found for this user" }, { status: 404 });
  }

  const ownerId: string = quotation.userId;
  const originalQuotationId = quotation._id.toString();

  // pre-rfqNumber quotations: the customer's RFQ, as before
  const rfq = quotation.rfqNumber
    ? await RFQ.findOne({ rfq_number: quotation.rfqNumber })
    : await RFQ.findOne({ USER_ID: ownerId });

  const otherJobs = await Quotation.countDocuments({ userId: ownerId, _id: { $ne: quotation._id } });

  let archivedChats = 0;
  if (otherJobs === 0) {
    const chats = await Chat.find({ userId: ownerId });
    if (chats.length > 0) {
      await ArchivedChat.create({
        userId: ownerId,
        originalQuotationId,
        archivedAt: new Date(),
        messages: chats.map((c: any) => ({
          senderRole: c.senderRole,
          message: c.message,
          originalCreatedAt: c.createdAt,
        })),
      });
      archivedChats = chats.length;
    }
    await Chat.deleteMany({ userId: ownerId });
  }

  let archivedRfq = false;
  if (rfq) {
    const { _id: _rfqId, ...rfqObj } = rfq.toObject();
    await ArchivedRFQ.create({ ...rfqObj, archivedAt: new Date(), originalQuotationId });
    await RFQ.deleteOne({ _id: rfq._id });
    archivedRfq = true;
  }

  if (quotation.pdfPath?.startsWith("http")) {
    try { await del(quotation.pdfPath); } catch {}
  }
  if (quotation.pdfId) {
    await PDF.findByIdAndDelete(quotation.pdfId);
  }
  await Quotation.findByIdAndDelete(quotation._id);

  return NextResponse.json({ success: true, archivedChats, archivedRfq });
}
