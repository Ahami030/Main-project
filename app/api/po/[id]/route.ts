import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { AuthOptions } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@/lib/mongo";
import PurchaseOrder from "@/app/models/PurchaseOrder";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions as AuthOptions);
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectMongoDB();

  const po = await PurchaseOrder.findById(id).lean();
  if (!po) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const isAdmin = (session.user as { role?: string }).role === "admin";
  const userId  = (session.user as { id?: string }).id;
  if (!isAdmin && (po as { userId?: string }).userId !== userId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(po);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions as AuthOptions);
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const isAdmin = (session.user as { role?: string }).role === "admin";
  if (!isAdmin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

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

  return NextResponse.json({ message: "Unknown action" }, { status: 400 });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions as AuthOptions);
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const isAdmin = (session.user as { role?: string }).role === "admin";
  if (!isAdmin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await connectMongoDB();
  await PurchaseOrder.findByIdAndDelete(id);
  return NextResponse.json({ message: "Deleted" });
}
