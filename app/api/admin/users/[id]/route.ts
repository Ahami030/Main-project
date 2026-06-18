import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getUser } from "@/lib/apiAuth";
import { connectMongoDB } from "@/lib/mongo";
import User from "@/app/models/User";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const sessionOrRes = await requireAdmin();
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;
  const session = sessionOrRes;

  try {
    const { id } = await params;
    const adminId = getUser(session).id;
    const { role, permissions } = await req.json();

    await connectMongoDB();
    const user = await User.findById(id);
    if (!user) return NextResponse.json({ message: "Not found" }, { status: 404 });

    if (id === adminId && role && role !== "admin") {
      return NextResponse.json({ message: "ไม่สามารถเปลี่ยน role ของตัวเองได้" }, { status: 400 });
    }

    if (role !== undefined) user.role = role;
    if (permissions !== undefined) user.permissions = permissions;
    await user.save();

    const updated = await User.findById(id, { password: 0 }).lean();
    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH /api/admin/users/[id]:", err);
    return NextResponse.json({ message: "เกิดข้อผิดพลาดภายในระบบ" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const sessionOrRes = await requireAdmin();
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;
  const session = sessionOrRes;

  try {
    const { id } = await params;
    const adminId = getUser(session).id;

    if (id === adminId) {
      return NextResponse.json({ message: "ไม่สามารถลบบัญชีของตัวเองได้" }, { status: 400 });
    }

    await connectMongoDB();
    const user = await User.findByIdAndDelete(id);
    if (!user) return NextResponse.json({ message: "Not found" }, { status: 404 });

    return NextResponse.json({ message: "Deleted" });
  } catch (err) {
    console.error("DELETE /api/admin/users/[id]:", err);
    return NextResponse.json({ message: "เกิดข้อผิดพลาดภายในระบบ" }, { status: 500 });
  }
}
