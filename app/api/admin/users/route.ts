import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { connectMongoDB } from "@/lib/mongo";
import User from "@/app/models/User";
import bcrypt from "bcryptjs";

export async function GET() {
  const sessionOrRes = await requireAdmin();
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;

  await connectMongoDB();
  const users = await User.find({}, { password: 0 }).sort({ createdAt: -1 }).lean();
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const sessionOrRes = await requireAdmin();
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;

  const { name, email, password, role, permissions } = await req.json();
  if (!name || !email || !password) {
    return NextResponse.json({ message: "name, email และ password จำเป็นต้องกรอก" }, { status: 400 });
  }

  await connectMongoDB();

  const existing = await User.findOne({ email });
  if (existing) {
    return NextResponse.json({ message: "อีเมลนี้ถูกใช้แล้ว" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email,
    password: hashed,
    role: role ?? "user",
    permissions: permissions ?? [],
  });

  const { password: _, ...safe } = user.toObject();
  return NextResponse.json(safe, { status: 201 });
}
