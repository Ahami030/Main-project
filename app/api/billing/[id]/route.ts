import { NextRequest, NextResponse } from "next/server";
import { requireSession, requireEmployee, getUser } from "@/lib/apiAuth";
import { connectMongoDB } from "@/lib/mongo";
import Billing from "@/app/models/Billing";
import PurchaseOrder from "@/app/models/PurchaseOrder";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const sessionOrRes = await requireSession();
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;
  const session = sessionOrRes;

  const { id } = await params;

  try {
    await connectMongoDB();

    const billing = await Billing.findById(id).lean() as {
      customerId?: string;
      [key: string]: unknown;
    } | null;
    if (!billing) return NextResponse.json({ message: "Not found" }, { status: 404 });

    const user = getUser(session);
    const canViewAll = user.role === "admin" || user.role === "employee";
    if (!canViewAll && billing.customerId !== user.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(billing);
  } catch {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const sessionOrRes = await requireEmployee("billing");
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;

  const { id } = await params;
  const body = await req.json();
  const { action } = body;

  await connectMongoDB();
  const billing = await Billing.findById(id);
  if (!billing) return NextResponse.json({ message: "Not found" }, { status: 404 });

  if (action === "addInvoice") {
    if (billing.status !== "draft") {
      return NextResponse.json({ message: "ไม่สามารถแก้ไขใบวางบิลที่ยืนยันแล้ว" }, { status: 400 });
    }
    const { invoice } = body;
    if (!invoice?.invoiceNumber || !invoice?.invoiceDate || invoice?.amount == null) {
      return NextResponse.json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" }, { status: 400 });
    }
    billing.taxInvoices.push(invoice);
    await billing.save();
    return NextResponse.json(billing);
  }

  if (action === "removeInvoice") {
    if (billing.status !== "draft") {
      return NextResponse.json({ message: "ไม่สามารถแก้ไขใบวางบิลที่ยืนยันแล้ว" }, { status: 400 });
    }
    const { invoiceId } = body;
    billing.taxInvoices = billing.taxInvoices.filter(
      (inv: { _id: { toString(): string } }) => inv._id.toString() !== invoiceId
    );
    await billing.save();
    return NextResponse.json(billing);
  }

  if (action === "finalize") {
    if (billing.status !== "draft") {
      return NextResponse.json({ message: "ใบวางบิลนี้ยืนยันแล้ว" }, { status: 400 });
    }
    if (billing.taxInvoices.length === 0) {
      return NextResponse.json({ message: "กรุณาเพิ่มใบกำกับภาษี/ใบส่งของก่อนยืนยัน" }, { status: 400 });
    }
    billing.status = "finalized";
    billing.billingDate = new Date();
    await billing.save();

    await PurchaseOrder.updateMany(
      { _id: { $in: billing.poIds } },
      { $set: { status: "billed", billedAt: billing.billingDate } }
    );
    return NextResponse.json(billing);
  }

  if (action === "setExpiry") {
    const { days, expiresAt: customDate, fullResetOnExpiry } = body as {
      days?: number;
      expiresAt?: string;
      fullResetOnExpiry?: boolean;
    };
    if (days !== undefined && days > 0) {
      billing.expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    } else if (customDate) {
      billing.expiresAt = new Date(customDate);
    } else {
      return NextResponse.json({ message: "ต้องระบุจำนวนวันหรือวันที่" }, { status: 400 });
    }
    if (fullResetOnExpiry !== undefined) {
      billing.fullResetOnExpiry = fullResetOnExpiry;
    }
    await billing.save();
    return NextResponse.json(billing);
  }

  if (action === "clearExpiry") {
    billing.expiresAt = null;
    await billing.save();
    return NextResponse.json(billing);
  }

  if (action === "cancel") {
    if (billing.status !== "draft") {
      return NextResponse.json({ message: "ไม่สามารถยกเลิกใบวางบิลที่ยืนยันแล้ว" }, { status: 400 });
    }
    await PurchaseOrder.updateMany(
      { _id: { $in: billing.poIds } },
      { $set: { billingId: null } }
    );
    await Billing.findByIdAndDelete(id);
    return NextResponse.json({ message: "Cancelled" });
  }

  return NextResponse.json({ message: "Unknown action" }, { status: 400 });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const sessionOrRes = await requireEmployee("billing");
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;

  const { id } = await params;
  await connectMongoDB();

  const billing = await Billing.findById(id);
  if (!billing) return NextResponse.json({ message: "Not found" }, { status: 404 });

  if (billing.status === "finalized") {
    return NextResponse.json({ message: "ไม่สามารถลบใบวางบิลที่ยืนยันแล้ว" }, { status: 400 });
  }

  await PurchaseOrder.updateMany(
    { _id: { $in: billing.poIds } },
    { $set: { billingId: null } }
  );
  await Billing.findByIdAndDelete(id);
  return NextResponse.json({ message: "Deleted" });
}
