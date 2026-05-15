import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@/lib/mongo";
import Quotation from "@/app/models/Quotation";

export async function GET() {
  const session = await getServerSession(authOptions as any);
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any)?.role ?? (session as any)?.role;
  if (role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await connectMongoDB();

  const quotations = await Quotation.find().sort({ createdAt: -1 });
  return NextResponse.json({ quotations });
}
