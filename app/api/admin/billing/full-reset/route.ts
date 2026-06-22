import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { connectMongoDB } from "@/lib/mongo";
import Billing, { archiveBilling } from "@/app/models/Billing";
import PurchaseOrder from "@/app/models/PurchaseOrder";

export async function POST(req: NextRequest) {
  const sessionOrRes = await requireAdmin();
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;

  const { customerId } = await req.json() as { customerId: string };
  if (!customerId) {
    return NextResponse.json({ message: "customerId required" }, { status: 400 });
  }

  await connectMongoDB();

  type BillingLean = {
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

  const billings = await Billing.find({ customerId }).lean() as BillingLean[];
  const archivedBillingCount = billings.length;

  for (const b of billings) {
    await archiveBilling(b, "full_reset", {
      deletePOFiles: false,
      deletePORecords: false,
    });
  }

  const { del } = await import("@vercel/blob");

  const allPOs = await PurchaseOrder.find({ userId: customerId }, { filePath: 1 }).lean() as Array<{ filePath?: string; _id: unknown }>;

  let deletedFiles = 0;
  for (const po of allPOs) {
    if (po.filePath?.startsWith("http")) {
      try { await del(po.filePath); deletedFiles++; } catch {}
    }
  }

  const poResult = await PurchaseOrder.deleteMany({ userId: customerId });
  await Billing.deleteMany({ customerId });

  return NextResponse.json({
    success: true,
    archivedBillings: archivedBillingCount,
    deletedPOs:       poResult.deletedCount,
    deletedFiles,
  });
}
