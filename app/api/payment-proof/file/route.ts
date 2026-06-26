import { NextRequest, NextResponse } from "next/server";
import { requireSession, getUser } from "@/lib/apiAuth";
import { connectMongoDB } from "@/lib/mongo";
import PaymentProof from "@/app/models/PaymentProof";

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
  if (user.role !== "admin" && user.role !== "employee" && proof.customerId !== user.id) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  if (!proof.filePath) {
    return NextResponse.json({ message: "File not found" }, { status: 404 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("[payment-proof/file] BLOB_READ_WRITE_TOKEN is not set");
    return NextResponse.json({ message: "Storage token missing" }, { status: 500 });
  }

  const blobRes = await fetch(proof.filePath, {
    headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
  });

  if (!blobRes.ok) {
    console.error(`[payment-proof/file] blob fetch failed: ${blobRes.status} ${proof.filePath}`);
    return NextResponse.json({ message: "File not found" }, { status: 404 });
  }

  const safeName = encodeURIComponent(proof.fileOrigName ?? "file");
  return new Response(blobRes.body, {
    headers: {
      "Content-Type": proof.fileMimeType || blobRes.headers.get("Content-Type") || "application/octet-stream",
      "Content-Disposition": `inline; filename*=UTF-8''${safeName}`,
    },
  });
}
