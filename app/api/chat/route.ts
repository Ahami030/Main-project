// app/api/chat/route.ts
import { NextResponse } from "next/server";
import Chat from "@/models/Chat";
import { connectMongoDB } from "@/lib/mongo";
import { requireSession, getUser } from "@/lib/apiAuth";

export async function POST(req: Request) {
  const sessionOrRes = await requireSession();
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;
  const user = getUser(sessionOrRes);

  const { userId, message, fileUrl, fileType, fileName } = await req.json();

  // an empty bubble (no text, no file) must never be stored
  if (!message?.trim() && !fileUrl) {
    return NextResponse.json({ message: "message or fileUrl required" }, { status: 400 });
  }

  // sender identity comes from the session, not the request body
  const isStaff = user.role === "admin" || user.role === "employee";
  const targetUserId = isStaff ? userId : user.id;
  if (!targetUserId) {
    return NextResponse.json({ message: "userId required" }, { status: 400 });
  }

  await connectMongoDB();
  const chat = await Chat.create({
    userId: targetUserId,
    senderRole: isStaff ? "admin" : "user",
    message: message ?? "",
    fileUrl:  fileUrl  ?? "",
    fileType: fileType ?? "",
    fileName: fileName ?? "",
  });

  return NextResponse.json(chat);
}
