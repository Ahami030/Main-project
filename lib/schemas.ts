import mongoose from "mongoose";

export const TaxInvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true },
    invoiceDate:   { type: String, required: true },
    amount:        { type: Number, required: true },
  },
  { _id: true }
);
