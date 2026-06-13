import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { AuthOptions } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@/lib/mongo";
import User from "@/app/models/User";

export async function GET() {
  const session = await getServerSession(authOptions as AuthOptions);
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id?: string }).id;

  await connectMongoDB();

  const user = await User.findById(
    userId,
    "name email organizationName taxId phone lineId billingAddress shippingAddress role"
  ).lean();
  if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

  return NextResponse.json(user);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions as AuthOptions);
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id?: string }).id;

  const body = await req.json() as {
    name?: string;
    organizationName?: string;
    taxId?: string;
    phone?: string;
    lineId?: string;
    billingAddress?: string;
    shippingAddress?: string;
  };
  const name = body.name?.trim();
  const organizationName = body.organizationName?.trim() ?? "";
  const taxId = body.taxId?.trim() ?? "";
  const phone = body.phone?.trim() ?? "";
  const lineId = body.lineId?.trim() ?? "";
  const billingAddress = body.billingAddress?.trim() ?? "";
  const shippingAddress = body.shippingAddress?.trim() ?? "";

  if (!name) {
    return NextResponse.json({ message: "กรุณากรอกชื่อ-นามสกุล" }, { status: 400 });
  }

  await connectMongoDB();

  const user = await User.findByIdAndUpdate(
    userId,
    { name, organizationName, taxId, phone, lineId, billingAddress, shippingAddress },
    { new: true }
  ).select("name email organizationName taxId phone lineId billingAddress shippingAddress role").lean();

  if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

  return NextResponse.json(user);
}
