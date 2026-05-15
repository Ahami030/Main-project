import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@/lib/mongo";
import PDF from "@/app/models/PDF";
import fs from "fs";
import path from "path";

export async function GET(req) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const filenameParam = searchParams.get("filename");

  await connectMongoDB();

  let pdf = null;

  // 🔥 MODE 1: ใช้ id (เหมือนเดิม)
  if (id) {
    pdf = await PDF.findOne({
      _id: id,
      userId: session.user.id,
    });
  }

  // 🔥 MODE 2: ใช้ filename (เพิ่มใหม่)
  if (!pdf && filenameParam) {
    pdf = await PDF.findOne({
      filename: filenameParam,
      userId: session.user.id,
    });
  }

  if (!pdf) {
    return new NextResponse("Forbidden or Not Found", { status: 403 });
  }

  const filePath = path.join(process.cwd(), "PDF", pdf.filename);

  if (!fs.existsSync(filePath)) {
    return new NextResponse("File not found", { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(pdf.filename)}`,
    },
  });
}