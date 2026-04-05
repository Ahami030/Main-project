"use client";

import React, { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import ThemeSwitcher from "@/components/ThemeSwitcher";

export default function Navbar() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="w-full border-b border-base-300 bg-base-100">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* LOGO */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-primary text-primary-content flex items-center justify-center font-semibold">
            A
          </div>
          <span className="text-lg font-semibold text-base-content">
            My Tailwind Page
          </span>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-4">

          {/* MENU DESKTOP test link*/}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="text-sm text-base-content/70 hover:text-base-content"
            >
              Home
            </Link>
            <Link
              href="/Client"
              className="text-sm text-base-content/70 hover:text-base-content"
            >
              Client
            </Link>
            <Link
              href="/Client/quotation"
              className="text-sm text-base-content/70 hover:text-base-content"
            >
              Quotation
            </Link>
            <Link
              href="/Login"
              className="text-sm text-base-content/70 hover:text-base-content"
            >
              Login
            </Link>

            {/* page navigation */}
            <div className="dropdown">
              <div tabIndex={0} role="button" className="btn m-1">
                Page Navigation
              </div>

              <ul
                tabIndex={0}
                className="dropdown-content menu bg-base-100 rounded-box z-50 w-52 p-2 shadow"
              >
                <li>
                  <Link
                    href="/Login"
                    className="text-sm text-base-content/70 hover:text-base-content"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="text-sm text-base-content/70 hover:text-base-content"
                  >
                    Register
                  </Link>
                </li>

                <li>
                  <Link
                    href="/Client"
                    className="text-sm text-base-content/70 hover:text-base-content"
                  >
                    Client
                  </Link>
                </li>
                <li>
                  <Link
                    href="/Client/quotation"
                    className="text-sm text-base-content/70 hover:text-base-content"
                  >
                    Quotation
                  </Link>
                </li>
                <li>
                  <Link
                    href="/Client/Bargain"
                    className="text-sm text-base-content/70 hover:text-base-content"
                  >
                    ต่อรองราคา
                  </Link>
                </li>
                <li>
                  <Link
                    href="/Client/pdf"
                    className="text-sm text-base-content/70 hover:text-base-content"
                  >
                    pdf
                  </Link>
                </li>
                <li>
                  <Link
                    href="/Client/sendpdf"
                    className="text-sm text-base-content/70 hover:text-base-content"
                  >
                    ส่ง PDF
                  </Link>
                </li>

              </ul>
            </div>


          </div>

          {/* THEME SWITCHER */}
          <ThemeSwitcher />

          {/* LOADING */}
          {status === "loading" && (
            <span className="text-sm text-base-content/60">
              Loading...
            </span>
          )}

          {/* NOT LOGIN */}
          {!session && status !== "loading" && (
            <Link
              href="/api/auth/signin"
              className="btn btn-primary btn-sm"
            >
              Sign in
            </Link>
          )}

          {/* LOGIN */}
          {session && (
            <div className="dropdown dropdown-end">

              {/* Trigger */}
              <label
                tabIndex={0}
                className="btn btn-ghost btn-circle avatar"
              >
                {session.user?.image ? (
                  <div className="w-10 rounded-full">
                    <img
                      src={session.user.image}
                      alt="user"
                    />
                  </div>
                ) : (
                  <div className="w-10 rounded-full bg-primary text-primary-content flex items-center justify-center font-semibold">
                    {session.user?.name?.charAt(0)}
                  </div>
                )}
              </label>

              {/* Dropdown Content */}
              <ul
                tabIndex={0}
                className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52"
              >
                <li className="menu-title text-xs opacity-60">
                  {session.user?.email}
                </li>

                <li>
                  <Link href="/profile">
                    Profile
                  </Link>
                </li>

                <li>
                  <button
                    onClick={() => signOut()}
                    className="text-error"
                  >
                    Logout
                  </button>
                </li>
              </ul>

            </div>
          )}


          {/* MOBILE BUTTON */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden btn btn-ghost btn-sm"
          >
            ☰
          </button>
        </div>
      </div>

      {/* MOBILE MENU */}
      {mobileOpen && (
        <div className="md:hidden border-t border-base-300 bg-base-100 px-6 py-4 space-y-3">
          <Link href="/" className="block text-base-content">
            Home
          </Link>
          <Link href="/about" className="block text-base-content">
            About
          </Link>
          <Link href="/contact" className="block text-base-content">
            Contact
          </Link>
        </div>
      )}
    </nav>
  );
}
