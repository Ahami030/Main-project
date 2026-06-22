import { NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@/lib/mongo";
import PDF from "@/app/models/PDF";

export async function POST(req) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const data = await req.formData();
  const file = data.get("file");

  if (!file) {
    return NextResponse.json({ message: "No file" }, { status: 400 });
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json({ message: "Only PDF allowed" }, { status: 400 });
  }

  const filename = `PDF/${Date.now()}-${file.name}`;
  const blob = await put(filename, file, { access: "private" });

  await connectMongoDB();

  const pdf = await PDF.create({
    userId: session.user.id,
    filename: file.name,
    path: blob.url,
  });

  return NextResponse.json({
    message: "Upload success",
    pdfId: pdf._id.toString(),
    pdfPath: blob.url,
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

  if (record?.path?.startsWith("http")) {
    try { await del(record.path); } catch {}
  }

  return NextResponse.json({ message: "Deleted" });
}
