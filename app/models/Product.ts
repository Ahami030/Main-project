import mongoose, { Schema, models } from "mongoose";

const ProductSchema = new Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    description: { type: String },
    category: { type: String, default: "" },
    inStock: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Product =
  models.Product || mongoose.model("Product", ProductSchema);
