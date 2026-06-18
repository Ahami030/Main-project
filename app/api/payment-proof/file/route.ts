import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { requireSession, getUser } from "@/lib/apiAuth";
import { connectMongoDB } from "@/lib/mongo";
import PaymentProof from "@/app/models/PaymentProof";

const MIME_BY_EXT: Record<string, string> = {
  pdf:  "application/pdf",
  png:  "image/png",
  jpg:  "image/jpeg",
  jpeg: "image/jpeg",
  gif:  "image/gif",
  webp: "image/webp",
};

export async function GET(req: NextRequest) {
  const sessionOrRes = await requireSession();
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;
  const session = sessionOrRes;

  const { searchParams } = new URL(req.url);
  const proofId = searchParams.get("id");
  if (!proofId) {
    return NextResponse.json({ message: "id required" }, { status: 400 });
  }

  await connectMongoDB();
  const proof = await PaymentProof.findById(proofId).lean() as {
    customerId?: string;
    filePath?: string;
    fileOrigName?: string;
    fileMimeType?: string;
  } | null;

  if (!proof) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const user = getUser(session);
  if (user.role !== "admin" && proof.customerId !== user.id) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const filePath = path.join(process.cwd(), (proof.filePath ?? "").replace(/^\//, ""));

  let buffer: Buffer;
  try {
    buffer = await readFile(filePath);
  } catch {
    return NextResponse.json({ message: "File not found on disk" }, { status: 404 });
  }

  const ext = (proof.filePath ?? "").split(".").pop()?.toLowerCase() ?? "";
  const mimeType = proof.fileMimeType || MIME_BY_EXT[ext] || "application/octet-stream";

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `inline; filename="${proof.fileOrigName ?? "file"}"`,
    },
  });
}
