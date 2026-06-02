import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { AuthOptions } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@/lib/mongo";
import Billing, { generateBillingNumber } from "@/app/models/Billing";
import PurchaseOrder from "@/app/models/PurchaseOrder";
import { runCleanup } from "@/app/api/admin/billing/cleanup/route";

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions as AuthOptions);
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const isAdmin = (session.user as { role?: string }).role === "admin";
  if (!isAdmin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  await connectMongoDB();

  // Fire-and-forget: clean up any expired billings automatically
  runCleanup().catch(() => {});

  const billings = await Billing.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json(billings);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions as AuthOptions);
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const isAdmin = (session.user as { role?: string }).role === "admin";
  if (!isAdmin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const { poIds } = await req.json() as { poIds: string[] };
  if (!poIds || poIds.length === 0) {
    return NextResponse.json({ message: "ต้องเลือก PO อย่างน้อย 1 ใบ" }, { status: 400 });
  }

  await connectMongoDB();

  const pos = await PurchaseOrder.find({ _id: { $in: poIds } }).lean() as Array<{
    _id: { toString(): string };
    status: string;
    userId: string;
    userName: string;
    userEmail: string;
    poNumber: string;
    billingId?: { toString(): string } | null;
  }>;

  if (pos.length !== poIds.length) {
    return NextResponse.json({ message: "ไม่พบ PO บางรายการ" }, { status: 404 });
  }

  const notAccepted = pos.filter((p) => p.status !== "accepted");
  if (notAccepted.length > 0) {
    return NextResponse.json({ message: "PO ทุกใบต้องมีสถานะ 'กำลังดำเนินการ' (accepted)" }, { status: 400 });
  }

  const alreadyBilled = pos.filter((p) => p.billingId);
  if (alreadyBilled.length > 0) {
    return NextResponse.json({ message: "PO บางใบถูกรวมในใบวางบิลอื่นแล้ว" }, { status: 400 });
  }

  const userIds = [...new Set(pos.map((p) => p.userId))];
  if (userIds.length > 1) {
    return NextResponse.json({ message: "PO ทุกใบต้องเป็นของลูกค้าคนเดียวกัน" }, { status: 400 });
  }

  const first = pos[0];
  const billingNumber = await generateBillingNumber();

  const billing = await Billing.create({
    billingNumber,
    customerId:    first.userId,
    customerName:  first.userName,
    customerEmail: first.userEmail,
    poIds:         pos.map((p) => p._id),
    poNumbers:     pos.map((p) => p.poNumber),
    status:        "draft",
  });

  await PurchaseOrder.updateMany(
    { _id: { $in: poIds } },
    { $set: { billingId: billing._id } }
  );

  return NextResponse.json(billing, { status: 201 });
}
