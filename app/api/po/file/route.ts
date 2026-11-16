import { NextRequest, NextResponse } from "next/server";
import { requireSession, getUser } from "@/lib/apiAuth";
import { connectMongoDB } from "@/lib/mongo";
import PurchaseOrder from "@/app/models/PurchaseOrder";

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
  if (user.role !== "admin" && user.role !== "employee" && po.userId !== user.id) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  if (!po.filePath) {
    return NextResponse.json({ message: "File not found" }, { status: 404 });
  }

  const blobRes = await fetch(po.filePath, {
    headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
  });

  if (!blobRes.ok) {
    return NextResponse.json({ message: "File not found" }, { status: 404 });
  }

  return new Response(blobRes.body, {
    headers: {
      "Content-Type": po.fileMimeType || blobRes.headers.get("Content-Type") || "application/octet-stream",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(po.fileOrigName ?? "file")}`,
    },
  });
}
