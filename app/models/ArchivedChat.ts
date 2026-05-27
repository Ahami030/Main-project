import mongoose from "mongoose";

const ArchivedChatSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.Mixed, required: true },
    senderRole: { type: String, enum: ["user", "admin"] },
    message: { type: String },
    originalCreatedAt: { type: Date },
    archivedAt: { type: Date, default: Date.now },
    originalQuotationId: { type: String },
  },
  { collection: "archived_chats" }
);

export default mongoose.models.ArchivedChat ||
  mongoose.model("ArchivedChat", ArchivedChatSchema);
