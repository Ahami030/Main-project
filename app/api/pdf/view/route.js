import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@/lib/mongo";
import PDF from "@/app/models/PDF";

export async function GET(req) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const filenameParam = searchParams.get("filename");

  await connectMongoDB();

  const isAdmin = session.user.role === "admin";

  let pdf = null;
  if (id) {
    pdf = await PDF.findOne(isAdmin ? { _id: id } : { _id: id, userId: session.user.id });
  }
  if (!pdf && filenameParam) {
    // filenameParam อาจเป็น blob URL หรือ filename ธรรมดา
    const isUrl = filenameParam.startsWith("http");
    const query = isUrl ? { path: filenameParam } : { filename: filenameParam };
    pdf = await PDF.findOne(isAdmin ? query : { ...query, userId: session.user.id });
  }

  if (!pdf) {
    return new NextResponse("Forbidden or Not Found", { status: 403 });
  }

  if (!pdf.path) {
    return new NextResponse("File not found", { status: 404 });
  }

  const blobRes = await fetch(pdf.path, {
    headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
  });

  if (!blobRes.ok) {
    return new NextResponse("File not found", { status: 404 });
  }

  return new NextResponse(blobRes.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(pdf.filename)}`,
    },
  });
}
