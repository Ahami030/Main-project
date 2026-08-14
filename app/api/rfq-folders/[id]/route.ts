import { NextRequest, NextResponse } from "next/server";
import { requireEmployee } from "@/lib/apiAuth";
import { connectMongoDB } from "@/lib/mongo";
import RfqFolder from "@/app/models/RfqFolder";
import RFQ from "@/app/models/RFQ";

type Params = { params: Promise<{ id: string }> };

// Rename
export async function PATCH(req: NextRequest, { params }: Params) {
  const sessionOrRes = await requireEmployee("quotation");
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;

  const { id } = await params;
  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ message: "กรุณาตั้งชื่อโฟลเดอร์" }, { status: 400 });
  }

  await connectMongoDB();
  const folder = await RfqFolder.findByIdAndUpdate(id, { name: name.trim() }, { new: true });
  if (!folder) return NextResponse.json({ message: "ไม่พบโฟลเดอร์" }, { status: 404 });
  return NextResponse.json(folder);
}

// Delete — refuses while anything is still inside, so no RFQ can be orphaned by accident
export async function DELETE(_req: NextRequest, { params }: Params) {
  const sessionOrRes = await requireEmployee("quotation");
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;

  const { id } = await params;
  await connectMongoDB();

  const [childFolders, rfqCount] = await Promise.all([
    RfqFolder.countDocuments({ parentId: id }),
    RFQ.countDocuments({ folderId: id }),
  ]);
  if (childFolders + rfqCount > 0) {
    return NextResponse.json(
      { message: `ลบไม่ได้ — ในโฟลเดอร์ยังมี ${rfqCount} รายการ และ ${childFolders} โฟลเดอร์ย่อย` },
      { status: 400 }
    );
  }

  const deleted = await RfqFolder.findByIdAndDelete(id);
  if (!deleted) return NextResponse.json({ message: "ไม่พบโฟลเดอร์" }, { status: 404 });
  return NextResponse.json({ success: true });
}
