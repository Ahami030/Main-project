// app/api/chat/[userId]/route.ts
import { NextResponse } from "next/server";
import Chat from "@/models/Chat";
import { connectMongoDB } from "@/lib/mongo";

export async function GET(
  req: Request,
  context: { params: Promise<{ userId: string }> }
) {
  await connectMongoDB();

  const { userId } = await context.params; // ✅ ต้อง await

  const chats = await Chat.find({ userId })
    .sort({ createdAt: 1 });

  return NextResponse.json(chats);
}