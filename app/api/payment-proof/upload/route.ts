import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { requireSession } from "@/lib/apiAuth";
import crypto from "crypto";

const MAX_SIZE = 20 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const sessionOrRes = await requireSession();
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;

  const data = await req.formData();
  const file = data.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ message: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ message: "ไฟล์ต้องมีขนาดไม่เกิน 20MB" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const filename = `${crypto.randomUUID()}.${ext}`;
  const dir = path.join(process.cwd(), "PaymentProof");
  const dest = path.join(dir, filename);

  await mkdir(dir, { recursive: true });
  await writeFile(dest, Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({
    filePath: `/PaymentProof/${filename}`,
    originalName: file.name,
    mimeType: file.type,
  });
}
