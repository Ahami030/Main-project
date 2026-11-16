import { NextRequest, NextResponse } from "next/server";
import { requireEmployee } from "@/lib/apiAuth";
import { connectMongoDB } from "@/lib/mongo";
import RFQ from "@/app/models/RFQ";
import RfqFolder from "@/app/models/RfqFolder";

// Bulk-move RFQs between folders. Deliberately separate from PUT /api/rfq/[id]:
// that route replaces the document, bumps `version` and flips the quotation to
// "bargaining" — filing paperwork must not do any of that.
export async function PATCH(req: NextRequest) {
  const sessionOrRes = await requireEmployee("quotation");
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;

  const { ids, folderId } = await req.json() as { ids?: string[]; folderId?: string | null };
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ message: "ไม่ได้เลือกรายการ" }, { status: 400 });
  }

  await connectMongoDB();

  // null = move back to the root
  if (folderId) {
    const exists = await RfqFolder.exists({ _id: folderId });
    if (!exists) return NextResponse.json({ message: "ไม่พบโฟลเดอร์ปลายทาง" }, { status: 404 });
  }

  const res = await RFQ.updateMany(
    { _id: { $in: ids } },
    { $set: { folderId: folderId || null } }
  );
  return NextResponse.json({ moved: res.modifiedCount });
}
