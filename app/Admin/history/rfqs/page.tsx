"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface LineItem {
  description?: string;
  quantity?: number;
  unit_price?: number;
}

interface ArchivedRFQ {
  _id: string;
  USER_ID?: string;
  rfq_number?: string;
  rfq_date?: string;
  due_date?: string;
  buyer_company_name?: string;
  vendor_company_name?: string;
  document_type?: string;
  line_items?: LineItem[];
  version?: number;
  archivedAt: string;
  originalQuotationId?: string;
}

const fmt = (d?: string) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("th-TH", {
    year: "numeric", month: "short", day: "numeric",
  });
};

export default function ArchivedRFQsPage() {
  const router = useRouter();
  const [rfqs, setRfqs] = useState<ArchivedRFQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/history/rfqs")
      .then((r) => r.ok ? r.json() : [])
      .then(setRfqs)
      .finally(() => setLoading(false));
  }, []);

  const filtered = rfqs.filter((r) => {
    const q = search.toLowerCase();
    return (
      r.rfq_number?.toLowerCase().includes(q) ||
      r.buyer_company_name?.toLowerCase().includes(q) ||
      r.vendor_company_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-base-200 p-4 lg:p-6">
      <div className="max-w-5xl mx-auto flex flex-col gap-5">

        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => router.push("/Admin")}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            กลับ
          </button>
          <div>
            <h1 className="text-lg font-bold text-base-content">ประวัติ RFQ</h1>
            <p className="text-[11px] text-base-content/40">ใบเสนอราคาที่ถูก archive ทั้งหมด</p>
          </div>
          <span className="badge badge-outline ml-auto">
            {rfqs.length} รายการ
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="ค้นหาเลข RFQ, ชื่อบริษัทผู้ซื้อ หรือผู้ขาย..."
            className="input input-bordered w-full pl-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* List */}
        <div className="bg-base-100 border border-base-300 rounded-2xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex justify-center py-16">
              <span className="loading loading-spinner loading-md" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-2 text-base-content/30">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <p className="text-sm">{search ? "ไม่พบรายการที่ค้นหา" : "ยังไม่มีประวัติ RFQ"}</p>
            </div>
          ) : (
            <div className="divide-y divide-base-200">
              {filtered.map((rfq) => (
                <div key={rfq._id}>
                  <button
                    className="w-full px-5 py-4 flex items-center gap-4 hover:bg-base-200/40 transition-colors text-left"
                    onClick={() => setExpanded(expanded === rfq._id ? null : rfq._id)}
                  >
                    <div className="w-9 h-9 rounded-xl bg-base-200 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-base-content/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-base-content">
                          {rfq.rfq_number ?? "(ไม่มีเลข)"}
                        </p>
                        {rfq.version !== undefined && (
                          <span className="badge badge-ghost badge-xs">v{rfq.version}</span>
                        )}
                      </div>
                      <p className="text-[11px] text-base-content/40 mt-0.5 truncate">
                        {rfq.buyer_company_name ?? "-"} · archive เมื่อ {fmt(rfq.archivedAt)}
                      </p>
                    </div>
                    <svg
                      className={`w-4 h-4 text-base-content/30 shrink-0 transition-transform ${expanded === rfq._id ? "rotate-180" : ""}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {expanded === rfq._id && (
                    <div className="px-5 pb-5 bg-base-200/30">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                        {[
                          ["ประเภทเอกสาร", rfq.document_type ?? "-"],
                          ["วันที่ RFQ",    fmt(rfq.rfq_date)],
                          ["ครบกำหนด",      fmt(rfq.due_date)],
                          ["บริษัทขาย",     rfq.vendor_company_name ?? "-"],
                        ].map(([label, value]) => (
                          <div key={label} className="bg-base-100 rounded-xl p-3 border border-base-200">
                            <p className="text-[10px] text-base-content/40 uppercase tracking-wider">{label}</p>
                            <p className="text-xs font-medium mt-0.5 truncate">{value}</p>
                          </div>
                        ))}
                      </div>
                      {(rfq.line_items ?? []).length > 0 && (
                        <div className="overflow-x-auto rounded-xl border border-base-200 bg-base-100">
                          <table className="table table-xs w-full">
                            <thead>
                              <tr className="bg-base-200/60 text-[10px] uppercase tracking-wider text-base-content/40">
                                <th>รายการ</th>
                                <th className="text-right">จำนวน</th>
                                <th className="text-right">ราคา/หน่วย</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(rfq.line_items ?? []).map((item, i) => (
                                <tr key={i}>
                                  <td className="text-xs">{item.description ?? "-"}</td>
                                  <td className="text-xs text-right tabular-nums">{item.quantity ?? "-"}</td>
                                  <td className="text-xs text-right tabular-nums">
                                    {item.unit_price != null
                                      ? `฿${item.unit_price.toLocaleString("th-TH", { minimumFractionDigits: 2 })}`
                                      : "-"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
