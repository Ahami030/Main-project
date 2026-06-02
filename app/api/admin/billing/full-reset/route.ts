import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { AuthOptions } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@/lib/mongo";
import Billing, { archiveBilling } from "@/app/models/Billing";
import PurchaseOrder from "@/app/models/PurchaseOrder";

// POST /api/admin/billing/full-reset
// Body: { customerId: string }
//
// Full Reset for a customer:
//   1. Archive all their Billing documents → archived_billings (reason: full_reset)
//   2. Delete PO files from filesystem
//   3. Delete all PO records
//   4. Delete all Billing records
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions as AuthOptions);
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const isAdmin = (session.user as { role?: string }).role === "admin";
  if (!isAdmin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const { customerId } = await req.json() as { customerId: string };
  if (!customerId) {
    return NextResponse.json({ message: "customerId required" }, { status: 400 });
  }

  await connectMongoDB();

  // ── 1. Archive all Billing documents for this customer ──────────────
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

  // Track all poIds across all billings to avoid double-processing
  const allPoIds = new Set<string>();
  for (const b of billings) {
    for (const pid of (b.poIds ?? [])) {
      allPoIds.add(String(pid));
    }
    // Archive billing WITHOUT touching POs (we'll handle POs below)
    await archiveBilling(b, "full_reset", {
      deletePOFiles: false,
      deletePORecords: false,
    });
  }

  // ── 2. Delete PO files from filesystem ──────────────────────────────
  const { unlink } = await import("fs/promises");
  const nodePath = await import("path");

  const allPOs = await PurchaseOrder.find({ userId: customerId }, { filePath: 1 }).lean() as Array<{ filePath?: string; _id: unknown }>;

  let deletedFiles = 0;
  for (const po of allPOs) {
    if (po.filePath) {
      const abs = nodePath.default.join(process.cwd(), po.filePath.replace(/^\//, ""));
      try { await unlink(abs); deletedFiles++; } catch {}
    }
  }

  // ── 3. Delete all PO records ─────────────────────────────────────────
  const poResult = await PurchaseOrder.deleteMany({ userId: customerId });

  // ── 4. Delete all Billing records ────────────────────────────────────
  await Billing.deleteMany({ customerId });

  return NextResponse.json({
    success: true,
    archivedBillings: archivedBillingCount,
    deletedPOs:       poResult.deletedCount,
    deletedFiles,
  });
}
