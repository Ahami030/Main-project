import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import ShortcutChat from '@/components/admin/ShortcutChat';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session: any = await getServerSession(authOptions as any);

  const role = session?.user?.role;
  if (!session || (role !== "admin" && role !== "employee")) {
    redirect("/Login");
  }

  return (
    <>
      {children}
      <ShortcutChat />
    </>
  );
}
