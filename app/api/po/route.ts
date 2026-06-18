import { NextRequest, NextResponse } from "next/server";
import { requireSession, getUser, buildUserQuery } from "@/lib/apiAuth";
import { connectMongoDB } from "@/lib/mongo";
import PurchaseOrder, { generatePONumber } from "@/app/models/PurchaseOrder";
import "@/app/models/Billing";

export async function GET(req: NextRequest) {
  const sessionOrRes = await requireSession();
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;
  const session = sessionOrRes;

  await connectMongoDB();

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status");

  const query = buildUserQuery(session);
  if (statusFilter) query.status = statusFilter;

  const orders = await PurchaseOrder.find(query)
    .populate("billingId", "billingNumber poNumbers status")
    .sort({ createdAt: -1 })
    .lean();
  return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
  const sessionOrRes = await requireSession();
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;
  const session = sessionOrRes;

  const body = await req.json();
  const { filePath, fileOrigName, fileMimeType } = body;

  if (!filePath || !fileOrigName) {
    return NextResponse.json({ message: "filePath and fileOrigName required" }, { status: 400 });
  }

  await connectMongoDB();

  let poNumber: string;
  let retries = 0;
  while (true) {
    try {
      poNumber = await generatePONumber();
      break;
    } catch {
      if (retries++ >= 3) throw new Error("Failed to generate PO number");
    }
  }

  const user = getUser(session);
  const po = await PurchaseOrder.create({
    poNumber,
    userId:       user.id,
    userName:     session.user?.name ?? "",
    userEmail:    session.user?.email ?? "",
    filePath,
    fileOrigName,
    fileMimeType: fileMimeType ?? "",
  });

  return NextResponse.json(po, { status: 201 });
}
