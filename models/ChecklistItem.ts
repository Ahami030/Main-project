import mongoose from "mongoose";
import { connectMongoDB } from "@/lib/mongo";

const ChecklistItemSchema = new mongoose.Schema({
  itemId:  { type: String, required: true, unique: true },
  checked: { type: Boolean, default: false },
  note:    { type: String, default: "" },
});

const ChecklistItem =
  mongoose.models.ChecklistItem ||
  mongoose.model("ChecklistItem", ChecklistItemSchema);

export default ChecklistItem;
export { connectMongoDB };
