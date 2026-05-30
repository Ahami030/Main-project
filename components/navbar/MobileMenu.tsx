import Link from "next/link";
import type { Session } from "next-auth";

const adminLinks = [
  { href: "/Admin",      label: "Dashboard" },
  { href: "/Admin/rfq",  label: "จัดการ RFQ" },
  { href: "/Admin/chat", label: "แชท" },
];

const linkClass = "block px-2 py-2 text-sm text-base-content/70 hover:text-base-content rounded-md hover:bg-base-200";

interface Props {
  session: Session | null;
  latestStatus: string | null;
  onClose: () => void;
}

export default function MobileMenu({ session, latestStatus, onClose }: Props) {
  const role = (session?.user as any)?.role as string | undefined;

  return (
    <div className="md:hidden border-t border-base-300 bg-base-100 px-6 py-4 space-y-1">
      <Link href="/" className={linkClass} onClick={onClose}>Home</Link>

      {role === "user" && (
        <>
          <Link href="/Client" className={linkClass} onClick={onClose}>Dashboard</Link>
          {(latestStatus === "bargaining" || latestStatus === "confirmed") && (
            <Link href="/Client/Bargain" className={linkClass} onClick={onClose}>ต่อรองราคา</Link>
          )}
        </>
      )}

      {role === "admin" && adminLinks.map((link) => (
        <Link key={link.href} href={link.href} className={linkClass} onClick={onClose}>
          {link.label}
        </Link>
      ))}
    </div>
  );
}
