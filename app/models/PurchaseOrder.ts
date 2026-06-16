import mongoose from "mongoose";
import { TaxInvoiceSchema } from "@/lib/schemas";
import { clearDevModel, generateDocumentNumber } from "@/lib/mongoHelpers";

export type POStatus = "pending" | "accepted" | "billed";

const PurchaseOrderSchema = new mongoose.Schema(
  {
    poNumber:     { type: String, unique: true },
    userId:       { type: String, required: true },
    userName:     { type: String, required: true },
    userEmail:    { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "billed"],
      default: "pending",
    },
    filePath:     { type: String, required: true },
    fileOrigName: { type: String, required: true },
    fileMimeType: { type: String, default: "" },
    taxInvoices:  { type: [TaxInvoiceSchema], default: [] },
    billedAt:     { type: Date, default: null },
    billingId:    { type: mongoose.Schema.Types.ObjectId, ref: "Billing", default: null },
  },
  { timestamps: true }
);

export async function generatePONumber(): Promise<string> {
  return generateDocumentNumber("PurchaseOrder", "poNumber", "PO");
}

clearDevModel("PurchaseOrder");

export default mongoose.models.PurchaseOrder ||
  mongoose.model("PurchaseOrder", PurchaseOrderSchema);
