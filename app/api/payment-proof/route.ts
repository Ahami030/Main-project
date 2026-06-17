import { NextRequest, NextResponse } from "next/server";
import { requireSession, getUser } from "@/lib/apiAuth";
import { connectMongoDB } from "@/lib/mongo";
import PaymentProof, { generateProofNumber } from "@/app/models/PaymentProof";
import Billing from "@/app/models/Billing";
import PurchaseOrder from "@/app/models/PurchaseOrder";

export async function GET(req: NextRequest) {
  const sessionOrRes = await requireSession();
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;
  const session = sessionOrRes;

  const user = getUser(session);
  const { searchParams } = new URL(req.url);
  const billingId = searchParams.get("billingId");
  const poId      = searchParams.get("poId");

  await connectMongoDB();

  const isValidId = (v: string | null): v is string =>
    !!v && v !== "null" && v !== "undefined";

  const query: Record<string, unknown> = {};
  if (isValidId(billingId)) query.billingId = billingId;
  else if (isValidId(poId)) query.poId = poId;
  if (user.role !== "admin" && user.role !== "employee") query.customerId = user.id;

  const proofs = await PaymentProof.find(query).sort({ createdAt: -1 }).lean();
  return NextResponse.json(proofs);
}

export async function POST(req: NextRequest) {
  const sessionOrRes = await requireSession();
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;
  const session = sessionOrRes;

  const user = getUser(session);
  const userId   = user.id;
  const userName = session.user?.name ?? "";
  const isAdmin  = user.role === "admin";

  const body = await req.json() as {
    billingId?: string;
    poId?: string;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    bankName?: string;
    accountName?: string;
    referenceNumber?: string;
    note?: string;
    filePath: string;
    fileOrigName: string;
    fileMimeType: string;
    installmentNumber?: number;
  };

  const {
    billingId, poId,
    amount, paymentDate, paymentMethod,
    bankName, accountName, referenceNumber, note,
    filePath, fileOrigName, fileMimeType, installmentNumber,
  } = body;

  if ((!billingId && !poId) || !amount || !paymentDate || !filePath) {
    return NextResponse.json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" }, { status: 400 });
  }

  await connectMongoDB();

  if (billingId) {
    const billing = await Billing.findById(billingId).lean() as {
      _id: { toString(): string };
      billingNumber: string;
      customerId: string;
      customerName: string;
      customerEmail: string;
      poIds: { toString(): string }[];
      poNumbers: string[];
      status: string;
    } | null;

    if (!billing) return NextResponse.json({ message: "ไม่พบใบวางบิล" }, { status: 404 });
    if (billing.status !== "finalized") {
      return NextResponse.json({ message: "ใบวางบิลยังไม่ได้ยืนยัน" }, { status: 400 });
    }
    if (!isAdmin && billing.customerId !== userId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const existing = await PaymentProof.findOne({ billingId, status: "pending" }).lean();
    if (existing) {
      return NextResponse.json({ message: "มีการส่งหลักฐานที่รอตรวจสอบอยู่แล้ว" }, { status: 400 });
    }

    const proofNumber = await generateProofNumber();
    const proof = await PaymentProof.create({
      proofNumber,
      billingId:         billing._id,
      billingNumber:     billing.billingNumber,
      customerId:        billing.customerId,
      customerName:      billing.customerName,
      customerEmail:     billing.customerEmail,
      poIds:             billing.poIds,
      poNumbers:         billing.poNumbers,
      amount,
      paymentDate,
      paymentMethod:     paymentMethod || "bank_transfer",
      bankName:          bankName ?? "",
      accountName:       accountName ?? "",
      referenceNumber:   referenceNumber ?? "",
      note:              note ?? "",
      filePath,
      fileOrigName,
      fileMimeType:      fileMimeType ?? "",
      status:            "pending",
      installmentNumber: installmentNumber ?? 1,
      history: [{ action: "submitted", actor: userId ?? "", actorName: userName, timestamp: new Date(), note: "", amount }],
    });

    await Billing.findByIdAndUpdate(billingId, { paymentStatus: "partial" });
    return NextResponse.json(proof, { status: 201 });
  }

  const po = await PurchaseOrder.findById(poId).lean() as {
    _id: { toString(): string };
    poNumber: string;
    userId: string;
    userName: string;
    userEmail: string;
    status: string;
  } | null;

  if (!po) return NextResponse.json({ message: "ไม่พบ PO" }, { status: 404 });
  if (po.status !== "billed") {
    return NextResponse.json({ message: "PO ยังไม่ได้วางบิล" }, { status: 400 });
  }
  if (!isAdmin && po.userId !== userId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const existingPO = await PaymentProof.findOne({ poId, status: "pending" }).lean();
  if (existingPO) {
    return NextResponse.json({ message: "มีการส่งหลักฐานที่รอตรวจสอบอยู่แล้ว" }, { status: 400 });
  }

  const proofNumber = await generateProofNumber();
  const proof = await PaymentProof.create({
    proofNumber,
    billingId:         null,
    billingNumber:     po.poNumber,
    poId:              po._id,
    customerId:        po.userId,
    customerName:      po.userName,
    customerEmail:     po.userEmail,
    poIds:             [po._id],
    poNumbers:         [po.poNumber],
    amount,
    paymentDate,
    paymentMethod:     paymentMethod || "bank_transfer",
    bankName:          bankName ?? "",
    accountName:       accountName ?? "",
    referenceNumber:   referenceNumber ?? "",
    note:              note ?? "",
    filePath,
    fileOrigName,
    fileMimeType:      fileMimeType ?? "",
    status:            "pending",
    installmentNumber: installmentNumber ?? 1,
    history: [{ action: "submitted", actor: userId ?? "", actorName: userName, timestamp: new Date(), note: "", amount }],
  });

  return NextResponse.json(proof, { status: 201 });
}
