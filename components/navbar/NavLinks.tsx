import Link from "next/link";
import type { Session } from "next-auth";

const adminLinks = [
  { href: "/Admin",      label: "Dashboard" },
  { href: "/Admin/rfq",  label: "จัดการ RFQ" },
  { href: "/Admin/po",   label: "จัดการ PO" },
  { href: "/Admin/chat", label: "แชท" },
];

const linkClass = "text-sm text-base-content/70 hover:text-base-content transition-colors";

interface Props {
  session: Session | null;
  latestStatus: string | null;
}

export default function NavLinks({ session, latestStatus }: Props) {
  const role = (session?.user as any)?.role as string | undefined;

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

      {role === "admin" && adminLinks.map((link) => (
        <Link key={link.href} href={link.href} className={linkClass}>
          {link.label}
        </Link>
      ))}
    </div>
  );
}
