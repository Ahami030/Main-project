"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import BillingDetailModal from "@/components/admin/BillingDetailModal";

type BillingStatus = "draft" | "finalized";
type BillingType = "group" | "single";

interface Billing {
  _id: string;
  type: BillingType;
  billingNumber: string;
  status: BillingStatus;
  customerName: string;
  customerEmail: string;
  poNumbers: string[];
  taxInvoices: { amount: number }[];
  billingDate?: string;
  expiresAt?: string | null;
  createdAt: string;
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function ExpiryBadge({ expiresAt }: { expiresAt?: string | null }) {
  if (!expiresAt) return null;
  const days = daysUntil(expiresAt);
  if (days <= 0) return <span className="badge badge-error badge-xs">หมดอายุ</span>;
  if (days <= 7) return <span className="badge badge-warning badge-xs">เหลือ {days} วัน</span>;
  return <span className="badge badge-ghost badge-xs text-base-content/40">{days} วัน</span>;
}

function TypeBadge({ type }: { type: BillingType }) {
  return type === "group"
    ? <span className="badge badge-sm badge-primary badge-outline font-medium">รวมหลาย PO</span>
    : <span className="badge badge-sm badge-ghost font-medium">PO เดี่ยว</span>;
}

const fmt = (n: number) =>
  n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function AdminBillingListPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [billings, setBillings]   = useState<Billing[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState<"all" | "draft" | "finalized" | "expiring">("all");
  const [search, setSearch]       = useState("");
  const [cleaning, setCleaning]   = useState(false);
  const [cleanResult, setCleanResult] = useState<{ cleaned: number } | null>(null);
  const [busyId, setBusyId]       = useState<string | null>(null);
  const [modalItem, setModalItem] = useState<{ _id: string; type: BillingType; billingNumber: string } | null>(null);

  // ── Theme: follow the global picker, default to Mastercard ──────────────────
  const [theme, setTheme] = useState("mastercard");
  useEffect(() => {
    const pick = () => setTheme(localStorage.getItem("theme") || "mastercard");
    pick();
    const obs = new MutationObserver(pick);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const refresh = () =>
    fetch("/api/billing").then((r) => (r.ok ? r.json() : [])).then(setBillings);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  const expiredCount = billings.filter((b) => b.expiresAt && daysUntil(b.expiresAt) <= 0).length;
  const draftCount   = billings.filter((b) => b.status === "draft").length;

  const filtered = billings.filter((b) => {
    if (filter === "expiring") {
      if (!b.expiresAt) return false;
      return daysUntil(b.expiresAt) <= 30;
    }
    if (filter !== "all" && b.status !== filter) return false;
    const q = search.toLowerCase();
    return !q ||
      b.billingNumber.toLowerCase().includes(q) ||
      b.customerName.toLowerCase().includes(q) ||
      b.poNumbers.some((p) => p.toLowerCase().includes(q));
  });

  const handleCleanup = async () => {
    setCleaning(true);
    setCleanResult(null);
    const res = await fetch("/api/admin/billing/cleanup", { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setCleanResult({ cleaned: data.cleaned });
      await refresh();
    }
    setCleaning(false);
  };

  const handleManage = (b: Billing) => {
    setModalItem({ _id: b._id, type: b.type, billingNumber: b.billingNumber });
  };

  // Delete a billing note:
  //  • single  → "unbill" the PO (revert to accepted; PO + invoices kept)
  //  • group   → delete the billing doc (draft only; POs released)
  const handleDelete = async (b: Billing) => {
    if (b.type === "single") {
      if (!confirm(
        `ยกเลิกใบวางบิลของ ${b.billingNumber}?\n\n• PO จะกลับไปเป็นสถานะ "กำลังดำเนินการ"\n• ข้อมูลใบกำกับภาษียังอยู่ครบ (แก้ไข/วางบิลใหม่ได้)`
      )) return;
      setBusyId(b._id);
      try {
        const res = await fetch(`/api/po/${b._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "unbill" }),
        });
        if (!res.ok) { alert((await res.json().catch(() => ({})))?.message ?? "ทำรายการไม่สำเร็จ"); return; }
        await refresh();
      } finally { setBusyId(null); }
    } else {
      if (b.status === "finalized") {
        alert("ไม่สามารถลบใบวางบิลรวมที่ยืนยันแล้ว — เปิดดูรายละเอียดเพื่อจัดการ");
        return;
      }
      if (!confirm(
        `ลบใบวางบิล ${b.billingNumber}?\n\n• PO ที่รวมไว้จะถูกปลดออก (เลือกไปวางบิลใหม่ได้)`
      )) return;
      setBusyId(b._id);
      try {
        const res = await fetch(`/api/billing/${b._id}`, { method: "DELETE" });
        if (!res.ok) { alert((await res.json().catch(() => ({})))?.message ?? "ลบไม่สำเร็จ"); return; }
        await refresh();
      } finally { setBusyId(null); }
    }
  };

  if (!session) return null;

  return (
    <div data-theme={theme} className="font-mc relative min-h-screen bg-base-200 text-base-content overflow-hidden">

      {/* ── Decorative orbital rings ─────────────────────────────────────── */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-[30rem] -right-[18rem] w-[58rem] h-[58rem] rounded-full border border-accent/15" />
        <div className="absolute -bottom-[34rem] -left-[20rem] w-[58rem] h-[58rem] rounded-full border border-secondary/12" />
      </div>

      <div className="relative max-w-5xl mx-auto py-10 px-4">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="mb-7 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-base-content/55 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              Billing
            </p>
            <h1 className="text-3xl md:text-4xl font-medium tracking-mc leading-tight">จัดการใบวางบิล</h1>
            <p className="text-base-content/55 mt-1.5 text-sm">
              ใบวางบิลทั้งหมดในระบบ ทั้งแบบ PO เดี่ยวและแบบรวมหลาย PO
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button className="btn btn-ghost btn-sm" onClick={() => router.push("/Admin")}>← กลับ</button>
            {expiredCount > 0 && (
              <button className="btn btn-error btn-sm gap-1.5" disabled={cleaning} onClick={handleCleanup}>
                {cleaning
                  ? <span className="loading loading-spinner loading-xs" />
                  : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                }
                ล้างหมดอายุ ({expiredCount})
              </button>
            )}
            <button className="btn btn-primary btn-sm gap-2" onClick={() => router.push("/Admin/billing/new")}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              สร้างใบวางบิลรวม
            </button>
          </div>
        </div>

        {cleanResult && (
          <div className={`alert ${cleanResult.cleaned > 0 ? "alert-success" : "alert-info"} rounded-2xl py-2.5 text-sm mb-3`}>
            {cleanResult.cleaned > 0
              ? `ล้างข้อมูลหมดอายุแล้ว ${cleanResult.cleaned} รายการ (สำรองไว้ใน archived_billings)`
              : "ไม่มีรายการหมดอายุ"}
          </div>
        )}

        {/* ── Filters ─────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div role="tablist" className="tabs tabs-boxed bg-base-100 border border-base-300/70 rounded-2xl p-1">
            {(["all", "draft", "finalized", "expiring"] as const).map((tab) => (
              <button key={tab} role="tab"
                className={`tab h-8 min-h-0 text-xs font-semibold rounded-xl ${filter === tab ? "tab-active" : ""}`}
                onClick={() => setFilter(tab)}>
                {tab === "all" ? `ทั้งหมด (${billings.length})`
                  : tab === "draft" ? "ร่าง"
                  : tab === "finalized" ? "ยืนยันแล้ว"
                  : "ใกล้หมดอายุ"}
                {tab === "draft" && draftCount > 0 && (
                  <span className="ml-1.5 badge badge-warning badge-xs">{draftCount}</span>
                )}
                {tab === "expiring" && expiredCount > 0 && (
                  <span className="ml-1.5 badge badge-error badge-xs">{expiredCount}</span>
                )}
              </button>
            ))}
          </div>
          <input type="text" placeholder="ค้นหาเลขที่, ชื่อลูกค้า, PO#..."
            className="input input-bordered input-sm flex-1 rounded-xl" value={search}
            onChange={(e) => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><span className="loading loading-spinner loading-lg text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="card bg-base-100 border border-base-300/70 rounded-[2rem] shadow-mc-sm">
            <div className="card-body items-center py-16 text-center gap-3">
              <p className="text-base-content/40">ยังไม่มีใบวางบิลในระบบ</p>
              <p className="text-xs text-base-content/30 max-w-sm">
                ใบวางบิลจะปรากฏที่นี่อัตโนมัติเมื่อคุณวางบิล PO ในหน้า Manage PO หรือกดสร้างใบวางบิลรวมด้านบน
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* ── Desktop table ── */}
            <div className="hidden md:block card bg-base-100 border border-base-300/70 rounded-[2rem] shadow-mc-sm overflow-hidden">
              <table className="table">
                <thead className="bg-base-200/60 text-xs uppercase tracking-wider text-base-content/40">
                  <tr>
                    <th>เลขที่ / ประเภท</th>
                    <th>ลูกค้า</th>
                    <th>PO</th>
                    <th className="text-right">ยอดรวม</th>
                    <th>สถานะ</th>
                    <th>หมดอายุ</th>
                    <th className="text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b) => {
                    const total   = b.taxInvoices.reduce((s, inv) => s + inv.amount, 0);
                    const isDraft = b.status === "draft";
                    const busy    = busyId === b._id;
                    const lockDelete = b.type === "group" && b.status === "finalized";
                    return (
                      <tr key={b._id} className="hover">
                        <td className="cursor-pointer" onClick={() => handleManage(b)}>
                          <div className="font-semibold tracking-mc">{b.billingNumber}</div>
                          <div className="mt-1"><TypeBadge type={b.type} /></div>
                        </td>
                        <td className="cursor-pointer" onClick={() => handleManage(b)}>
                          <div className="font-medium text-sm">{b.customerName}</div>
                          <div className="text-xs text-base-content/50">{b.customerEmail}</div>
                        </td>
                        <td className="text-xs text-base-content/70 max-w-40 truncate">{b.poNumbers.join(", ")}</td>
                        <td className="text-right font-medium text-sm">
                          {b.taxInvoices.length > 0 ? `${fmt(total)} ฿` : <span className="text-base-content/30">-</span>}
                        </td>
                        <td>
                          <span className={`badge badge-sm ${isDraft ? "badge-warning" : "badge-success"}`}>
                            {isDraft ? "ร่าง" : "ยืนยันแล้ว"}
                          </span>
                        </td>
                        <td><ExpiryBadge expiresAt={b.expiresAt} /></td>
                        <td>
                          <div className="flex items-center justify-end gap-1.5">
                            <button className="btn btn-xs btn-ghost" onClick={() => handleManage(b)}>
                              {b.type === "single" ? "ดู PO" : "จัดการ"} →
                            </button>
                            <button
                              className="btn btn-xs btn-ghost text-error disabled:opacity-30"
                              disabled={busy || lockDelete}
                              title={
                                lockDelete ? "ใบวางบิลรวมที่ยืนยันแล้ว ลบไม่ได้"
                                : b.type === "single" ? "ยกเลิกใบวางบิล (คืน PO เป็นกำลังดำเนินการ)"
                                : "ลบใบวางบิล"
                              }
                              onClick={() => handleDelete(b)}
                            >
                              {busy
                                ? <span className="loading loading-spinner loading-xs" />
                                : b.type === "single" ? "ยกเลิก" : "ลบ"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Mobile cards ── */}
            <div className="md:hidden flex flex-col gap-3">
              {filtered.map((b) => {
                const total   = b.taxInvoices.reduce((s, inv) => s + inv.amount, 0);
                const isDraft = b.status === "draft";
                const busy    = busyId === b._id;
                const lockDelete = b.type === "group" && b.status === "finalized";
                return (
                  <div key={b._id} className="card bg-base-100 border border-base-300/70 rounded-[1.75rem] shadow-mc-sm">
                    <div className="card-body py-4 px-5 gap-2">
                      <div className="flex items-center justify-between gap-2" onClick={() => handleManage(b)}>
                        <span className="font-semibold tracking-mc">{b.billingNumber}</span>
                        <span className={`badge badge-sm ${isDraft ? "badge-warning" : "badge-success"}`}>
                          {isDraft ? "ร่าง" : "ยืนยันแล้ว"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TypeBadge type={b.type} />
                        <ExpiryBadge expiresAt={b.expiresAt} />
                      </div>
                      <p className="text-sm font-medium">{b.customerName}</p>
                      <p className="text-xs text-base-content/50">{b.poNumbers.join(", ")}</p>
                      {b.taxInvoices.length > 0 && (
                        <p className="text-sm font-semibold text-success">{fmt(total)} ฿</p>
                      )}
                      <div className="flex items-center gap-2 pt-1">
                        <button className="btn btn-xs btn-outline flex-1" onClick={() => handleManage(b)}>
                          {b.type === "single" ? "ดู PO" : "จัดการ"}
                        </button>
                        <button
                          className="btn btn-xs btn-ghost text-error disabled:opacity-30"
                          disabled={busy || lockDelete}
                          onClick={() => handleDelete(b)}
                        >
                          {busy
                            ? <span className="loading loading-spinner loading-xs" />
                            : b.type === "single" ? "ยกเลิก" : "ลบ"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {modalItem && (
        <BillingDetailModal
          item={modalItem}
          onClose={() => setModalItem(null)}
          onChanged={refresh}
        />
      )}
    </div>
  );
}
