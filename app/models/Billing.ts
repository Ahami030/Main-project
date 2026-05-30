import mongoose from "mongoose";

export type BillingStatus = "draft" | "finalized";

const TaxInvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true },
    invoiceDate:   { type: String, required: true },
    amount:        { type: Number, required: true },
  },
  { _id: true }
);

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
  },
  { timestamps: true }
);

export async function generateBillingNumber(): Promise<string> {
  const Billing = mongoose.models.Billing ||
    mongoose.model("Billing", BillingSchema);
  const year = new Date().getFullYear();
  const prefix = `BILL-${year}-`;
  const last = await Billing.findOne(
    { billingNumber: { $regex: `^${prefix}` } },
    { billingNumber: 1 }
  ).sort({ billingNumber: -1 }).lean() as { billingNumber?: string } | null;

  const lastNum = last?.billingNumber
    ? parseInt(last.billingNumber.replace(prefix, ""), 10)
    : 0;
  const next = String(lastNum + 1).padStart(3, "0");
  return `${prefix}${next}`;
}

// Clear cache in dev so schema changes are picked up on hot-reload
if (process.env.NODE_ENV === "development" && mongoose.models.Billing) {
  delete mongoose.models.Billing;
}

export default mongoose.models.Billing ||
  mongoose.model("Billing", BillingSchema);
