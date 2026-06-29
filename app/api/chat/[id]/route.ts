import { NextRequest, NextResponse } from "next/server";
import { requireSession, getUser } from "@/lib/apiAuth";
import { connectMongoDB } from "@/lib/mongo";
import Chat from "@/models/Chat";

const TWO_MIN = 2 * 60 * 1000;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionOrRes = await requireSession();
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;
  const user = getUser(sessionOrRes);
  const { id } = await params;

  await connectMongoDB();
  const chat = await Chat.findById(id);
  if (!chat) return NextResponse.json({ message: "Not found" }, { status: 404 });
  if (chat.isDeleted)  return NextResponse.json({ message: "Cannot edit deleted message" }, { status: 400 });
  if (chat.fileUrl)    return NextResponse.json({ message: "Cannot edit file message" }, { status: 400 });

  const isOwner = chat.userId.toString() === user.id && chat.senderRole === user.role;
  if (!isOwner) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  if (Date.now() - new Date(chat.createdAt).getTime() > TWO_MIN)
    return NextResponse.json({ message: "Edit window expired" }, { status: 403 });

  const { message } = await req.json();
  if (!message?.trim()) return NextResponse.json({ message: "Message required" }, { status: 400 });

  chat.message  = message.trim();
  chat.isEdited = true;
  chat.editedAt = new Date();
  await chat.save();

  return NextResponse.json(chat);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionOrRes = await requireSession();
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;
  const user = getUser(sessionOrRes);
  const { id } = await params;

  await connectMongoDB();
  const chat = await Chat.findById(id);
  if (!chat) return NextResponse.json({ message: "Not found" }, { status: 404 });
  if (chat.isDeleted) return NextResponse.json({ message: "Already deleted" }, { status: 400 });

  const isOwner = chat.userId.toString() === user.id;
  const isAdmin = user.role === "admin" || user.role === "employee";
  if (!isOwner && !isAdmin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  // ลบไฟล์จาก Vercel Blob
  if (chat.fileUrl?.startsWith("http")) {
    try {
      const { del } = await import("@vercel/blob");
      await del(chat.fileUrl);
    } catch {}
  }

  chat.isDeleted = true;
  chat.message   = "";
  chat.fileUrl   = "";
  chat.fileType  = "";
  chat.fileName  = "";
  await chat.save();

  return NextResponse.json({ ok: true });
}
