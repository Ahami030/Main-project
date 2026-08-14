import { NextRequest, NextResponse } from "next/server";
import { requireEmployee } from "@/lib/apiAuth";
import { connectMongoDB } from "@/lib/mongo";
import RfqFolder from "@/app/models/RfqFolder";

// Whole tree in one call — a folder list is tiny and the UI needs ancestors for
// breadcrumbs anyway, so per-level fetching would just add round trips.
export async function GET() {
  const sessionOrRes = await requireEmployee("quotation");
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;

  await connectMongoDB();
  const folders = await RfqFolder.find({}).sort({ name: 1 }).lean();
  return NextResponse.json(folders);
}

export async function POST(req: NextRequest) {
  const sessionOrRes = await requireEmployee("quotation");
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;

  const { name, parentId } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ message: "กรุณาตั้งชื่อโฟลเดอร์" }, { status: 400 });
  }

  await connectMongoDB();
  const folder = await RfqFolder.create({
    name: name.trim(),
    parentId: parentId || null,
  });
  return NextResponse.json(folder, { status: 201 });
}
