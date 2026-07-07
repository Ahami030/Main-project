import { NextResponse } from "next/server";
import { requireSession, requireEmployee, getUser } from "@/lib/apiAuth";
import { connectMongoDB } from "@/lib/mongo";
import { del } from "@vercel/blob";
import Quotation from "@/app/models/Quotation";
import Chat from "@/models/Chat";
import RFQ from "@/app/models/RFQ";
import PDF from "@/app/models/PDF";

// Hard delete: wipes the user's whole session (PDF file, chats, RFQs, quotation)
// like /api/admin/reset but with NO archiving — gone for good.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionOrRes = await requireEmployee("quotation");
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;

  await connectMongoDB();

  const { id } = await params;
  const quotation = await Quotation.findById(id);
  if (!quotation) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const userId = quotation.userId;

  if (quotation.pdfPath?.startsWith("http")) {
    try { await del(quotation.pdfPath); } catch {}
  }
  if (quotation.pdfId) {
    await PDF.findByIdAndDelete(quotation.pdfId);
  }
  const chats = await Chat.deleteMany({ userId });
  const rfqs = await RFQ.deleteMany({ USER_ID: userId });
  await Quotation.findByIdAndDelete(id);

  return NextResponse.json({
    message: "Deleted",
    deletedChats: chats.deletedCount,
    deletedRfqs: rfqs.deletedCount,
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionOrRes = await requireSession();
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;
  const session = sessionOrRes;

  const user = getUser(session);
  const canManage = user.role === "admin" ||
    (user.role === "employee" && (user.permissions ?? []).includes("quotation"));
  const sessionUserId = user.id ?? "";

  const { status } = await req.json();
  const allowed = ["sent", "reviewing", "completed", "bargaining", "confirmed"];
  if (!allowed.includes(status)) {
    return NextResponse.json({ message: "Invalid status" }, { status: 400 });
  }

  await connectMongoDB();

  const { id } = await params;
  const quotation = await Quotation.findById(id);
  if (!quotation) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const isClientConfirm =
    quotation.userId === sessionUserId &&
    status === "confirmed" &&
    quotation.status === "bargaining";

  if (!canManage && !isClientConfirm) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  quotation.status = status;
  await quotation.save();

  return NextResponse.json({ quotation });
}
