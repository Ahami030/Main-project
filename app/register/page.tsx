"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 6;
  const confirmValid = password === confirmPassword && confirmPassword.length > 0;
  const formValid = name.trim().length > 0 && emailValid && passwordValid && confirmValid && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formValid) return;
    setLoading(true);

    try {
      // Check if email already exists
      const checkRes = await fetch("/api/checkUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const { user } = await checkRes.json();
      if (user) {
        setError("อีเมลนี้ถูกใช้งานแล้ว");
        setLoading(false);
        return;
      }

      // Register
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.replace("/Login"), 2000);
      } else {
        setError("ไม่สามารถสมัครสมาชิกได้ กรุณาลองใหม่");
      }
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  };

  // ── Password strength ──
  const strength = password.length === 0 ? 0
    : password.length < 6 ? 1
    : password.length < 10 ? 2
    : 3;
  const strengthLabel = ['', 'อ่อน', 'ปานกลาง', 'แข็งแกร่ง'][strength];
  const strengthColor = ['', 'bg-error', 'bg-warning', 'bg-success'][strength];

  if (success) {
    return (
      <main className="min-h-screen bg-base-200 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-base-100 rounded-box shadow border border-base-300 p-8 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center">
            <svg className="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-base-content">สมัครสมาชิกสำเร็จ!</h2>
          <p className="text-sm text-base-content/60">กำลังพาคุณไปหน้า Login...</p>
          <span className="loading loading-dots loading-md text-primary" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-base-200 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-base-100 rounded-box shadow border border-base-300 p-6">

        {/* Header */}
        <header className="mb-6 text-center">
          <div className="mx-auto h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-content font-bold text-lg">
            A
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-base-content">สร้างบัญชีใหม่</h1>
          <p className="mt-1 text-sm text-base-content/60">กรอกข้อมูลเพื่อสมัครสมาชิก</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Error */}
          {error && (
            <div className="alert alert-error text-sm py-2.5">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="label pb-1">
              <span className="label-text font-medium">ชื่อ</span>
            </label>
            <label className={`input input-bordered w-full flex items-center gap-2 ${name && name.trim().length === 0 ? 'input-error' : ''}`}>
              <svg className="w-4 h-4 text-base-content/40 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <input
                type="text"
                placeholder="ชื่อ-นามสกุล"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="grow"
                autoComplete="name"
              />
            </label>
          </div>

          {/* Email */}
          <div>
            <label className="label pb-1">
              <span className="label-text font-medium">Email</span>
            </label>
            <label className={`input input-bordered w-full flex items-center gap-2 ${email && !emailValid ? 'input-error' : ''}`}>
              <svg className="w-4 h-4 text-base-content/40 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
              </svg>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="grow"
                autoComplete="email"
              />
            </label>
            {email && !emailValid && (
              <p className="text-[11px] text-error mt-1 pl-1">รูปแบบ email ไม่ถูกต้อง</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="label pb-1">
              <span className="label-text font-medium">Password</span>
            </label>
            <label className="input input-bordered w-full flex items-center gap-2">
              <svg className="w-4 h-4 text-base-content/40 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="อย่างน้อย 6 ตัวอักษร"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="grow"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-base-content/40 hover:text-base-content/70 transition-colors"
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </label>

            {/* Strength bar */}
            {password.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all ${i <= strength ? strengthColor : 'bg-base-300'}`}
                    />
                  ))}
                </div>
                <p className={`text-[11px] pl-0.5 ${['', 'text-error', 'text-warning', 'text-success'][strength]}`}>
                  ความปลอดภัย: {strengthLabel}
                </p>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="label pb-1">
              <span className="label-text font-medium">ยืนยัน Password</span>
            </label>
            <label className={`input input-bordered w-full flex items-center gap-2 ${confirmPassword && !confirmValid ? 'input-error' : confirmValid ? 'input-success' : ''}`}>
              <svg className="w-4 h-4 text-base-content/40 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <input
                type={showConfirm ? "text" : "password"}
                placeholder="พิมพ์รหัสผ่านอีกครั้ง"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="grow"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="text-base-content/40 hover:text-base-content/70 transition-colors"
              >
                {showConfirm ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </label>
            {confirmPassword && !confirmValid && (
              <p className="text-[11px] text-error mt-1 pl-1">รหัสผ่านไม่ตรงกัน</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!formValid}
            className="btn btn-primary w-full mt-2"
          >
            {loading ? (
              <>
                <span className="loading loading-spinner loading-sm" />
                กำลังสมัคร...
              </>
            ) : 'สมัครสมาชิก'}
          </button>
        </form>

        {/* Divider */}
        <div className="divider text-xs text-base-content/30 my-5">หรือ</div>

        {/* Link to Login */}
        <p className="text-center text-sm text-base-content/60">
          มีบัญชีอยู่แล้ว?{' '}
          <Link href="/Login" className="text-primary font-semibold hover:underline">
            เข้าสู่ระบบ
          </Link>
        </p>
      </div>
    </main>
  );
}
