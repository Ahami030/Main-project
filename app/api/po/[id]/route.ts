import { NextRequest, NextResponse } from "next/server";
import { requireSession, requireAdmin, getUser } from "@/lib/apiAuth";
import { connectMongoDB } from "@/lib/mongo";
import PurchaseOrder from "@/app/models/PurchaseOrder";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const sessionOrRes = await requireSession();
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;
  const session = sessionOrRes;

  const { id } = await params;
  await connectMongoDB();

  const po = await PurchaseOrder.findById(id).lean();
  if (!po) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const user = getUser(session);
  if (user.role !== "admin" && (po as { userId?: string }).userId !== user.id) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(po);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const sessionOrRes = await requireAdmin();
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;

  const { id } = await params;
  const body   = await req.json();
  const { action } = body;

  await connectMongoDB();
  const po = await PurchaseOrder.findById(id);
  if (!po) return NextResponse.json({ message: "Not found" }, { status: 404 });

  if (action === "accept") {
    if (po.status !== "pending") {
      return NextResponse.json({ message: "PO is not in pending status" }, { status: 400 });
    }
    po.status = "accepted";
    await po.save();
    return NextResponse.json(po);
  }

  if (action === "addInvoice") {
    if (po.status !== "accepted") {
      return NextResponse.json({ message: "PO must be accepted first" }, { status: 400 });
    }
    if (po.billingId) {
      return NextResponse.json({ message: "PO นี้อยู่ในระบบใบวางบิลรวม กรุณาจัดการผ่านหน้าใบวางบิล" }, { status: 400 });
    }
    const { invoice } = body;
    if (!invoice?.invoiceNumber || !invoice?.invoiceDate || invoice?.amount == null) {
      return NextResponse.json({ message: "invoice fields required" }, { status: 400 });
    }
    po.taxInvoices.push(invoice);
    await po.save();
    return NextResponse.json(po);
  }

  if (action === "removeInvoice") {
    if (po.status === "billed") {
      return NextResponse.json({ message: "Cannot modify billed PO" }, { status: 400 });
    }
    if (po.billingId) {
      return NextResponse.json({ message: "PO นี้อยู่ในระบบใบวางบิลรวม กรุณาจัดการผ่านหน้าใบวางบิล" }, { status: 400 });
    }
    const { invoiceId } = body;
    po.taxInvoices = po.taxInvoices.filter(
      (inv: { _id: { toString(): string } }) => inv._id.toString() !== invoiceId
    );
    await po.save();
    return NextResponse.json(po);
  }

  if (action === "generateBilling") {
    if (po.status !== "accepted") {
      return NextResponse.json({ message: "PO must be accepted first" }, { status: 400 });
    }
    if (po.billingId) {
      return NextResponse.json({ message: "PO นี้อยู่ในระบบใบวางบิลรวม กรุณาใช้หน้าจัดการใบวางบิล" }, { status: 400 });
    }
    if (po.taxInvoices.length === 0) {
      return NextResponse.json({ message: "No invoices added" }, { status: 400 });
    }
    po.status  = "billed";
    po.billedAt = new Date();
    await po.save();
    return NextResponse.json(po);
  }

  if (action === "unbill") {
    if (po.status !== "billed") {
      return NextResponse.json({ message: "PO นี้ยังไม่ได้วางบิล" }, { status: 400 });
    }
    if (po.billingId) {
      return NextResponse.json({ message: "PO นี้อยู่ในใบวางบิลรวม กรุณาจัดการผ่านหน้าใบวางบิลรวม" }, { status: 400 });
    }
    po.status   = "accepted";
    po.billedAt = null;
    await po.save();
    return NextResponse.json(po);
  }

  return NextResponse.json({ message: "Unknown action" }, { status: 400 });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const sessionOrRes = await requireAdmin();
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;

  const { id } = await params;
  await connectMongoDB();
  await PurchaseOrder.findByIdAndDelete(id);
  return NextResponse.json({ message: "Deleted" });
}
