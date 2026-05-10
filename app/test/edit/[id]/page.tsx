"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function EditPage() {
  const { id } = useParams();
  const router = useRouter();

  const pdfRef = useRef<HTMLDivElement | null>(null);

  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [focusedLineField, setFocusedLineField] = useState<string>("");

  // ================= FETCH =================
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/rfq/${id}`);
        if (!res.ok) throw new Error("Failed to fetch RFQ");
        const data = await res.json();
        if (!data.line_items) data.line_items = [];
        setForm(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchData();
  }, [id]);

  // ================= AUTO SCROLL =================
  useEffect(() => {
    if (!form) return;
    if (pdfRef.current) {
      pdfRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [form]);

  // ================= LOADING =================
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-base-200">
        <span className="loading loading-spinner loading-md text-primary"></span>
        <span className="text-xs tracking-widest uppercase text-base-content/40">
          Loading document...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="alert alert-error max-w-sm shadow-sm">
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center text-base-content/40 text-sm">
        ไม่พบข้อมูล
      </div>
    );
  }

  // ================= CALCULATE =================
  const calculateItemTotal = (quantity: number, unitPrice: number) =>
    (Number(quantity) || 0) * (Number(unitPrice) || 0);

  const calculateGrandTotal = (items: any[]) =>
    items.reduce((sum, item) => sum + calculateItemTotal(item.quantity, item.unit_price), 0);

  const formatPrice = (num: number) =>
    new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num || 0);

  const formatCurrency = (value: number): string => {
    if (value === null || value === undefined) return "";
    return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value) || 0);
  };

  const parseCurrency = (value: string): number => {
    const cleaned = value.replace(/,/g, "");
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  // ================= HANDLER =================
  const handleChange = (field: string, value: any) => setForm({ ...form, [field]: value });

  const handleLineChange = (index: number, field: string, value: string) => {
    const updated = [...form.line_items];
    if (field === "description" || field === "unit") {
      updated[index][field] = value;
    } else {
      updated[index][field] = parseCurrency(value);
    }
    setForm({ ...form, line_items: updated });
  };

  const addItem = () => {
    const newItem = {
      item_number: form.line_items.length + 1,
      description: "",
      quantity: 1,
      unit: "",
      unit_price: 0,
    };
    setForm({ ...form, line_items: [...form.line_items, newItem] });
  };

  const removeItem = (index: number) => {
    const updated = form.line_items
      .filter((_: any, i: number) => i !== index)
      .map((item: any, i: number) => ({ ...item, item_number: i + 1 }));
    setForm({ ...form, line_items: updated });
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      const res = await fetch(`/api/rfq/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to save");
      alert("บันทึกสำเร็จ!");
      router.push("/test/rfq");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const grandTotal = calculateGrandTotal(form.line_items || []);

  // ================= UI =================
  return (
    <div className="h-screen bg-base-200 p-4 grid gap-4 grid-cols-1 lg:grid-cols-[42%_1fr] lg:grid-rows-[1fr_380px] overflow-hidden">

      {/* ===================== LEFT: PDF ===================== */}
      <div
        ref={pdfRef}
        className="bg-base-100 rounded-2xl border border-base-300 flex flex-col gap-3 p-4 lg:row-span-2 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-base-content/40">
            Original Document
          </span>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-error/10 rounded-lg">
            <div className="w-1.5 h-1.5 rounded-full bg-error"></div>
            <span className="text-[10px] font-semibold text-error">PDF</span>
          </div>
        </div>

        {/* Filename pill */}
        <div className="flex items-center gap-2 px-3 py-2 bg-base-200 rounded-xl border border-base-300">
          <svg className="w-3.5 h-3.5 text-base-content/40 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-xs text-base-content/60 truncate">
            {form.filename || "ไม่มีไฟล์ PDF"}
          </span>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 rounded-xl overflow-hidden border border-base-300 bg-base-200 min-h-0">
          {form.filename ? (
            <iframe
              src={`/api/pdf/view?filename=${encodeURIComponent(form.filename)}`}
              className="w-full h-full"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-base-content/30">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-xs">ไม่มีไฟล์ PDF</span>
            </div>
          )}
        </div>
      </div>

      {/* ===================== RIGHT TOP: RFQ DATA ===================== */}
      <div className="bg-base-100 rounded-2xl border border-base-300 flex flex-col gap-4 p-4 overflow-hidden min-h-0">

        {/* Section header + actions */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-base-content/40">
            RFQ Data
          </span>
          <div className="flex items-center gap-2">
            <button
              className="btn btn-outline btn-sm gap-1.5 h-8 min-h-0 rounded-xl text-xs"
              onClick={() => router.push("/test/rfq")}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary btn-sm gap-1.5 h-8 min-h-0 rounded-xl text-xs"
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="loading loading-spinner loading-xs"></span>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save
                </>
              )}
            </button>
          </div>
        </div>

        {/* Top fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold tracking-[0.12em] uppercase text-base-content/40 pl-1">
              RFQ Number
            </label>
            <input
              type="text"
              className="input input-bordered input-sm h-9 rounded-xl text-sm bg-base-200 border-base-300 focus:border-primary focus:bg-base-100 transition-colors"
              value={form.rfq_number || ""}
              onChange={(e) => handleChange("rfq_number", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold tracking-[0.12em] uppercase text-base-content/40 pl-1">
              Buyer Company
            </label>
            <input
              type="text"
              className="input input-bordered input-sm h-9 rounded-xl text-sm bg-base-200 border-base-300 focus:border-primary focus:bg-base-100 transition-colors"
              value={form.buyer_company_name || ""}
              onChange={(e) => handleChange("buyer_company_name", e.target.value)}
            />
          </div>
        </div>

        {/* Line items table */}
        <div className="flex flex-col gap-2 flex-1 min-h-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-base-content/40 pl-1">
              Line Items
              <span className="ml-2 px-1.5 py-0.5 bg-base-200 rounded-md text-base-content/50 normal-case tracking-normal">
                {form.line_items?.length || 0}
              </span>
            </span>
            <button
              className="btn btn-ghost btn-xs h-7 min-h-0 rounded-lg gap-1 text-primary text-xs font-medium hover:bg-primary/10"
              onClick={addItem}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              เพิ่มรายการ
            </button>
          </div>

          {/* Table wrapper — fixed height, scrollable */}
          <div className="rounded-xl border border-base-300 overflow-hidden flex-1 min-h-0 flex flex-col">
            <div className="overflow-auto flex-1 min-h-0">
              <table className="table table-sm w-full">
                <thead className="sticky top-0 bg-base-200 z-10">
                  <tr className="border-b border-base-300">
                    <th className="text-[10px] tracking-widest uppercase text-base-content/40 font-semibold py-2.5 w-8">#</th>
                    <th className="text-[10px] tracking-widest uppercase text-base-content/40 font-semibold py-2.5">Description</th>
                    <th className="text-[10px] tracking-widest uppercase text-base-content/40 font-semibold py-2.5 text-center w-20">Qty</th>
                    <th className="text-[10px] tracking-widest uppercase text-base-content/40 font-semibold py-2.5 w-20">Unit</th>
                    <th className="text-[10px] tracking-widest uppercase text-base-content/40 font-semibold py-2.5 text-right w-28">Unit Price</th>
                    <th className="text-[10px] tracking-widest uppercase text-base-content/40 font-semibold py-2.5 text-right w-28">Total</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {form.line_items?.length > 0 ? (
                    form.line_items.map((item: any, i: number) => {
                      const total = calculateItemTotal(item.quantity, item.unit_price);
                      return (
                        <tr key={i} className="border-b border-base-200 hover:bg-base-50 transition-colors group">
                          <td className="text-xs font-semibold text-base-content/40 py-1.5">{i + 1}</td>
                          <td className="py-1.5">
                            <input
                              type="text"
                              value={item.description || ""}
                              onChange={(e) => handleLineChange(i, "description", e.target.value)}
                              placeholder="รายละเอียด..."
                              className="input input-sm h-8 w-full rounded-lg bg-transparent border-transparent hover:border-base-300 focus:border-primary focus:bg-base-100 transition-all text-xs"
                            />
                          </td>
                          <td className="py-1.5">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={focusedLineField === `${i}-qty` ? String(item.quantity || "") : formatCurrency(item.quantity || 0)}
                              onFocus={() => setFocusedLineField(`${i}-qty`)}
                              onBlur={() => setFocusedLineField("")}
                              onChange={(e) => handleLineChange(i, "quantity", e.target.value)}
                              className="input input-sm h-8 w-full rounded-lg bg-transparent border-transparent hover:border-base-300 focus:border-primary focus:bg-base-100 transition-all text-xs text-center"
                            />
                          </td>
                          <td className="py-1.5">
                            <input
                              type="text"
                              value={item.unit || ""}
                              onChange={(e) => handleLineChange(i, "unit", e.target.value)}
                              placeholder="unit"
                              className="input input-sm h-8 w-full rounded-lg bg-transparent border-transparent hover:border-base-300 focus:border-primary focus:bg-base-100 transition-all text-xs"
                            />
                          </td>
                          <td className="py-1.5">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={focusedLineField === `${i}-price` ? String(item.unit_price || "") : formatCurrency(item.unit_price || 0)}
                              onFocus={() => setFocusedLineField(`${i}-price`)}
                              onBlur={() => setFocusedLineField("")}
                              onChange={(e) => handleLineChange(i, "unit_price", e.target.value)}
                              className="input input-sm h-8 w-full rounded-lg bg-transparent border-transparent hover:border-base-300 focus:border-primary focus:bg-base-100 transition-all text-xs text-right"
                            />
                          </td>
                          <td className="text-right text-xs font-semibold text-primary py-1.5 tabular-nums">
                            {formatPrice(total)}
                          </td>
                          <td className="py-1.5">
                            <button
                              className="btn btn-ghost btn-xs h-7 min-h-0 w-7 rounded-lg p-0 text-base-content/30 hover:text-error hover:bg-error/10 opacity-0 group-hover:opacity-100 transition-all"
                              onClick={() => removeItem(i)}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-10 text-center">
                        <div className="flex flex-col items-center gap-2 text-base-content/25">
                          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          <span className="text-xs">ไม่มีรายการสินค้า</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="sticky bottom-0 bg-base-200 border-t border-base-300">
                  <tr>
                    <td colSpan={5} className="text-right text-[10px] font-semibold tracking-widest uppercase text-base-content/40 py-2.5">
                      Grand Total
                    </td>
                    <td className="text-right py-2.5">
                      <span className="text-sm font-bold text-success tabular-nums">
                        {formatPrice(grandTotal)}
                      </span>
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== RIGHT BOTTOM ===================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:self-start overflow-hidden">

        {/* ===== INFO CARD ===== */}
        <div className="bg-base-100 rounded-2xl border border-base-300 p-4 flex flex-col gap-3 min-h-[380px]">
          <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-base-content/40">
            Summary
          </span>

          <div className="flex flex-col divide-y divide-base-200">
            {[
              { key: "RFQ Number", val: form.rfq_number || "—" },
              { key: "Buyer", val: form.buyer_company_name || "—" },
              { key: "Vendor", val: form.vendor_company_name || "—" },
              { key: "Items", val: `${form.line_items?.length || 0} รายการ` },
            ].map((row) => (
              <div key={row.key} className="flex justify-between items-center py-2">
                <span className="text-xs text-base-content/40">{row.key}</span>
                <span className="text-xs font-medium text-right max-w-[55%] truncate">{row.val}</span>
              </div>
            ))}
          </div>

          {/* Grand total highlight */}
          <div className="mt-auto flex items-center justify-between px-3 py-2.5 bg-success/8 border border-success/20 rounded-xl">
            <span className="text-xs font-semibold text-success/70">Grand Total</span>
            <span className="text-sm font-bold text-success tabular-nums">{formatPrice(grandTotal)}</span>
          </div>
        </div>

        {/* ===== CHAT CARD ===== */}
        <div className="bg-base-100 rounded-2xl border border-base-300 p-4 flex flex-col gap-3 min-h-[380px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-base-content/40">
              AI Assistant
            </span>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></div>
              <span className="text-[10px] text-success font-medium">Online</span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex flex-col gap-2 flex-1 overflow-auto">
            <div className="self-start max-w-[88%]">
              <div className="px-3 py-2 bg-base-200 rounded-2xl rounded-tl-sm text-xs text-base-content/70 leading-relaxed">
                ระบบพร้อมสำหรับ AI Chat และ Document Assistant
              </div>
            </div>
            <div className="self-end max-w-[88%]">
              <div className="px-3 py-2 bg-primary/12 rounded-2xl rounded-tr-sm text-xs text-primary leading-relaxed">
                RFQ นี้มียอดรวมเท่าไร?
              </div>
            </div>
            <div className="self-start max-w-[88%]">
              <div className="px-3 py-2 bg-base-200 rounded-2xl rounded-tl-sm text-xs text-base-content/70 leading-relaxed">
                Grand Total:{" "}
                <span className="font-bold text-success tabular-nums">{formatPrice(grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Input */}
          <div className="flex gap-2 pt-1 border-t border-base-200">
            <input
              type="text"
              placeholder="ถามเกี่ยวกับเอกสาร..."
              className="input input-bordered input-sm h-8 flex-1 rounded-xl text-xs bg-base-200 border-transparent focus:border-primary focus:bg-base-100 transition-colors"
            />
            <button className="btn btn-primary btn-sm h-8 min-h-0 rounded-xl px-3">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}