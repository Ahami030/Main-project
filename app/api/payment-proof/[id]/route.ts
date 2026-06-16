import { NextRequest, NextResponse } from "next/server";
import { requireSession, getUser } from "@/lib/apiAuth";
import { connectMongoDB } from "@/lib/mongo";
import PaymentProof from "@/app/models/PaymentProof";
import Billing from "@/app/models/Billing";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const sessionOrRes = await requireSession();
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;
  const session = sessionOrRes;

  const { id } = await params;
  await connectMongoDB();

  const proof = await PaymentProof.findById(id).lean() as {
    customerId?: string;
    [key: string]: unknown;
  } | null;
  if (!proof) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const user = getUser(session);
  if (user.role !== "admin" && proof.customerId !== user.id) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(proof);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const sessionOrRes = await requireSession();
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;
  const session = sessionOrRes;

  const user     = getUser(session);
  const isAdmin  = user.role === "admin";
  const userId   = user.id;
  const userName = session.user?.name ?? "";

  const { id } = await params;
  const body = await req.json();
  const { action } = body;

  await connectMongoDB();
  const proof = await PaymentProof.findById(id);
  if (!proof) return NextResponse.json({ message: "Not found" }, { status: 404 });

  if (action === "approve") {
    if (!isAdmin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    if (proof.status !== "pending") {
      return NextResponse.json({ message: "หลักฐานนี้ไม่ได้อยู่ในสถานะรอตรวจสอบ" }, { status: 400 });
    }
    proof.status = "approved";
    proof.reviewedBy = userId ?? "";
    proof.reviewedAt = new Date();
    proof.history.push({
      action:    "approved",
      actor:     userId ?? "",
      actorName: userName,
      timestamp: new Date(),
      note:      body.note ?? "",
      amount:    proof.amount,
    });
    await proof.save();

    if (proof.billingId) {
      const allProofs = await PaymentProof.find({
        billingId: proof.billingId,
        status: { $ne: "rejected" },
      }).lean() as Array<{ status: string }>;
      const allApproved = allProofs.every((p) => p.status === "approved");
      await Billing.findByIdAndUpdate(proof.billingId, {
        paymentStatus: allApproved ? "paid" : "partial",
      });
    }

    return NextResponse.json(proof);
  }

  if (action === "reject") {
    if (!isAdmin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    if (proof.status !== "pending") {
      return NextResponse.json({ message: "หลักฐานนี้ไม่ได้อยู่ในสถานะรอตรวจสอบ" }, { status: 400 });
    }
    const { rejectionReason } = body;
    if (!rejectionReason?.trim()) {
      return NextResponse.json({ message: "กรุณาระบุเหตุผลการปฏิเสธ" }, { status: 400 });
    }
    proof.status = "rejected";
    proof.reviewedBy = userId ?? "";
    proof.reviewedAt = new Date();
    proof.rejectionReason = rejectionReason;
    proof.history.push({
      action:    "rejected",
      actor:     userId ?? "",
      actorName: userName,
      timestamp: new Date(),
      note:      rejectionReason,
      amount:    proof.amount,
    });
    await proof.save();

    if (proof.billingId) {
      const approvedProofs = await PaymentProof.countDocuments({
        billingId: proof.billingId,
        status: "approved",
      });
      if (approvedProofs === 0) {
        await Billing.findByIdAndUpdate(proof.billingId, { paymentStatus: "unpaid" });
      }
    }

    return NextResponse.json(proof);
  }

  if (action === "resubmit") {
    if (!isAdmin && proof.customerId !== userId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    if (proof.status !== "rejected") {
      return NextResponse.json({ message: "สามารถส่งใหม่ได้เฉพาะหลักฐานที่ถูกปฏิเสธ" }, { status: 400 });
    }

    const {
      amount, paymentDate, paymentMethod, bankName,
      accountName, referenceNumber, note,
      filePath, fileOrigName, fileMimeType,
    } = body;

    if (!amount || !paymentDate || !filePath) {
      return NextResponse.json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" }, { status: 400 });
    }

    proof.amount          = amount;
    proof.paymentDate     = paymentDate;
    proof.paymentMethod   = paymentMethod ?? proof.paymentMethod;
    proof.bankName        = bankName ?? proof.bankName;
    proof.accountName     = accountName ?? proof.accountName;
    proof.referenceNumber = referenceNumber ?? proof.referenceNumber;
    proof.note            = note ?? proof.note;
    proof.filePath        = filePath;
    proof.fileOrigName    = fileOrigName ?? proof.fileOrigName;
    proof.fileMimeType    = fileMimeType ?? proof.fileMimeType;
    proof.status          = "pending";
    proof.reviewedBy      = null;
    proof.reviewedAt      = null;
    proof.rejectionReason = "";
    proof.history.push({
      action:    "resubmitted",
      actor:     userId ?? "",
      actorName: userName,
      timestamp: new Date(),
      note:      body.note ?? "",
      amount,
    });
    await proof.save();

    if (proof.billingId) {
      await Billing.findByIdAndUpdate(proof.billingId, { paymentStatus: "partial" });
    }

    return NextResponse.json(proof);
  }

  return NextResponse.json({ message: "Unknown action" }, { status: 400 });
}
