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
    required: true
  }
}, { timestamps: true });

export default mongoose.models.Chat || mongoose.model("Chat", ChatSchema);