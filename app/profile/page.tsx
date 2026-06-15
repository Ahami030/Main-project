"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import ThaiAddressField from "@/components/ThaiAddressField";
import { type AddressValue, EMPTY_ADDRESS, formatAddress, parseAddress } from "@/lib/thaiAddress";

type LoadStatus = "loading" | "ready" | "error";
type SaveStatus = "idle" | "saving" | "success" | "error";

// ─── Section card with eyebrow header ──────────────────────────────────────────
function Section({ icon, eyebrow, title, desc, children }: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  desc?: string;
  children: ReactNode;
}) {
  return (
    <section className="card bg-base-100 border border-base-300/70 rounded-[2rem] shadow-mc-sm">
      <div className="card-body p-6 md:p-7 gap-5">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-base-content/45">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              {eyebrow}
            </p>
            <h2 className="font-medium text-lg tracking-mc leading-tight">{title}</h2>
            {desc && <p className="text-xs text-base-content/45 mt-0.5">{desc}</p>}
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}

// ─── Labelled input with leading icon ──────────────────────────────────────────
function Field({ label, icon, children }: { label: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-base-content/70 mb-1.5">{label}</label>
      <label className="input input-bordered rounded-xl w-full flex items-center gap-2.5">
        {icon}
        {children}
      </label>
    </div>
  );
}

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");

  // ── Theme: follow the global picker, default to Mastercard ──────────────────
  const [theme, setTheme] = useState("mastercard");
  useEffect(() => {
    const pick = () => setTheme(localStorage.getItem("theme") || "mastercard");
    pick();
    const obs = new MutationObserver(pick);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  // ข้อมูลองค์กร
  const [organizationName, setOrganizationName] = useState("");
  const [taxId, setTaxId] = useState("");

  // ข้อมูลติดต่อ
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [lineId, setLineId] = useState("");

  // ที่อยู่ — แยกเป็น "รายละเอียด" (บ้านเลขที่/ถนน) + ตัวเลือกที่อยู่ (จังหวัด→ตำบล→ไปรษณีย์)
  const [billingLine, setBillingLine]   = useState("");
  const [billingGeo, setBillingGeo]     = useState<AddressValue>({ ...EMPTY_ADDRESS });
  const [shippingLine, setShippingLine] = useState("");
  const [shippingGeo, setShippingGeo]   = useState<AddressValue>({ ...EMPTY_ADDRESS });

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
        const b = parseAddress(data.billingAddress ?? "");
        setBillingLine(b.line);
        setBillingGeo(b.value);
        const s = parseAddress(data.shippingAddress ?? "");
        setShippingLine(s.line);
        setShippingGeo(s.value);
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

    const billingAddress  = [billingLine.trim(), formatAddress(billingGeo)].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
    const shippingAddress = [shippingLine.trim(), formatAddress(shippingGeo)].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();

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
      <main data-theme={theme} className="font-mc min-h-screen bg-base-200 flex items-center justify-center p-6">
        <span className="loading loading-spinner loading-lg text-primary" />
      </main>
    );
  }

  if (!session) return null;

  const iconCls = "w-4 h-4 text-base-content/40 shrink-0";

  return (
    <main data-theme={theme} className="font-mc relative min-h-screen bg-base-200 text-base-content overflow-hidden">

      {/* ── Decorative orbital rings ─────────────────────────────────────── */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-[30rem] -right-[18rem] w-[58rem] h-[58rem] rounded-full border border-accent/15" />
        <div className="absolute -bottom-[34rem] -left-[20rem] w-[58rem] h-[58rem] rounded-full border border-secondary/12" />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 md:px-8 py-8 md:py-12 pb-16 space-y-5">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="card bg-base-100 border border-base-300/70 rounded-[2.5rem] shadow-mc">
          <div className="card-body p-6 md:p-7 flex-row items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-primary text-primary-content font-medium text-2xl tracking-mc flex items-center justify-center shrink-0">
              {name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-base-content/50 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                บัญชีของฉัน
              </p>
              <h1 className="font-medium text-2xl tracking-mc leading-tight truncate">
                {name || "ข้อมูลโปรไฟล์"}
              </h1>
              {email && <p className="text-sm text-base-content/55 mt-0.5 truncate">{email}</p>}
            </div>
          </div>
        </div>

        {loadStatus === "error" ? (
          <div className="alert alert-error rounded-2xl text-sm">
            ไม่สามารถโหลดข้อมูลโปรไฟล์ได้ กรุณาลองใหม่
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Success / Error */}
            {saveStatus === "success" && (
              <div className="alert alert-success rounded-2xl text-sm">บันทึกข้อมูลสำเร็จ</div>
            )}
            {saveStatus === "error" && (
              <div className="alert alert-error rounded-2xl text-sm">{errorMsg}</div>
            )}

            {/* ─── ข้อมูลองค์กร ─────────────────────────────────────── */}
            <Section
              eyebrow="Organization"
              title="ข้อมูลองค์กร"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                    d="M3 21h18M5 21V7l7-4 7 4v14M9 9.5h1m4 0h1M9 13h1m4 0h1M9 16.5h1m4 0h1" />
                </svg>
              }
            >
              <div className="grid gap-4">
                <Field label="ชื่อบริษัท / โรงเรียน" icon={
                  <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 21h18M5 21V7l7-4 7 4v14M9 9.5h1m4 0h1M9 13h1m4 0h1M9 16.5h1m4 0h1" />
                  </svg>
                }>
                  <input type="text" placeholder="เช่น บริษัท ... จำกัด หรือ โรงเรียน..."
                    value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} className="grow" />
                </Field>

                <Field label="เลขประจำตัวผู้เสียภาษี" icon={
                  <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 12h6m-6 4h6M9 8h6M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
                  </svg>
                }>
                  <input type="text" placeholder="เลข 13 หลัก"
                    value={taxId} onChange={(e) => setTaxId(e.target.value)} className="grow" />
                </Field>
              </div>
            </Section>

            {/* ─── ที่อยู่ ───────────────────────────────────────────── */}
            <Section
              eyebrow="Address"
              title="ที่อยู่"
              desc="พิมพ์ค้นหาหรือเลือกไล่ระดับ จังหวัด → อำเภอ → ตำบล → รหัสไปรษณีย์"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                    d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            >
              <div className="grid gap-6">

                {/* Billing */}
                <div className="space-y-2.5">
                  <p className="text-sm font-medium text-base-content/70">ที่อยู่สำหรับออกเอกสาร</p>
                  <textarea placeholder="บ้านเลขที่ / อาคาร / ถนน / หมู่"
                    value={billingLine} onChange={(e) => setBillingLine(e.target.value)}
                    className="textarea textarea-bordered rounded-xl w-full" rows={2} />
                  <ThaiAddressField value={billingGeo} onChange={setBillingGeo} />
                  {formatAddress(billingGeo) && (
                    <div className="rounded-xl bg-base-200/60 px-3.5 py-2.5 text-xs text-base-content/60 leading-relaxed">
                      {[billingLine.trim(), formatAddress(billingGeo)].filter(Boolean).join(" ")}
                    </div>
                  )}
                </div>

                {/* Shipping */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-base-content/70">ที่อยู่จัดส่ง</p>
                    <button type="button" className="btn btn-ghost btn-xs text-primary"
                      onClick={() => { setShippingLine(billingLine); setShippingGeo(billingGeo); }}>
                      ใช้ที่อยู่เดียวกับเอกสาร
                    </button>
                  </div>
                  <textarea placeholder="บ้านเลขที่ / อาคาร / ถนน / หมู่"
                    value={shippingLine} onChange={(e) => setShippingLine(e.target.value)}
                    className="textarea textarea-bordered rounded-xl w-full" rows={2} />
                  <ThaiAddressField value={shippingGeo} onChange={setShippingGeo} />
                  {formatAddress(shippingGeo) && (
                    <div className="rounded-xl bg-base-200/60 px-3.5 py-2.5 text-xs text-base-content/60 leading-relaxed">
                      {[shippingLine.trim(), formatAddress(shippingGeo)].filter(Boolean).join(" ")}
                    </div>
                  )}
                </div>
              </div>
            </Section>

            {/* ─── ข้อมูลติดต่อ ─────────────────────────────────────── */}
            <Section
              eyebrow="Contact"
              title="ข้อมูลติดต่อ"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              }
            >
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Field label="ชื่อผู้ประสานงาน" icon={
                    <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  }>
                    <input type="text" placeholder="ชื่อ-นามสกุล" value={name}
                      onChange={(e) => setName(e.target.value)} className="grow" autoComplete="name" />
                  </Field>
                </div>

                <Field label="เบอร์โทร" icon={
                  <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 5a2 2 0 012-2h2.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                }>
                  <input type="tel" placeholder="08x-xxx-xxxx" value={phone}
                    onChange={(e) => setPhone(e.target.value)} className="grow" autoComplete="tel" />
                </Field>

                <Field label="Line ID (ถ้ามี)" icon={
                  <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                }>
                  <input type="text" placeholder="Line ID" value={lineId}
                    onChange={(e) => setLineId(e.target.value)} className="grow" />
                </Field>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-base-content/70 mb-1.5">Email</label>
                  <label className="input input-bordered rounded-xl w-full flex items-center gap-2.5 opacity-60">
                    <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                    <input type="email" value={email} className="grow" disabled />
                  </label>
                </div>
              </div>
            </Section>

            {/* Submit */}
            <div className="sticky bottom-4 z-10">
              <button
                type="submit"
                disabled={!name.trim() || saveStatus === "saving"}
                className="btn btn-primary w-full gap-2 shadow-mc"
              >
                {saveStatus === "saving" ? (
                  <>
                    <span className="loading loading-spinner loading-sm" />
                    กำลังบันทึก...
                  </>
                ) : "บันทึกข้อมูล"}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
