import { NextResponse } from "next/server";
import { requireSession, requireAdmin, getUser } from "@/lib/apiAuth";
import { connectMongoDB } from "@/lib/mongo";
import Quotation from "@/app/models/Quotation";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionOrRes = await requireAdmin();
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;

  await connectMongoDB();

  const { id } = await params;
  const deleted = await Quotation.findByIdAndDelete(id);

  if (!deleted) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "Deleted" });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionOrRes = await requireSession();
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;
  const session = sessionOrRes;

  const user = getUser(session);
  const isAdmin = user.role === "admin";
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

  if (!isAdmin && !isClientConfirm) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  quotation.status = status;
  await quotation.save();

  return NextResponse.json({ quotation });
}
