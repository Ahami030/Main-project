import mongoose from "mongoose";
import { clearDevModel, generateDocumentNumber } from "@/lib/mongoHelpers";

export type PaymentProofStatus = "pending" | "approved" | "rejected";
export type PaymentMethod = "bank_transfer" | "cash" | "cheque";

const HistoryEntrySchema = new mongoose.Schema(
  {
    action:    { type: String, required: true },
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
    billingNumber:     { type: String, required: true },
    poId:              { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseOrder", default: null },
    customerId:        { type: String, required: true },
    customerName:      { type: String, required: true },
    customerEmail:     { type: String, required: true },
    poIds:             [{ type: mongoose.Schema.Types.ObjectId, ref: "PurchaseOrder" }],
    poNumbers:         [{ type: String }],
    amount:            { type: Number, required: true },
    paymentDate:       { type: String, required: true },
    paymentMethod:     {
      type: String,
      enum: ["bank_transfer", "cash", "cheque"],
      default: "bank_transfer",
    },
    bankName:          { type: String, default: "" },
    accountName:       { type: String, default: "" },
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
  return generateDocumentNumber("PaymentProof", "proofNumber", "PAY");
}

clearDevModel("PaymentProof");

export default mongoose.models.PaymentProof ||
  mongoose.model("PaymentProof", PaymentProofSchema);
