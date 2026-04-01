// app/api/chat/route.ts
import { NextResponse } from "next/server";
import Chat from "@/models/Chat";
import { connectMongoDB } from "@/lib/mongo";

export async function POST(req: Request) {
  await connectMongoDB();
  const body = await req.json();

  const chat = await Chat.create({
    userId: body.userId,
    senderRole: body.senderRole,
    message: body.message
  });

  return NextResponse.json(chat);
}