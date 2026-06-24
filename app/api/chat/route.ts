// app/api/chat/route.ts
import { NextResponse } from "next/server";
import Chat from "@/models/Chat";
import { connectMongoDB } from "@/lib/mongo";

export async function POST(req: Request) {
  await connectMongoDB();
  const { userId, senderRole, message, fileUrl, fileType, fileName } = await req.json();

  const chat = await Chat.create({
    userId,
    senderRole,
    message: message ?? "",
    fileUrl:  fileUrl  ?? "",
    fileType: fileType ?? "",
    fileName: fileName ?? "",
  });

  return NextResponse.json(chat);
}
