import Link from "next/link";
import type { Session } from "next-auth";

const adminLinks = [
  { href: "/Admin",          label: "Dashboard",   module: null },
  { href: "/Admin/rfq",      label: "จัดการ RFQ",  module: "quotation" },
  { href: "/Admin/po",       label: "จัดการ PO",   module: "po" },
  { href: "/Admin/billing",  label: "Billing",     module: "billing" },
  { href: "/Admin/payments", label: "Payment",     module: "payments" },
  { href: "/Admin/chat",     label: "แชท",         module: "chat" },
  { href: "/Admin/users",    label: "จัดการ User", module: "admin_only" },
];

function canAccess(module: string | null, role: string, permissions: string[]): boolean {
  if (!module || role === "admin") return true;
  if (module === "admin_only") return false; // admin-only links hidden from employee
  if (module === "chat") return true;        // chat default ทุก employee
  return permissions.includes(module);
}

const linkClass = "text-sm text-base-content/70 hover:text-base-content transition-colors";

interface Props {
  session: Session | null;
  latestStatus: string | null;
}

export default function NavLinks({ session, latestStatus }: Props) {
  const role = (session?.user as any)?.role as string | undefined;
  const permissions = ((session?.user as any)?.permissions ?? []) as string[];

  return (
    <div className="hidden md:flex items-center gap-6">
      <Link href="/" className={linkClass}>Home</Link>

      {role === "user" && (
        <>
          <Link href="/Client" className={linkClass}>Dashboard</Link>
          <Link href="/Client/po" className={linkClass}>ใบสั่งซื้อ</Link>
          {(latestStatus === "bargaining" || latestStatus === "confirmed") && (
            <Link href="/Client/Bargain" className={linkClass}>ต่อรองราคา</Link>
          )}
        </>
      )}

      {(role === "admin" || role === "employee") &&
        adminLinks
          .filter((l) => canAccess(l.module, role, permissions))
          .map((link) => (
            <Link key={link.href} href={link.href} className={linkClass}>
              {link.label}
            </Link>
          ))}
    </div>
  );
}
