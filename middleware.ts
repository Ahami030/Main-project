import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    const isStaff = token?.role === "admin" || token?.role === "employee";

    if (pathname.startsWith("/Admin") && !isStaff) {
      return NextResponse.redirect(new URL("/Login", req.url));
    }

    if (pathname.startsWith("/Client") && isStaff) {
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
  matcher: ["/Admin/:path*", "/Client/:path*", "/profile/:path*"],
};
