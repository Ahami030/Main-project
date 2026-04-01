"use client";

import Link from "next/link";
import { useState } from "react";
import { signOut, signIn } from "next-auth/react";
import type { Session } from "next-auth";

export default function Navbar({ session }: { session?: Session | null }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-white shadow-md fixed top-0 left-0 w-full z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* โลโก้ */}
          <Link href="/" className="text-2xl font-bold text-blue-600">
            MyWebsite
          </Link>

          {/* ปุ่มเปิดเมนู (มือถือ) */}
          <div className="flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-700 hover:text-blue-600 focus:outline-none"
            >
              {isOpen ? (
                // ปุ่ม X
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                // ปุ่ม ≡
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>

          {/* เมนูปกติ (desktop) */}
          <div className="hidden md:flex space-x-6 items-center">
            <Link href="/" className="text-gray-700 hover:text-blue-600">
              หน้าแรก
            </Link>
            <Link href="/Client/po" className="text-gray-700 hover:text-blue-600">
              ส่งใบคำสั่งซื้อ
            </Link>
            <Link
              href="/services"
              className="text-gray-700 hover:text-blue-600"
            >
              บริการ
            </Link>
            <Link href="/contact" className="text-gray-700 hover:text-blue-600">
              ติดต่อเรา
            </Link>

            {/* ✅ แสดงปุ่มตาม session */}
            {session ? (
              <>
                <span className="text-gray-700">
                  👤 {session.user?.name || "ผู้ใช้"}
                </span>
                <button
                  onClick={() => signOut()}
                  className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition"
                >
                  ออกจากระบบ
                </button>
              </>
            ) : (
              <button
                onClick={() => signIn()}
                className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition"
              >
                เข้าสู่ระบบ
              </button>
            )}
          </div>
        </div>
      </div>

      {/* เมนูมือถือ */}
      {isOpen && (
        <div className="md:hidden bg-white shadow-md">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              href="/"
              className="block px-3 py-2 text-gray-700 hover:text-blue-600"
              onClick={() => setIsOpen(false)}
            >
              หน้าแรก
            </Link>
            <Link
              href="/about"
              className="block px-3 py-2 text-gray-700 hover:text-blue-600"
              onClick={() => setIsOpen(false)}
            >
              เกี่ยวกับเรา
            </Link>
            <Link
              href="/services"
              className="block px-3 py-2 text-gray-700 hover:text-blue-600"
              onClick={() => setIsOpen(false)}
            >
              บริการ
            </Link>
            <Link
              href="/contact"
              className="block px-3 py-2 text-gray-700 hover:text-blue-600"
              onClick={() => setIsOpen(false)}
            >
              ติดต่อเรา
            </Link>

            {/* ✅ ปุ่ม login/logout ในมือถือ */}
            {session ? (
              <div
                onClick={() => {
                  signOut();
                  setIsOpen(false);
                }}
                className="block px-3 py-2 text-gray-700 hover:text-blue-600 cursor-pointer"
              >
                ออกจากระบบ
              </div>
            ) : (
              <div
                onClick={() => {
                  signIn();
                  setIsOpen(false);
                }}
                className="block px-3 py-2 text-gray-700 hover:text-blue-600 cursor-pointer"
              >
                เข้าสู่ระบบ
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
