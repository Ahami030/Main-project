import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { connectMongoDB } from "@/lib/mongo";
import ArchivedBilling from "@/app/models/ArchivedBilling";

export async function GET() {
  const sessionOrRes = await requireAdmin();
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;

  await connectMongoDB();
  const billings = await ArchivedBilling.find().sort({ archivedAt: -1 }).lean();
  return NextResponse.json(billings);
}
