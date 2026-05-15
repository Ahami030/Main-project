import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@/lib/mongo";
import Quotation from "@/app/models/Quotation";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions as any);
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const role = (session as any)?.user?.role ?? (session as any)?.role;
  if (role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

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
  const session = await getServerSession(authOptions as any);
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const role = (session as any)?.user?.role ?? (session as any)?.role;
  if (role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { status } = await req.json();
  const allowed = ["sent", "reviewing", "completed"];
  if (!allowed.includes(status)) {
    return NextResponse.json({ message: "Invalid status" }, { status: 400 });
  }

  await connectMongoDB();

  const { id } = await params;
  const updated = await Quotation.findByIdAndUpdate(
    id,
    { status },
    { new: true }
  );

  if (!updated) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ quotation: updated });
}
