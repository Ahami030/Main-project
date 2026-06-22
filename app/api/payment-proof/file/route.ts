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

  const blobRes = await fetch(proof.filePath, {
    headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
  });

  if (!blobRes.ok) {
    return NextResponse.json({ message: "File not found" }, { status: 404 });
  }

  return new Response(blobRes.body, {
    headers: {
      "Content-Type": proof.fileMimeType || blobRes.headers.get("Content-Type") || "application/octet-stream",
      "Content-Disposition": `inline; filename="${proof.fileOrigName ?? "file"}"`,
    },
  });
}
