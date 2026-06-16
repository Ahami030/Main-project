import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { connectMongoDB } from "@/lib/mongo";
import Billing, { archiveBilling } from "@/app/models/Billing";

export async function POST(req: NextRequest) {
  const sessionOrRes = await requireAdmin();
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;

  const { billingId } = await req.json() as { billingId: string };
  if (!billingId) {
    return NextResponse.json({ message: "billingId required" }, { status: 400 });
  }

  await connectMongoDB();

  const billing = await Billing.findById(billingId).lean() as {
    _id: { toString(): string };
    billingNumber: string;
    customerId?: string;
    customerName?: string;
    customerEmail?: string;
    poIds?: unknown[];
    poNumbers?: string[];
    taxInvoices?: unknown[];
    status?: string;
    billingDate?: Date | null;
    expiresAt?: Date | null;
    createdAt?: Date;
  } | null;

  if (!billing) {
    return NextResponse.json({ message: "ไม่พบใบวางบิล" }, { status: 404 });
  }

  await archiveBilling(billing, "manual_reset");
  await Billing.findByIdAndDelete(billingId);

  return NextResponse.json({
    success: true,
    billingNumber: billing.billingNumber,
    poCount: (billing.poIds ?? []).length,
  });
}
