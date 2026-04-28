import mongoose from "mongoose";

const LineItemSchema = new mongoose.Schema({
  item_number: Number,
  description: String,
  quantity: Number,
  unit: String,
  unit_price: Number,
});

const RFQSchema = new mongoose.Schema({
  USER_ID: String,
  document_type: String,
  rfq_number: String,
  rfq_date: String,
  due_date: String,
  buyer_company_name: String,
  vendor_company_name: String,
  line_items: {
    type: [LineItemSchema],
    default: []
  },
  terms_and_conditions: Object,
}, {
  collection: "Test_insert",
  timestamps: true
});

export default mongoose.models.RFQ || mongoose.model("RFQ", RFQSchema);