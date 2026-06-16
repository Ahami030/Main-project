import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { connectMongoDB } from "@/lib/mongo";
import ArchivedRFQ from "@/app/models/ArchivedRFQ";

export async function GET() {
  const sessionOrRes = await requireAdmin();
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;

  await connectMongoDB();
  const rfqs = await ArchivedRFQ.find().sort({ archivedAt: -1 }).lean();
  return NextResponse.json(rfqs);
}
