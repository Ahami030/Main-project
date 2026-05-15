"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function RFQListPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/rfq");
        if (!res.ok) throw new Error("Failed to fetch");
        const result = await res.json();
        setData(Array.isArray(result) ? result : []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = data.filter((item) => {
    const q = search.toLowerCase();
    return (
      (item.rfq_number || "").toLowerCase().includes(q) ||
      (item.buyer_company_name || "").toLowerCase().includes(q) ||
      (item.vendor_company_name || "").toLowerCase().includes(q)
    );
  });

  const grandTotal = (item: any) =>
    (item.line_items || []).reduce(
      (sum: number, li: any) =>
        sum + (Number(li.quantity) || 0) * (Number(li.unit_price) || 0),
      0
    );

  const formatPrice = (num: number) =>
    new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num || 0);

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-base-200 p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="skeleton h-7 w-32 rounded-xl" />
          <div className="skeleton h-9 w-28 rounded-xl" />
        </div>
        <div className="skeleton h-10 w-full rounded-xl" />
        <div className="bg-base-100 rounded-2xl border border-base-300 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-base-200 last:border-0">
              <div className="skeleton h-4 w-24 rounded-lg" />
              <div className="skeleton h-4 w-36 rounded-lg" />
              <div className="skeleton h-4 w-28 rounded-lg flex-1" />
              <div className="skeleton h-6 w-16 rounded-full" />
              <div className="skeleton h-4 w-20 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="alert alert-error max-w-sm shadow">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 p-4 md:p-6 flex flex-col gap-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-base-content tracking-tight">RFQ List</h1>
          <p className="text-[11px] text-base-content/40 mt-0.5">
            {data.length} document{data.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <button
          className="btn btn-primary btn-sm h-9 min-h-0 rounded-xl gap-1.5 text-xs font-semibold"
          onClick={() => router.push("/Admin")}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>

      {/* ── Search ── */}
      <div className="relative">
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/30 pointer-events-none"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search by RFQ number, buyer, or vendor..."
          className="input input-bordered w-full h-10 pl-10 pr-4 rounded-xl bg-base-100 border-base-300 focus:border-primary text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/30 hover:text-base-content/60 transition-colors"
            onClick={() => setSearch("")}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Table card ── */}
      <div className="bg-base-100 rounded-2xl border border-base-300 overflow-hidden flex-1">

        {filtered.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-base-content/25">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm font-medium">
              {search ? "No results found" : "No RFQ documents yet"}
            </p>
            {search && (
              <button
                className="btn btn-ghost btn-xs rounded-lg text-primary text-xs"
                onClick={() => setSearch("")}
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="table table-sm w-full">
                <thead>
                  <tr className="border-b border-base-200 bg-base-200/60">
                    <th className="text-[10px] tracking-widest uppercase text-base-content/40 font-semibold py-3 pl-5">#</th>
                    <th className="text-[10px] tracking-widest uppercase text-base-content/40 font-semibold py-3">RFQ Number</th>
                    <th className="text-[10px] tracking-widest uppercase text-base-content/40 font-semibold py-3">Buyer</th>
                    <th className="text-[10px] tracking-widest uppercase text-base-content/40 font-semibold py-3">Vendor</th>
                    <th className="text-[10px] tracking-widest uppercase text-base-content/40 font-semibold py-3 text-center">Items</th>
                    <th className="text-[10px] tracking-widest uppercase text-base-content/40 font-semibold py-3 text-right pr-5">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item, idx) => {
                    const total = grandTotal(item);
                    const itemCount = item.line_items?.length || 0;
                    return (
                      <tr
                        key={item._id}
                        className="border-b border-base-200 last:border-0 hover:bg-base-50 cursor-pointer transition-colors group"
                        onClick={() => router.push(`/Admin/edit/${item._id}`)}
                      >
                        <td className="pl-5 py-3.5 text-xs font-semibold text-base-content/30 tabular-nums w-10">
                          {idx + 1}
                        </td>
                        <td className="py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <span className="text-sm font-semibold text-base-content group-hover:text-primary transition-colors">
                              {item.rfq_number || <span className="text-base-content/30 font-normal">—</span>}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 text-sm text-base-content/70 max-w-[180px] truncate">
                          {item.buyer_company_name || <span className="text-base-content/30">—</span>}
                        </td>
                        <td className="py-3.5 text-sm text-base-content/70 max-w-[180px] truncate">
                          {item.vendor_company_name || <span className="text-base-content/30">—</span>}
                        </td>
                        <td className="py-3.5 text-center">
                          <span className={`badge badge-sm rounded-lg font-semibold ${itemCount > 0 ? "badge-ghost" : "badge-ghost opacity-40"}`}>
                            {itemCount}
                          </span>
                        </td>
                        <td className="py-3.5 pr-5 text-right">
                          <span className={`text-sm font-bold tabular-nums ${total > 0 ? "text-success" : "text-base-content/25"}`}>
                            {total > 0 ? formatPrice(total) : "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden flex flex-col divide-y divide-base-200">
              {filtered.map((item) => {
                const total = grandTotal(item);
                const itemCount = item.line_items?.length || 0;
                return (
                  <div
                    key={item._id}
                    className="flex items-center gap-3 px-4 py-3.5 hover:bg-base-50 active:bg-base-200 cursor-pointer transition-colors"
                    onClick={() => router.push(`/Admin/edit/${item._id}`)}
                  >
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-base-content truncate">
                        {item.rfq_number || "—"}
                      </p>
                      <p className="text-xs text-base-content/50 truncate mt-0.5">
                        {item.buyer_company_name || "No buyer"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-bold tabular-nums ${total > 0 ? "text-success" : "text-base-content/25"}`}>
                        {total > 0 ? formatPrice(total) : "—"}
                      </p>
                      <p className="text-[10px] text-base-content/40 mt-0.5">{itemCount} items</p>
                    </div>
                    <svg className="w-4 h-4 text-base-content/20 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Footer count (when filtered) ── */}
      {search && filtered.length > 0 && (
        <p className="text-[11px] text-base-content/40 text-center">
          Showing {filtered.length} of {data.length} documents
        </p>
      )}
    </div>
  );
}
