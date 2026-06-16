import mongoose from "mongoose";
import { TaxInvoiceSchema } from "@/lib/schemas";
import { clearDevModel } from "@/lib/mongoHelpers";

const ArchivedBillingSchema = new mongoose.Schema(
  {
    originalBillingId: { type: String, required: true },
    billingNumber:     { type: String, required: true },
    customerId:        { type: String },
    customerName:      { type: String },
    customerEmail:     { type: String },
    poIds:             [{ type: String }],
    poNumbers:         [{ type: String }],
    taxInvoices:       { type: [TaxInvoiceSchema], default: [] },
    billingStatus:     { type: String },
    billingDate:       { type: Date },
    expiresAt:         { type: Date },
    originalCreatedAt: { type: Date },
    archivedAt:        { type: Date, default: Date.now },
    archiveReason:     {
      type: String,
      enum: ["manual_reset", "expired", "full_reset"],
      default: "manual_reset",
    },
  },
  { timestamps: false }
);

clearDevModel("ArchivedBilling");

export default mongoose.models.ArchivedBilling ||
  mongoose.model("ArchivedBilling", ArchivedBillingSchema);
