import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { requireSession, getUser } from "@/lib/apiAuth";
import { connectMongoDB } from "@/lib/mongo";
import PurchaseOrder from "@/app/models/PurchaseOrder";

const MIME_BY_EXT: Record<string, string> = {
  pdf:  "application/pdf",
  png:  "image/png",
  jpg:  "image/jpeg",
  jpeg: "image/jpeg",
  gif:  "image/gif",
  webp: "image/webp",
  doc:  "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls:  "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export async function GET(req: NextRequest) {
  const sessionOrRes = await requireSession();
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;
  const session = sessionOrRes;

  const { searchParams } = new URL(req.url);
  const poId = searchParams.get("id");
  if (!poId) {
    return NextResponse.json({ message: "id required" }, { status: 400 });
  }

  await connectMongoDB();
  const po = await PurchaseOrder.findById(poId).lean() as {
    userId?: string;
    filePath?: string;
    fileOrigName?: string;
    fileMimeType?: string;
  } | null;

  if (!po) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const user = getUser(session);
  if (user.role !== "admin" && po.userId !== user.id) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const filePath = path.join(process.cwd(), (po.filePath ?? "").replace(/^\//, ""));

  let buffer: Buffer;
  try {
    buffer = await readFile(filePath);
  } catch {
    return NextResponse.json({ message: "File not found on disk" }, { status: 404 });
  }

  const ext = (po.filePath ?? "").split(".").pop()?.toLowerCase() ?? "";
  const mimeType = po.fileMimeType || MIME_BY_EXT[ext] || "application/octet-stream";

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `inline; filename="${po.fileOrigName ?? "file"}"`,
    },
  });
}
