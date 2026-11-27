// app/api/chat/[userId]/route.ts
import { NextResponse } from "next/server";
import Chat from "@/models/Chat";
import { connectMongoDB } from "@/lib/mongo";
import { requireSession, getUser } from "@/lib/apiAuth";

export async function GET(
  req: Request,
  context: { params: Promise<{ userId: string }> }
) {
  // was unauthenticated — anyone could read any user's chat by guessing the id
  const sessionOrRes = await requireSession();
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;
  const me = getUser(sessionOrRes);

  const { userId } = await context.params; // ✅ ต้อง await
  if (me.role !== "admin" && me.role !== "employee" && me.id !== userId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await connectMongoDB();

  const chats = await Chat.find({ userId })
    .sort({ createdAt: 1 });

  return NextResponse.json(chats);
}
