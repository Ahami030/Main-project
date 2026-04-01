import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const session = await getServerSession(authOptions as any);

  // ✅ ถ้า login แล้ว → redirect ทันที (ไม่มี flash)
  if (session) {
    redirect("/Client");
  }

  return <LoginForm />;
}
