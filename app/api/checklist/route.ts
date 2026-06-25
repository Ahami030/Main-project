import { NextResponse } from "next/server";
import ChecklistItem, { connectMongoDB } from "@/models/ChecklistItem";

export async function GET() {
  await connectMongoDB();
  const items = await ChecklistItem.find({}).lean();
  return NextResponse.json(items);
}

export async function PATCH(req: Request) {
  await connectMongoDB();
  const { itemId, checked, note } = await req.json();
  const update: Record<string, unknown> = {};
  if (checked !== undefined) update.checked = checked;
  if (note    !== undefined) update.note    = note;
  await ChecklistItem.findOneAndUpdate({ itemId }, update, { upsert: true });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await connectMongoDB();
  await ChecklistItem.deleteMany({});
  return NextResponse.json({ ok: true });
}
