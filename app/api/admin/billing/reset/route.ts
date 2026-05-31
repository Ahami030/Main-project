import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { AuthOptions } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@/lib/mongo";
import Billing, { archiveBilling } from "@/app/models/Billing";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions as AuthOptions);
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const isAdmin = (session.user as { role?: string }).role === "admin";
  if (!isAdmin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const { billingId } = await req.json() as { billingId: string };
  if (!billingId) {
    return NextResponse.json({ message: "billingId required" }, { status: 400 });
  }

  await connectMongoDB();

  const billing = await Billing.findById(billingId).lean() as {
    _id: { toString(): string };
    billingNumber: string;
    customerId?: string;
    customerName?: string;
    customerEmail?: string;
    poIds?: unknown[];
    poNumbers?: string[];
    taxInvoices?: unknown[];
    status?: string;
    billingDate?: Date | null;
    expiresAt?: Date | null;
    createdAt?: Date;
  } | null;

  if (!billing) {
    return NextResponse.json({ message: "ไม่พบใบวางบิล" }, { status: 404 });
  }

  // Archive billing data + reset POs
  await archiveBilling(billing, "manual_reset");

  // Delete billing document
  await Billing.findByIdAndDelete(billingId);

  return NextResponse.json({
    success: true,
    billingNumber: billing.billingNumber,
    poCount: (billing.poIds ?? []).length,
  });
}
