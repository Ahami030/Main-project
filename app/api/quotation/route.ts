import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@/lib/mongo";
import Quotation from "@/app/models/Quotation";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions as any);
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { filename } = await req.json();
  if (!filename) {
    return NextResponse.json({ message: "filename required" }, { status: 400 });
  }

  await connectMongoDB();

  const userId = (session.user as any)?.id ?? (session as any)?.id ?? "unknown";
  const quotation = await Quotation.create({ userId, filename, status: "sent" });

  return NextResponse.json({ quotation }, { status: 201 });
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions as any);
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await connectMongoDB();

  const userId = (session.user as any)?.id ?? (session as any)?.id ?? "unknown";
  const quotations = await Quotation.find({ userId }).sort({ createdAt: -1 });

  return NextResponse.json({ quotations });
}
