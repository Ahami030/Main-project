"use client";
import Link from "next/link";
import { useState } from "react";

function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match");
      return;
    }
    if (!name || !email || !password) {
      setErrorMessage("All fields are required");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const resCheckuser = await fetch("http://localhost:3000/api/checkUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const { user } = await resCheckuser.json();

      if (user) {
        setErrorMessage("Email already exists");
        setIsLoading(false);
        return;
      }

      const res = await fetch("http://localhost:3000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (res.ok) {
        const form = e.target as HTMLFormElement;
        setErrorMessage("");
        setSuccessMessage("Registration successful! Welcome aboard 🎉");
        form.reset();
      } else {
        setErrorMessage("Registration failed. Please try again.");
      }
    } catch (error) {
      console.error("Error during registration:", error);
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Card หลัก */}
        <div className="card bg-base-100 shadow-2xl border border-base-300">
          <div className="card-body p-8">

            {/* Header */}
            <div className="text-center mb-6">
              <div className="avatar placeholder mb-3">
                <div className="bg-primary text-primary-content rounded-full w-14">
                  <span className="text-2xl">✦</span>
                </div>
              </div>
              <h1 className="text-3xl font-bold text-base-content tracking-tight">
                สร้างบัญชีใหม่
              </h1>
              <p className="text-base-content/50 text-sm mt-1">
                Create your account to get started
              </p>
            </div>

            {/* Alerts */}
            {errorMessage && (
              <div role="alert" className="alert alert-error mb-4 py-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div role="alert" className="alert alert-success mb-4 py-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">{successMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Name */}
              <div className="form-control">
                <label className="label pb-1">
                  <span className="label-text font-medium text-base-content">
                    ชื่อ-นามสกุล
                  </span>
                </label>
                <label className="input input-bordered flex items-center gap-2 focus-within:input-primary transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-base-content/40 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                  <input
                    type="text"
                    placeholder="กรอกชื่อของคุณ"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="grow bg-transparent outline-none text-sm"
                  />
                </label>
              </div>

              {/* Email */}
              <div className="form-control">
                <label className="label pb-1">
                  <span className="label-text font-medium text-base-content">
                    อีเมล
                  </span>
                </label>
                <label className="input input-bordered flex items-center gap-2 focus-within:input-primary transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-base-content/40 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  <input
                    type="email"
                    placeholder="example@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="grow bg-transparent outline-none text-sm"
                  />
                </label>
              </div>

              {/* Password */}
              <div className="form-control">
                <label className="label pb-1">
                  <span className="label-text font-medium text-base-content">
                    รหัสผ่าน
                  </span>
                </label>
                <label className="input input-bordered flex items-center gap-2 focus-within:input-primary transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-base-content/40 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  <input
                    type="password"
                    placeholder="อย่างน้อย 8 ตัวอักษร"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="grow bg-transparent outline-none text-sm"
                  />
                </label>
              </div>

              {/* Confirm Password */}
              <div className="form-control">
                <label className="label pb-1">
                  <span className="label-text font-medium text-base-content">
                    ยืนยันรหัสผ่าน
                  </span>
                </label>
                <label className="input input-bordered flex items-center gap-2 focus-within:input-primary transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-base-content/40 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <input
                    type="password"
                    placeholder="กรอกรหัสผ่านอีกครั้ง"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="grow bg-transparent outline-none text-sm"
                  />
                </label>
              </div>

              {/* Submit Button */}
              <div className="form-control mt-6">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn btn-primary w-full"
                >
                  {isLoading ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      กำลังสมัครสมาชิก...
                    </>
                  ) : (
                    "สมัครสมาชิก"
                  )}
                </button>
              </div>
            </form>

            {/* Divider */}
            <div className="divider text-base-content/30 text-xs my-4">
              มีบัญชีอยู่แล้ว?
            </div>

            {/* Login Link */}
            <Link href="/Login" className="btn btn-outline btn-neutral w-full">
              เข้าสู่ระบบ
            </Link>

          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-base-content/30 mt-5">
          By registering, you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;