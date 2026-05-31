import mongoose from "mongoose";

const TaxInvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String },
    invoiceDate:   { type: String },
    amount:        { type: Number },
  },
  { _id: true }
);

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
    billingStatus:     { type: String },        // status at time of archive
    billingDate:       { type: Date },
    expiresAt:         { type: Date },          // what expiry was set to
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

// Clear cache in development
if (process.env.NODE_ENV === "development" && mongoose.models.ArchivedBilling) {
  delete mongoose.models.ArchivedBilling;
}

export default mongoose.models.ArchivedBilling ||
  mongoose.model("ArchivedBilling", ArchivedBillingSchema);
