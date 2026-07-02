import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/apiAuth";

// Server-side proxy to the n8n webhook. The browser must not call n8n directly:
// cross-origin + ngrok's free-tier interstitial both break the fetch with CORS errors.
// Server-to-server has neither problem, and the ngrok URL stays out of the client bundle.
export async function POST(req: NextRequest) {
  const sessionOrRes = await requireSession();
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;

  const url = process.env.N8N_WEBHOOK_URL;
  if (!url) {
    return NextResponse.json({ message: "N8N_WEBHOOK_URL not configured" }, { status: 500 });
  }

  const formData = await req.formData();
  try {
    const res = await fetch(url, {
      method: "POST",
      body: formData,
      // ngrok free tier serves a browser-warning page unless this header is present
      headers: { "ngrok-skip-browser-warning": "1" },
    });
    if (!res.ok) {
      return NextResponse.json({ message: `n8n ตอบกลับ HTTP ${res.status}` }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "เชื่อมต่อ n8n ไม่ได้" }, { status: 502 });
  }
}
