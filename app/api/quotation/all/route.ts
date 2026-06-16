import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { connectMongoDB } from "@/lib/mongo";
import Quotation from "@/app/models/Quotation";

export async function GET() {
  const sessionOrRes = await requireAdmin();
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;

  await connectMongoDB();
  const quotations = await Quotation.find().sort({ createdAt: -1 });
  return NextResponse.json({ quotations });
}
