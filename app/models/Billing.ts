import mongoose from "mongoose";
import { TaxInvoiceSchema } from "@/lib/schemas";
import { clearDevModel, generateDocumentNumber } from "@/lib/mongoHelpers";

export type BillingStatus = "draft" | "finalized";

const BillingSchema = new mongoose.Schema(
  {
    billingNumber: { type: String, unique: true },
    customerId:    { type: String, required: true },
    customerName:  { type: String, required: true },
    customerEmail: { type: String, required: true },
    poIds:         [{ type: mongoose.Schema.Types.ObjectId, ref: "PurchaseOrder" }],
    poNumbers:     [{ type: String }],
    taxInvoices:   { type: [TaxInvoiceSchema], default: [] },
    status:        { type: String, enum: ["draft", "finalized"], default: "draft" },
    billingDate:   { type: Date, default: null },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "partial", "paid"],
      default: "unpaid",
    },
    expiresAt:         { type: Date, default: null },
    fullResetOnExpiry: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export async function generateBillingNumber(): Promise<string> {
  return generateDocumentNumber("Billing", "billingNumber", "BILL");
}

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

export async function archiveBilling(
  billing: BillingDoc,
  reason: "manual_reset" | "expired" | "full_reset",
  opts: { deletePOFiles?: boolean; deletePORecords?: boolean } = {}
): Promise<void> {
  const ArchivedBilling = (await import("@/app/models/ArchivedBilling")).default;
  const PurchaseOrder   = (await import("@/app/models/PurchaseOrder")).default;

  await ArchivedBilling.create({
    originalBillingId: billing._id.toString(),
    billingNumber:     billing.billingNumber,
    customerId:        billing.customerId,
    customerName:      billing.customerName,
    customerEmail:     billing.customerEmail,
    poIds:             (billing.poIds ?? []).map((id) => id?.toString()),
    poNumbers:         billing.poNumbers ?? [],
    taxInvoices:       billing.taxInvoices ?? [],
    billingStatus:     billing.status,
    billingDate:       billing.billingDate,
    expiresAt:         billing.expiresAt,
    originalCreatedAt: billing.createdAt,
    archivedAt:        new Date(),
    archiveReason:     reason,
  });

  const doFullReset = opts.deletePOFiles || opts.deletePORecords;

  if (doFullReset && billing.poIds && billing.poIds.length > 0) {
    const pos = await PurchaseOrder.find(
      { _id: { $in: billing.poIds } },
      { filePath: 1 }
    ).lean() as Array<{ filePath?: string }>;

    if (opts.deletePOFiles) {
      const { unlink } = await import("fs/promises");
      const nodePath   = await import("path");
      for (const po of pos) {
        if (po.filePath) {
          const abs = nodePath.default.join(
            process.cwd(),
            po.filePath.replace(/^\//, "")
          );
          try { await unlink(abs); } catch {}
        }
      }
    }

    if (opts.deletePORecords) {
      await PurchaseOrder.deleteMany({ _id: { $in: billing.poIds } });
    }
  } else if (!doFullReset) {
    if (billing.poIds && billing.poIds.length > 0) {
      await PurchaseOrder.updateMany(
        { _id: { $in: billing.poIds } },
        { $set: { status: "accepted", billingId: null, billedAt: null } }
      );
    }
  }
}

clearDevModel("Billing");

export default mongoose.models.Billing ||
  mongoose.model("Billing", BillingSchema);
