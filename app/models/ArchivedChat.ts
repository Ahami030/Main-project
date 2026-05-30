import mongoose from "mongoose";

const MessageEntrySchema = new mongoose.Schema(
  {
    senderRole: { type: String, enum: ["user", "admin"] },
    message: { type: String },
    originalCreatedAt: { type: Date },
  },
  { _id: false }
);

const ArchivedChatSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.Mixed, required: true },
    originalQuotationId: { type: String },
    archivedAt: { type: Date, default: Date.now },
    messages: { type: [MessageEntrySchema], default: [] },
  },
  { collection: "archived_chats" }
);

if (process.env.NODE_ENV !== "production") {
  delete (mongoose.models as any).ArchivedChat;
}

export default mongoose.models.ArchivedChat ||
  mongoose.model("ArchivedChat", ArchivedChatSchema);
