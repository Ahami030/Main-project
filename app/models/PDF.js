import mongoose from "mongoose";

const PDFSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  filename: String,
  path: String,
  uploadDate: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.PDF ||
  mongoose.model("PDF", PDFSchema);
