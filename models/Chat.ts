// models/Chat.ts
import mongoose from "mongoose";

const ChatSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  senderRole: {
    type: String,
    enum: ["user", "admin"],
    required: true
  },
  message: {
    type: String,
    default: ""
  },
  fileUrl:   { type: String, default: "" },
  fileType:  { type: String, default: "" },
  fileName:  { type: String, default: "" },
  isEdited:  { type: Boolean, default: false },
  editedAt:  { type: Date,    default: null },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

// Speeds up find({ userId }).sort({ createdAt: 1 }) — avoids collection scan on M0
ChatSchema.index({ userId: 1, createdAt: 1 });

export default mongoose.models.Chat || mongoose.model("Chat", ChatSchema);
