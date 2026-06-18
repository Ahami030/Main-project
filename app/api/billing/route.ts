import { NextRequest, NextResponse } from "next/server";
import { requireEmployee } from "@/lib/apiAuth";
import { connectMongoDB } from "@/lib/mongo";
import Billing, { generateBillingNumber } from "@/app/models/Billing";
import PurchaseOrder from "@/app/models/PurchaseOrder";
import { runCleanup } from "@/app/api/admin/billing/cleanup/route";

export async function GET(_req: NextRequest) {
  const sessionOrRes = await requireEmployee("billing");
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;

  await connectMongoDB();
  runCleanup().catch(() => {});

  const [groups, singlePOs] = await Promise.all([
    Billing.find().sort({ createdAt: -1 }).lean(),
    PurchaseOrder.find({ status: "billed", billingId: null }).sort({ billedAt: -1 }).lean(),
  ]);

  type AnyDoc = Record<string, unknown> & { createdAt?: string | Date };

  const groupItems = (groups as AnyDoc[]).map((b) => ({ ...b, type: "group" as const }));

  const singleItems = (singlePOs as Array<AnyDoc & {
    _id: unknown; poNumber?: string; userId?: string; userName?: string;
    userEmail?: string; taxInvoices?: unknown[]; billedAt?: Date | null;
  }>).map((po) => ({
    _id:           po._id,
    type:          "single" as const,
    billingNumber: po.poNumber,
    customerId:    po.userId,
    customerName:  po.userName,
    customerEmail: po.userEmail,
    poNumbers:     po.poNumber ? [po.poNumber] : [],
    taxInvoices:   po.taxInvoices ?? [],
    status:        "finalized",
    billingDate:   po.billedAt ?? null,
    expiresAt:     null,
    createdAt:     po.createdAt,
  }));

  const all = [...groupItems, ...singleItems].sort(
    (a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime()
  );

  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  const sessionOrRes = await requireEmployee("billing");
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;

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
