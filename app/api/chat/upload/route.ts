import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireSession } from "@/lib/apiAuth";
import crypto from "crypto";

const MAX_SIZE = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const sessionOrRes = await requireSession();
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;

  const data = await req.formData();
  const file = data.get("file") as File | null;

  if (!file) return NextResponse.json({ message: "No file" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ message: "ไฟล์ต้องมีขนาดไม่เกิน 10MB" }, { status: 400 });

  const isImage = file.type.startsWith("image/");
  const isPdf = file.type === "application/pdf";
  if (!isImage && !isPdf) {
    return NextResponse.json({ message: "รองรับเฉพาะรูปภาพและ PDF" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const blob = await put(`chat/${crypto.randomUUID()}.${ext}`, file, { access: "private" });

  return NextResponse.json({
    fileUrl: blob.url,
    fileType: isImage ? "image" : "pdf",
    fileName: file.name,
  });
}
