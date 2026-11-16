import { NextResponse } from "next/server";
import { requireSession, getUser } from "@/lib/apiAuth";
import { connectMongoDB } from "@/lib/mongo";
import Quotation from "@/app/models/Quotation";

export async function POST(req: Request) {
  const sessionOrRes = await requireSession();
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;
  const session = sessionOrRes;

  const { filename, pdfId, pdfPath, userId: targetUserId } = await req.json();
  if (!filename) {
    return NextResponse.json({ message: "filename required" }, { status: 400 });
  }

  await connectMongoDB();

  // Staff (admin / employee with "quotation") may create on behalf of a customer —
  // the walk-in flow. Everyone else can only create for themselves.
  const user = getUser(session);
  const isQuotationStaff =
    user.role === "admin" ||
    (user.role === "employee" && (user.permissions ?? []).includes("quotation"));

  let userId = user.id ?? "unknown";
  if (targetUserId && targetUserId !== user.id) {
    if (!isQuotationStaff) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    userId = targetUserId;
  }

  // "processing" until n8n's callback (/api/rfq/callback) confirms the RFQ is in the DB —
  // the admin's new-work badge counts "sent", so it only fires when the work actually exists
  const quotation = await Quotation.create({ userId, filename, pdfId, pdfPath, status: "processing" });

  return NextResponse.json({ quotation }, { status: 201 });
}

export async function GET() {
  const sessionOrRes = await requireSession();
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;
  const session = sessionOrRes;

  await connectMongoDB();

  const userId = getUser(session).id ?? "unknown";
  const quotations = await Quotation.find({ userId }).sort({ createdAt: -1 });

  return NextResponse.json({ quotations });
}
