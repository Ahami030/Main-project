import { getServerSession, type Session } from "next-auth";
import type { AuthOptions } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export type SessionUser = {
  id?: string;
  role?: string;
  name?: string;
  email?: string;
  permissions?: string[];
};

export function getUser(session: Session): SessionUser {
  return session.user as SessionUser;
}

export async function requireSession(): Promise<Session | NextResponse> {
  const session = await getServerSession(authOptions as AuthOptions);
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  return session;
}

export async function requireAdmin(): Promise<Session | NextResponse> {
  const s = await requireSession();
  if (s instanceof NextResponse) return s;
  if ((s.user as SessionUser).role !== "admin")
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  return s;
}

export async function requireEmployee(module: string): Promise<Session | NextResponse> {
  const s = await requireSession();
  if (s instanceof NextResponse) return s;
  const user = getUser(s);
  if (user.role === "admin") return s;
  if (user.role !== "employee")
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  if (module === "chat") return s; // chat เป็น default ทุก employee
  if (!user.permissions?.includes(module))
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  return s;
}

export function buildUserQuery(
  session: Session,
  field = "userId"
): Record<string, unknown> {
  const user = getUser(session);
  return user.role === "admin" || user.role === "employee" ? {} : { [field]: user.id };
}
