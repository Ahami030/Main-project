import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongo";
import Quotation from "@/app/models/Quotation";

// Called by n8n's "Callback to Web" node after the RFQ is inserted into MongoDB.
// Flips the user's "processing" quotations to "sent" — that's the signal the admin
// badge/toast and the client stepper already react to. No session: n8n authenticates
// with the X-Callback-Secret header instead.
export async function POST(req: NextRequest) {
  const secret = process.env.N8N_CALLBACK_SECRET;
  if (!secret || req.headers.get("x-callback-secret") !== secret) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null) as { userId?: string } | null;
  if (!body?.userId) {
    return NextResponse.json({ message: "userId required" }, { status: 400 });
  }

  await connectMongoDB();
  const res = await Quotation.updateMany(
    { userId: body.userId, status: "processing" },
    { status: "sent" }
  );

  if (res.modifiedCount === 0) {
    // Quotation not saved yet (callback can win the race right after upload) —
    // non-2xx makes n8n's retry re-deliver, which heals this automatically.
    return NextResponse.json({ message: "no processing quotation yet" }, { status: 409 });
  }

  return NextResponse.json({ updated: res.modifiedCount });
}
