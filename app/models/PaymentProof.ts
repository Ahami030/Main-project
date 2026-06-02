import mongoose from "mongoose";

export type PaymentProofStatus = "pending" | "approved" | "rejected";
export type PaymentMethod = "bank_transfer" | "cash" | "cheque";

const HistoryEntrySchema = new mongoose.Schema(
  {
    action:    { type: String, required: true }, // submitted | approved | rejected | resubmitted
    actor:     { type: String, required: true },
    actorName: { type: String, required: true },
    timestamp: { type: Date, required: true },
    note:      { type: String, default: "" },
    amount:    { type: Number, default: null },
  },
  { _id: false }
);

const PaymentProofSchema = new mongoose.Schema(
  {
    proofNumber:       { type: String, unique: true },
    billingId:         { type: mongoose.Schema.Types.ObjectId, ref: "Billing", default: null },
    billingNumber:     { type: String, required: true }, // billing number or PO number for legacy
    // For legacy single-PO billings (no Billing document)
    poId:              { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseOrder", default: null },
    customerId:        { type: String, required: true },
    customerName:      { type: String, required: true },
    customerEmail:     { type: String, required: true },
    poIds:             [{ type: mongoose.Schema.Types.ObjectId, ref: "PurchaseOrder" }],
    poNumbers:         [{ type: String }],

    amount:            { type: Number, required: true },
    paymentDate:       { type: String, required: true }, // YYYY-MM-DD
    paymentMethod:     {
      type: String,
      enum: ["bank_transfer", "cash", "cheque"],
      default: "bank_transfer",
    },
    bankName:          { type: String, default: "" },
    accountName:       { type: String, default: "" }, // sender's account name
    referenceNumber:   { type: String, default: "" },
    note:              { type: String, default: "" },

    filePath:          { type: String, required: true },
    fileOrigName:      { type: String, required: true },
    fileMimeType:      { type: String, default: "" },

    status:            {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    installmentNumber: { type: Number, default: 1 },

    reviewedBy:        { type: String, default: null },
    reviewedAt:        { type: Date, default: null },
    rejectionReason:   { type: String, default: "" },

    history:           { type: [HistoryEntrySchema], default: [] },
  },
  { timestamps: true }
);

export async function generateProofNumber(): Promise<string> {
  const PaymentProof = mongoose.models.PaymentProof ||
    mongoose.model("PaymentProof", PaymentProofSchema);
  const year = new Date().getFullYear();
  const prefix = `PAY-${year}-`;
  const last = await PaymentProof.findOne(
    { proofNumber: { $regex: `^${prefix}` } },
    { proofNumber: 1 }
  ).sort({ proofNumber: -1 }).lean() as { proofNumber?: string } | null;

  const lastNum = last?.proofNumber
    ? parseInt(last.proofNumber.replace(prefix, ""), 10)
    : 0;
  const next = String(lastNum + 1).padStart(3, "0");
  return `${prefix}${next}`;
}

if (process.env.NODE_ENV === "development" && mongoose.models.PaymentProof) {
  delete mongoose.models.PaymentProof;
}

export default mongoose.models.PaymentProof ||
  mongoose.model("PaymentProof", PaymentProofSchema);
