import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { connectMongoDB } from "@/lib/mongo";
import Billing, { archiveBilling } from "@/app/models/Billing";

export async function runCleanup(): Promise<{ cleaned: number; billingNumbers: string[] }> {
  await connectMongoDB();

  type BillingDoc = {
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
    fullResetOnExpiry?: boolean;
    createdAt?: Date;
  };

  const expired: BillingDoc[] = await Billing.find({
    expiresAt: { $ne: null, $lte: new Date() },
  }).lean();

  const billingNumbers: string[] = [];

  for (const billing of expired) {
    try {
      const isFullReset = Boolean(billing.fullResetOnExpiry);
      await archiveBilling(billing, "expired", {
        deletePOFiles:   isFullReset,
        deletePORecords: isFullReset,
      });
      await Billing.findByIdAndDelete(billing._id);
      billingNumbers.push(billing.billingNumber);
    } catch (err) {
      console.error(`Failed to cleanup billing ${billing.billingNumber}:`, err);
    }
  }

  return { cleaned: billingNumbers.length, billingNumbers };
}

export async function POST(_req: NextRequest) {
  const sessionOrRes = await requireAdmin();
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;

  const result = await runCleanup();
  return NextResponse.json({ success: true, ...result });
}

// GET — internal auto-trigger (no auth, called server-side fire-and-forget)
export async function GET() {
  try {
    const result = await runCleanup();
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ cleaned: 0, billingNumbers: [] });
  }
}
