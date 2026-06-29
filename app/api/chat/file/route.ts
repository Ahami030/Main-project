import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/apiAuth";

export async function GET(req: NextRequest) {
  const sessionOrRes = await requireSession();
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;

  const url = new URL(req.url).searchParams.get("url");
  if (!url) return NextResponse.json({ message: "url required" }, { status: 400 });

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("[chat/file] BLOB_READ_WRITE_TOKEN is not set");
    return NextResponse.json({ message: "Storage token missing" }, { status: 500 });
  }

  const blobRes = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
  });

  if (!blobRes.ok) {
    console.error(`[chat/file] blob fetch failed: ${blobRes.status} ${url}`);
    return NextResponse.json({ message: "File not found" }, { status: 404 });
  }

  const contentType = blobRes.headers.get("Content-Type") || "application/octet-stream";
  return new Response(blobRes.body, {
    headers: { "Content-Type": contentType },
  });
}
