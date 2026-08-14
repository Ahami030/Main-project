import mongoose from "mongoose";
import { clearDevModel } from "@/lib/mongoHelpers";

// Folders for organising RFQs (เอกชน / โรงเรียน / อ.1 …). Nesting is a plain
// parentId self-reference — null means the folder sits at the root. RFQs with no
// folderId stay at the root too, so everything created before this feature still shows.
const RfqFolderSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true },
    parentId: { type: String, default: null },
  },
  { timestamps: true, collection: "rfq_folders" }
);

clearDevModel("RfqFolder");

export default mongoose.models.RfqFolder ||
  mongoose.model("RfqFolder", RfqFolderSchema);
