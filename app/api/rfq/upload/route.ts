import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/apiAuth";

// Bridge between the browser and the n8n webhook. The browser sends only a small
// JSON payload (the file is already in Vercel Blob — direct client upload, since
// function request bodies cap at 4.5MB). This route downloads the blob server-side
// (outbound fetches have no such cap) and forwards the same multipart form n8n
// always received — the workflow needs no changes. Also dodges CORS/ngrok
// interstitials that block browser→n8n calls.
export async function POST(req: NextRequest) {
  const sessionOrRes = await requireSession();
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;

  const url = process.env.N8N_WEBHOOK_URL;
  if (!url) {
    return NextResponse.json({ message: "N8N_WEBHOOK_URL not configured" }, { status: 500 });
  }

  const body = await req.json().catch(() => null) as {
    userId?: string;
    filename?: string;
    rfq_number?: string;
    fileUrl?: string;
    origName?: string;
  } | null;
  if (!body?.userId || !body.fileUrl) {
    return NextResponse.json({ message: "userId and fileUrl required" }, { status: 400 });
  }

  // Bearer token required for private blobs; harmless for public ones
  const fileRes = await fetch(body.fileUrl, {
    headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN ?? ""}` },
  });
  if (!fileRes.ok) {
    return NextResponse.json(
      { message: `ดึงไฟล์จาก storage ไม่ได้ (HTTP ${fileRes.status})` },
      { status: 502 }
    );
  }
  const fileBlob = await fileRes.blob();

  const fd = new FormData();
  fd.append("file", fileBlob, body.origName ?? "document.pdf");
  fd.append("userId", body.userId);
  fd.append("filename", body.filename ?? body.fileUrl);
  fd.append("rfq_number", body.rfq_number ?? "");

  try {
    const res = await fetch(url, {
      method: "POST",
      body: fd,
      // ngrok free tier serves a browser-warning page unless this header is present
      headers: { "ngrok-skip-browser-warning": "1" },
    });
    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 200);
      return NextResponse.json(
        { message: `n8n ตอบกลับ HTTP ${res.status}${detail ? ` — ${detail}` : ""}` },
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "เชื่อมต่อ n8n ไม่ได้" }, { status: 502 });
  }
}
