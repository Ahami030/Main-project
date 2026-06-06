import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { AuthOptions } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@/lib/mongo";
import ArchivedBilling from "@/app/models/ArchivedBilling";

export async function GET() {
  const session = await getServerSession(authOptions as AuthOptions);
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if ((session.user as { role?: string }).role !== "admin")
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  await connectMongoDB();
  const billings = await ArchivedBilling.find().sort({ archivedAt: -1 }).lean();
  return NextResponse.json(billings);
}
