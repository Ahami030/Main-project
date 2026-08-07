import mongoose from "mongoose";
import { clearDevModel } from "@/lib/mongoHelpers";

// Login credentials of walk-in customer accounts created by staff, kept so the
// front desk can look them up when the customer forgets. `password` is AES-encrypted
// via lib/walkinCrypto — never plaintext at rest.
const WalkinCredentialSchema = new mongoose.Schema(
  {
    userId:   { type: String, required: true, unique: true },
    password: { type: String, required: true }, // encrypted blob
  },
  { timestamps: true, collection: "walkin_credentials" }
);

clearDevModel("WalkinCredential");

export default mongoose.models.WalkinCredential ||
  mongoose.model("WalkinCredential", WalkinCredentialSchema);
