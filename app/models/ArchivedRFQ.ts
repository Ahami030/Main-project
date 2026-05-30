import mongoose from "mongoose";

const ArchivedRFQSchema = new mongoose.Schema(
  {
    USER_ID: { type: String },
    document_type: { type: String },
    rfq_number: { type: String },
    rfq_date: { type: String },
    due_date: { type: String },
    buyer_company_name: { type: String },
    vendor_company_name: { type: String },
    line_items: { type: Array, default: [] },
    terms_and_conditions: { type: Object },
    version: { type: Number },
    archivedAt: { type: Date, default: Date.now },
    originalQuotationId: { type: String },
  },
  { collection: "archived_rfqs" }
);

export default mongoose.models.ArchivedRFQ ||
  mongoose.model("ArchivedRFQ", ArchivedRFQSchema);
