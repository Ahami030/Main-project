import { NextRequest, NextResponse } from "next/server";
import { requireEmployee } from "@/lib/apiAuth";
import { connectMongoDB } from "@/lib/mongo";
import User from "@/app/models/User";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Reset a walk-in customer's password. Passwords are bcrypt-hashed and can never be
// read back — issuing a fresh one (shown once) is the only correct "forgot password"
// path for the front desk. Locked to role "user" so staff can't reset staff accounts.
export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionOrRes = await requireEmployee("quotation");
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;

  const { id } = await params;
  await connectMongoDB();

  const user = await User.findById(id);
  if (!user) return NextResponse.json({ message: "ไม่พบลูกค้า" }, { status: 404 });
  if (user.role !== "user") {
    return NextResponse.json({ message: "รีเซ็ตได้เฉพาะบัญชีลูกค้า" }, { status: 403 });
  }

  const password = crypto.randomUUID().replace(/-/g, "").slice(0, 10);
  user.password = await bcrypt.hash(password, 10);
  await user.save();

  // plaintext leaves the server exactly once
  return NextResponse.json({ password });
}
