import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import ShortcutChat from '@/components/admin/ShortcutChat';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions as any);

  if (!session || (session.user as any)?.role !== "admin") {
    redirect("/Login");
  }

  return (
    <>
      {children}
      <div className="lg:hidden">
        <ShortcutChat />
      </div>
    </>
  );
}
