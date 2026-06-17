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
  if (module === "admin_only") return false;
  if (module === "chat") return true;
  return permissions.includes(module);
}

const linkClass = "block px-2 py-2 text-sm text-base-content/70 hover:text-base-content rounded-md hover:bg-base-200";

interface Props {
  session: Session | null;
  latestStatus: string | null;
  onClose: () => void;
}

export default function MobileMenu({ session, latestStatus, onClose }: Props) {
  const role = (session?.user as any)?.role as string | undefined;
  const permissions = ((session?.user as any)?.permissions ?? []) as string[];

  return (
    <div className="md:hidden border-t border-base-300 bg-base-100 px-6 py-4 space-y-1">
      <Link href="/" className={linkClass} onClick={onClose}>Home</Link>

      {role === "user" && (
        <>
          <Link href="/Client" className={linkClass} onClick={onClose}>Dashboard</Link>
          <Link href="/Client/po" className={linkClass} onClick={onClose}>ใบสั่งซื้อ</Link>
          {(latestStatus === "bargaining" || latestStatus === "confirmed") && (
            <Link href="/Client/Bargain" className={linkClass} onClick={onClose}>ต่อรองราคา</Link>
          )}
        </>
      )}

      {(role === "admin" || role === "employee") &&
        adminLinks
          .filter((l) => canAccess(l.module, role, permissions))
          .map((link) => (
            <Link key={link.href} href={link.href} className={linkClass} onClick={onClose}>
              {link.label}
            </Link>
          ))}
    </div>
  );
}
