import { NextRequest, NextResponse } from "next/server";
import { requireEmployee } from "@/lib/apiAuth";
import { connectMongoDB } from "@/lib/mongo";
import User from "@/app/models/User";
import WalkinCredential from "@/app/models/WalkinCredential";
import { encryptPassword } from "@/lib/walkinCrypto";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Customer directory for the staff-assisted RFQ flow (walk-in customers).
// Deliberately separate from /api/admin/users: this route can only ever see or
// create role "user" accounts — role/permissions are hardcoded, never read from
// the body — so employees with the "quotation" permission can use it safely.

export async function GET() {
  const sessionOrRes = await requireEmployee("quotation");
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;

  await connectMongoDB();
  const customers = await User.find(
    { role: "user" },
    { name: 1, email: 1, phone: 1, organizationName: 1, createdAt: 1 }
  ).sort({ createdAt: -1 }).lean() as Array<{ _id: { toString(): string }; [k: string]: unknown }>;

  // walk-in accounts (created by staff) have a stored credential → password viewable
  const credIds = new Set(
    (await WalkinCredential.find({}, { userId: 1 }).lean() as Array<{ userId: string }>)
      .map((c) => c.userId)
  );
  return NextResponse.json(
    customers.map((c) => ({ ...c, hasCred: credIds.has(c._id.toString()) }))
  );
}

export async function POST(req: NextRequest) {
  const sessionOrRes = await requireEmployee("quotation");
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;

  const { name, email, phone, organizationName } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ message: "กรุณากรอกชื่อลูกค้า" }, { status: 400 });
  }

  await connectMongoDB();

  const givenEmail = email?.trim();
  if (givenEmail) {
    const existing = await User.findOne({ email: givenEmail });
    if (existing) {
      return NextResponse.json({ message: "อีเมลนี้ถูกใช้แล้ว" }, { status: 409 });
    }
  }

  const genEmail = () =>
    `walkin-${crypto.randomUUID().replace(/-/g, "").slice(0, 6)}@walkin.local`;
  const password = crypto.randomUUID().replace(/-/g, "").slice(0, 10);
  const hashed = await bcrypt.hash(password, 10);

  const doc = {
    name: name.trim(),
    password: hashed,
    role: "user",
    permissions: [] as string[],
    phone: phone?.trim() ?? "",
    organizationName: organizationName?.trim() ?? "",
  };

  let user;
  try {
    user = await User.create({ ...doc, email: givenEmail ?? genEmail() });
  } catch (e: unknown) {
    // generated-email unique collision (~1 in 16M) — retry once with a fresh one
    if (!givenEmail && (e as { code?: number })?.code === 11000) {
      user = await User.create({ ...doc, email: genEmail() });
    } else {
      throw e;
    }
  }

  // keep the credential (encrypted) so the front desk can look it up later
  await WalkinCredential.create({ userId: user._id.toString(), password: encryptPassword(password) });

  const { password: _pw, ...safe } = user.toObject();
  return NextResponse.json({ user: safe, password }, { status: 201 });
}
