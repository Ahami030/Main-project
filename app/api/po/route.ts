import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { AuthOptions } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@/lib/mongo";
import PurchaseOrder, { generatePONumber } from "@/app/models/PurchaseOrder";
import "@/app/models/Billing"; // register Billing model for populate

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions as AuthOptions);
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await connectMongoDB();

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status");

  const isAdmin = (session.user as { role?: string }).role === "admin";

  const query: Record<string, unknown> = {};
  if (!isAdmin) query.userId = (session.user as { id?: string }).id;
  if (statusFilter) query.status = statusFilter;

  const orders = await PurchaseOrder.find(query)
    .populate("billingId", "billingNumber poNumbers status")
    .sort({ createdAt: -1 })
    .lean();
  return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions as AuthOptions);
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

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

  const po = await PurchaseOrder.create({
    poNumber,
    userId: (session.user as { id?: string }).id,
    userName: session.user?.name ?? "",
    userEmail: session.user?.email ?? "",
    filePath,
    fileOrigName,
    fileMimeType: fileMimeType ?? "",
  });

  return NextResponse.json(po, { status: 201 });
}
