import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const { pathname } = req.nextUrl;

  // 🛑 ถ้ายังไม่ login และพยายามเข้า dashboard หรือ admin
  if (!token && (pathname.startsWith("/dashboard") || pathname.startsWith("/admin"))) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 🛑 ถ้า login แล้ว แต่พยายามเข้า login page
  if (token && pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // 🛑 ถ้าเข้า admin แต่ไม่ใช่ admin role
  if (token && pathname.startsWith("/admin") && token.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/login",
  ],
};
