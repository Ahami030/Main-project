import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: "user", // ⭐ สำคัญ
    },
    organizationName: {
      type: String,
      default: "",
    },
    taxId: {
      type: String,
      default: "",
    },
    phone: {
      type: String,
      default: "",
    },
    lineId: {
      type: String,
      default: "",
    },
    billingAddress: {
      type: String,
      default: "",
    },
    shippingAddress: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
