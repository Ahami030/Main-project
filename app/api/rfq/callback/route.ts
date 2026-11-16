import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongo";
import Quotation from "@/app/models/Quotation";

// Called by n8n when a run ends — success ("Callback to Web" node) or failure (error
// outputs of OCR / Gemini → "Callback Failed" node). No session: n8n authenticates
// with the X-Callback-Secret header instead.
//
// Body: { userId, rfq_number?, status?: "failed" | anything else = success, reason? }
export async function POST(req: NextRequest) {
  const secret = process.env.N8N_CALLBACK_SECRET;
  if (!secret || req.headers.get("x-callback-secret") !== secret) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null) as {
    userId?: string;
    rfq_number?: string;
    status?: string;
    reason?: string;
  } | null;
  if (!body?.userId) {
    return NextResponse.json({ message: "userId required" }, { status: 400 });
  }
  // only "failed" means failure — anything else ("done", "sent", missing) is the
  // success node, whose existing body already sends status: "done"
  const status = body.status === "failed" ? "failed" : "sent";

  // rfq_number pins the exact upload; without it (old workflow) fall back to every
  // processing quotation of the user
  const target = body.rfq_number
    ? { userId: body.userId, rfqNumber: body.rfq_number }
    : { userId: body.userId, status: "processing" };

  await connectMongoDB();
  const res = status === "sent"
    // a pinned upload may already be "failed" by the web-side timeout — a slow run that
    // finishes late still recovers it
    ? await Quotation.updateMany(
        body.rfq_number ? { ...target, status: { $in: ["processing", "failed"] } } : target,
        { status: "sent", failReason: null }
      )
    : await Quotation.updateMany(
        { ...target, status: "processing" },
        { status: "failed", failReason: body.reason?.trim() || "ระบบอ่านเอกสารไม่สำเร็จ กรุณาตรวจสอบไฟล์แล้วอัปโหลดใหม่" }
      );

  if (res.modifiedCount === 0) {
    // Quotation not saved yet (callback can win the race right after upload) —
    // non-2xx makes n8n's retry re-deliver, which heals this automatically.
    return NextResponse.json({ message: "no processing quotation yet" }, { status: 409 });
  }

  return NextResponse.json({ updated: res.modifiedCount });
}
