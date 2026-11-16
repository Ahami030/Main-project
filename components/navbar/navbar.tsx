"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import NavLinks from "./NavLinks";
import UserMenu from "./UserMenu";
import MobileMenu from "./MobileMenu";

export default function Navbar() {
  const { data: session, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [latestStatus, setLatestStatus] = useState<string | null>(null);
  const [showChecklist, setShowChecklist] = useState(false);

  const role = (session?.user as any)?.role as string | undefined;

  useEffect(() => {
    setShowChecklist(localStorage.getItem("checklist_destroyed") !== "1");
  }, []);

  useEffect(() => {
    if (role !== "user") return;
    fetch("/api/quotation")
      .then((r) => r.json())
      .then((data) => {
        const quotations: { status: string }[] = data.quotations ?? [];
        if (quotations.length > 0) setLatestStatus(quotations[0].status);
      })
      .catch(() => {});
  }, [role]);

  return (
    <nav className="w-full border-b border-base-300 bg-base-100 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 min-h-16 flex items-center justify-between gap-2">

        {/* LOGO */}
        <Link href="/" className="flex items-center gap-3 shrink-0 min-w-0">
          <div className="h-10 w-10 rounded-md bg-primary text-primary-content flex items-center justify-center font-semibold shrink-0">
            A
          </div>
          <span className="text-lg font-semibold text-base-content truncate hidden sm:inline">
            My Tailwind Page
          </span>
        </Link>

        {/* RIGHT */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <NavLinks session={session ?? null} latestStatus={latestStatus} />
          {/* checklist + theme move into the mobile menu on small screens */}
          {showChecklist && (
            <Link href="/checklist" className="hidden lg:inline-block text-xs px-2.5 py-1 rounded-md bg-orange-100 text-orange-600 hover:bg-orange-200 transition-colors font-mono">
              📋 checklist
            </Link>
          )}
          <div className="hidden lg:block">
            <ThemeSwitcher />
          </div>
          <UserMenu session={session ?? null} status={status} />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden btn btn-ghost btn-sm"
            aria-label="เมนู"
          >
            ☰
          </button>
        </div>

      </div>

      {mobileOpen && (
        <MobileMenu
          session={session ?? null}
          latestStatus={latestStatus}
          onClose={() => setMobileOpen(false)}
        />
      )}
    </nav>
  );
}
