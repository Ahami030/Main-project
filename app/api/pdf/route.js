import { NextResponse } from "next/server";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@/lib/mongo";
import PDF from "@/app/models/PDF";

export async function POST(req) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }

  const data = await req.formData();
  const file = data.get("file");

  if (!file) {
    return NextResponse.json({ message: "No file" }, { status: 400 });
  }

  // ✅ รับเฉพาะ PDF
  if (file.type !== "application/pdf") {
    return NextResponse.json(
      { message: "Only PDF allowed" },
      { status: 400 }
    );
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const filename = `${Date.now()}-${file.name}`;
  const filePath = path.join(process.cwd(), "PDF", filename);

  await writeFile(filePath, buffer);

  await connectMongoDB();

  const pdf = await PDF.create({
    userId: session.user.id,
    filename,
    path: `/PDF/${filename}`,
  });

  return NextResponse.json({
    message: "Upload success",
    pdfId: pdf._id.toString(),
    pdfPath: `/PDF/${filename}`,
  });
}

export async function DELETE(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const pdfId = searchParams.get("pdfId");
  if (!pdfId) {
    return NextResponse.json({ message: "pdfId required" }, { status: 400 });
  }

  await connectMongoDB();
  const record = await PDF.findByIdAndDelete(pdfId);

  if (record?.path) {
    const filePath = path.join(process.cwd(), record.path.replace(/^\//, ""));
    try { await unlink(filePath); } catch {}
  }

  return NextResponse.json({ message: "Deleted" });
}
