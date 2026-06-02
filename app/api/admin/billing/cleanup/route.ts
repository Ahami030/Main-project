import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { AuthOptions } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@/lib/mongo";
import Billing, { archiveBilling } from "@/app/models/Billing";

// Shared cleanup logic used by both the manual trigger and auto-trigger
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

// POST /api/admin/billing/cleanup  — manual trigger (admin only)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions as AuthOptions);
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const isAdmin = (session.user as { role?: string }).role === "admin";
  if (!isAdmin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const result = await runCleanup();
  return NextResponse.json({ success: true, ...result });
}

// GET /api/admin/billing/cleanup  — used as internal auto-trigger (no auth check intentional,
// called server-side from GET /api/billing in fire-and-forget mode)
export async function GET(_req: NextRequest) {
  try {
    const result = await runCleanup();
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ cleaned: 0, billingNumbers: [] });
  }
}
