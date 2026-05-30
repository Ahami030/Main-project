import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    if (pathname.startsWith("/Admin") && token?.role !== "admin") {
      return NextResponse.redirect(new URL("/Login", req.url));
    }

    if (pathname.startsWith("/Client") && token?.role === "admin") {
      return NextResponse.redirect(new URL("/Admin", req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/Admin/:path*", "/Client/:path*"],
};
