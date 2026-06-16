import { NextResponse } from "next/server";
import { requireSession, getUser } from "@/lib/apiAuth";
import { connectMongoDB } from "@/lib/mongo";
import Quotation from "@/app/models/Quotation";

export async function POST(req: Request) {
  const sessionOrRes = await requireSession();
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;
  const session = sessionOrRes;

  const { filename, pdfId, pdfPath } = await req.json();
  if (!filename) {
    return NextResponse.json({ message: "filename required" }, { status: 400 });
  }

  await connectMongoDB();

  const userId = getUser(session).id ?? "unknown";
  const quotation = await Quotation.create({ userId, filename, pdfId, pdfPath, status: "sent" });

  return NextResponse.json({ quotation }, { status: 201 });
}

export async function GET() {
  const sessionOrRes = await requireSession();
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;
  const session = sessionOrRes;

  await connectMongoDB();

  const userId = getUser(session).id ?? "unknown";
  const quotations = await Quotation.find({ userId }).sort({ createdAt: -1 });

  return NextResponse.json({ quotations });
}
