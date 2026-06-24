"use client";

import React, { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [exiting, setExiting] = useState(false);

  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordIsValid = password.length >= 6;
  const formIsValid = emailIsValid && passwordIsValid && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!formIsValid) {
      setErrorMessage("กรุณากรอก email และ password ให้ถูกต้อง");
      return;
    }

    setLoading(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
        callbackUrl: "/Client",
      });

      if (res?.error) {
        setErrorMessage("Email หรือ Password ไม่ถูกต้อง");
        setLoading(false);
      } else {
        const session = await getSession();
        const role = (session?.user as any)?.role;
        setExiting(true);
        setTimeout(() => router.replace(role === 'admin' ? '/Admin' : '/Client'), 50);
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("เกิดข้อผิดพลาด กรุณาลองใหม่");
      setLoading(false);
    }
  };

  return (
    <>
    {/* Exit overlay — covers navbar + page during navigation */}
    <div
      className={`fixed inset-0 z-9999 bg-base-200 transition-opacity duration-300 pointer-events-none ${
        exiting ? 'opacity-100' : 'opacity-0'
      }`}
    />
    <main className="min-h-screen bg-base-200 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-base-100 rounded-box shadow border border-base-300 p-6 min-h-125">

        <header className="mb-6 text-center">
          <div className="mx-auto h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-content font-bold">
            A
          </div>

          <h1 className="mt-4 text-2xl font-semibold text-base-content">
            Sign in to your account
          </h1>

          <p className="mt-1 text-sm opacity-70">
            Enter your credentials to continue
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">

          {errorMessage && (
            <div className="alert alert-error text-sm">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="label">
              <span className="label-text">Email</span>
            </label>
            <label className="input input-bordered w-full">
              <input
                type="email"
                value={email}
                placeholder="you@example.com"
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
          </div>

          <div>
            <label className="label">
              <span className="label-text">Password</span>
            </label>
            <label className="input input-bordered w-full relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="btn btn-ghost btn-sm absolute right-1"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <label className="label cursor-pointer gap-2">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="checkbox checkbox-primary"
              />
              <span className="label-text">Remember me</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={!formIsValid}
            className="btn btn-primary w-full"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

        </form>

        {/* Divider */}
        <div className="divider text-xs text-base-content/30 my-5">หรือ</div>

        {/* Link to Register */}
        <p className="text-center text-sm text-base-content/60">
          ยังไม่มีบัญชี?{' '}
          <Link href="/register" className="text-primary font-semibold hover:underline">
            สมัครสมาชิก
          </Link>
        </p>

      </div>
    </main>
    </>
  );
}
