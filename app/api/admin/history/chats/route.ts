import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { connectMongoDB } from "@/lib/mongo";
import ArchivedChat from "@/app/models/ArchivedChat";

export async function GET() {
  const sessionOrRes = await requireAdmin();
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;

  await connectMongoDB();
  const chats = await ArchivedChat.find().sort({ archivedAt: -1 }).lean();
  return NextResponse.json(chats);
}
