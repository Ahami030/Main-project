"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type LoadStatus = "loading" | "ready" | "error";
type SaveStatus = "idle" | "saving" | "success" | "error";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs tracking-widest uppercase text-primary/60 font-medium mb-2">
      {children}
    </p>
  );
}

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");

  // ข้อมูลองค์กร
  const [organizationName, setOrganizationName] = useState("");
  const [taxId, setTaxId] = useState("");

  // ข้อมูลติดต่อ
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [lineId, setLineId] = useState("");

  // ที่อยู่
  const [billingAddress, setBillingAddress] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/Login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const load = async () => {
      try {
        const res = await fetch("/api/user/profile");
        if (!res.ok) throw new Error();
        const data = await res.json();
        setOrganizationName(data.organizationName ?? "");
        setTaxId(data.taxId ?? "");
        setName(data.name ?? "");
        setPhone(data.phone ?? "");
        setEmail(data.email ?? "");
        setLineId(data.lineId ?? "");
        setBillingAddress(data.billingAddress ?? "");
        setShippingAddress(data.shippingAddress ?? "");
        setLoadStatus("ready");
      } catch {
        setLoadStatus("error");
      }
    };
    load();
  }, [status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus("saving");
    setErrorMsg("");

    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          organizationName,
          taxId,
          phone,
          lineId,
          billingAddress,
          shippingAddress,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message ?? "บันทึกข้อมูลไม่สำเร็จ");
      }

      await update({ name });
      setSaveStatus("success");
    } catch (err) {
      setSaveStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "เกิดข้อผิดพลาด กรุณาลองใหม่");
    }
  };

  if (status === "loading" || loadStatus === "loading") {
    return (
      <main className="min-h-screen bg-base-200 flex items-center justify-center p-6">
        <span className="loading loading-spinner loading-lg text-primary" />
      </main>
    );
  }

  if (!session) return null;

  return (
    <main className="min-h-screen bg-base-200 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-base-100 rounded-box shadow border border-base-300 p-6 md:p-8">

        {/* Header */}
        <header className="mb-6 text-center">
          <div className="mx-auto h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-content font-bold text-lg">
            {name?.charAt(0) || "U"}
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-base-content">ข้อมูลโปรไฟล์</h1>
          <p className="mt-1 text-sm text-base-content/60">แก้ไขข้อมูลพื้นฐานของคุณ</p>
        </header>

        {loadStatus === "error" ? (
          <div className="alert alert-error text-sm py-2.5">
            ไม่สามารถโหลดข้อมูลโปรไฟล์ได้ กรุณาลองใหม่
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">

            {/* Success / Error */}
            {saveStatus === "success" && (
              <div className="alert alert-success text-sm py-2.5">
                บันทึกข้อมูลสำเร็จ
              </div>
            )}
            {saveStatus === "error" && (
              <div className="alert alert-error text-sm py-2.5">
                {errorMsg}
              </div>
            )}

            {/* ─── ข้อมูลองค์กร ─────────────────────────────────────── */}
            <section>
              <SectionTitle>ข้อมูลองค์กร</SectionTitle>
              <div className="grid sm:grid-cols-2 gap-4">

                {/* Organization name */}
                <div className="sm:col-span-2">
                  <label className="label pb-1">
                    <span className="label-text font-medium">ชื่อบริษัท / โรงเรียน</span>
                  </label>
                  <label className="input input-bordered w-full flex items-center gap-2">
                    <svg className="w-4 h-4 text-base-content/40 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M3 21h18M5 21V7l7-4 7 4v14M9 9.5h1m4 0h1M9 13h1m4 0h1M9 16.5h1m4 0h1" />
                    </svg>
                    <input
                      type="text"
                      placeholder="เช่น บริษัท ... จำกัด หรือ โรงเรียน..."
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      className="grow"
                    />
                  </label>
                </div>

                {/* Tax ID */}
                <div className="sm:col-span-2">
                  <label className="label pb-1">
                    <span className="label-text font-medium">เลขประจำตัวผู้เสียภาษี</span>
                  </label>
                  <label className="input input-bordered w-full flex items-center gap-2">
                    <svg className="w-4 h-4 text-base-content/40 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 12h6m-6 4h6M9 8h6M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="เลข 13 หลัก"
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value)}
                      className="grow"
                    />
                  </label>
                </div>
              </div>
            </section>

            {/* ─── ข้อมูลติดต่อ ─────────────────────────────────────── */}
            <section>
              <SectionTitle>ข้อมูลติดต่อ</SectionTitle>
              <div className="grid sm:grid-cols-2 gap-4">

                {/* Contact name */}
                <div className="sm:col-span-2">
                  <label className="label pb-1">
                    <span className="label-text font-medium">ชื่อผู้ประสานงาน</span>
                  </label>
                  <label className="input input-bordered w-full flex items-center gap-2">
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

                {/* Phone */}
                <div>
                  <label className="label pb-1">
                    <span className="label-text font-medium">เบอร์โทร</span>
                  </label>
                  <label className="input input-bordered w-full flex items-center gap-2">
                    <svg className="w-4 h-4 text-base-content/40 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M3 5a2 2 0 012-2h2.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <input
                      type="tel"
                      placeholder="08x-xxx-xxxx"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="grow"
                      autoComplete="tel"
                    />
                  </label>
                </div>

                {/* Line ID */}
                <div>
                  <label className="label pb-1">
                    <span className="label-text font-medium">Line ID (ถ้ามี)</span>
                  </label>
                  <label className="input input-bordered w-full flex items-center gap-2">
                    <svg className="w-4 h-4 text-base-content/40 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Line ID"
                      value={lineId}
                      onChange={(e) => setLineId(e.target.value)}
                      className="grow"
                    />
                  </label>
                </div>

                {/* Email (read-only) */}
                <div className="sm:col-span-2">
                  <label className="label pb-1">
                    <span className="label-text font-medium">Email</span>
                  </label>
                  <label className="input input-bordered w-full flex items-center gap-2 opacity-60">
                    <svg className="w-4 h-4 text-base-content/40 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                    <input
                      type="email"
                      value={email}
                      className="grow"
                      disabled
                    />
                  </label>
                </div>
              </div>
            </section>

            {/* ─── ที่อยู่ ───────────────────────────────────────────── */}
            <section>
              <SectionTitle>ที่อยู่</SectionTitle>
              <div className="grid sm:grid-cols-2 gap-4">

                {/* Billing address */}
                <div>
                  <label className="label pb-1">
                    <span className="label-text font-medium">ที่อยู่สำหรับออกเอกสาร</span>
                  </label>
                  <textarea
                    placeholder="ที่อยู่สำหรับออกใบเสนอราคา / ใบกำกับภาษี"
                    value={billingAddress}
                    onChange={(e) => setBillingAddress(e.target.value)}
                    className="textarea textarea-bordered w-full"
                    rows={3}
                  />
                </div>

                {/* Shipping address */}
                <div>
                  <label className="label pb-1">
                    <span className="label-text font-medium">ที่อยู่จัดส่ง</span>
                  </label>
                  <textarea
                    placeholder="ที่อยู่สำหรับจัดส่งสินค้า"
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    className="textarea textarea-bordered w-full"
                    rows={3}
                  />
                </div>
              </div>
            </section>

            {/* Submit */}
            <button
              type="submit"
              disabled={!name.trim() || saveStatus === "saving"}
              className="btn btn-primary w-full"
            >
              {saveStatus === "saving" ? (
                <>
                  <span className="loading loading-spinner loading-sm" />
                  กำลังบันทึก...
                </>
              ) : "บันทึกข้อมูล"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
