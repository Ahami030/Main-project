"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// ── Chat types ──────────────────────────────────────────────
type ChatMsg = {
  _id: string;
  senderRole: "user" | "admin";
  message: string;
  createdAt: string;
};
type ChatUser = {
  userId: string;
  user: { name: string; email: string } | null;
  latestMessage: string;
  latestMessageTime: string;
};

export default function EditPage() {
  const { id } = useParams();
  const router = useRouter();
  const pdfRef = useRef<HTMLDivElement | null>(null);

  // ── RFQ state ──────────────────────────────────────────────
  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [focusedLineField, setFocusedLineField] = useState<string>("");
  const [mobileTab, setMobileTab] = useState<"pdf" | "edit" | "chat">("pdf");
  const [summaryOpen, setSummaryOpen] = useState(false);

  // ── Chat state ─────────────────────────────────────────────
  const [chatMessage, setChatMessage] = useState("");
  const [chats, setChats] = useState<ChatMsg[]>([]);
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [showNewMsgBtn, setShowNewMsgBtn] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const justSwitchedUser = useRef(false);
  const switchTimeRef = useRef<number>(0);

  // ── Fetch RFQ ──────────────────────────────────────────────
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

  useEffect(() => {
    if (!form) return;
    pdfRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [form]);

  // ── Fetch chat users (poll 3s) ─────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/chat/users", { cache: "no-store" });
        const data = await res.json();
        setChatUsers(data);
        if (data.length > 0 && !selectedUserId) setSelectedUserId(data[0].userId);
      } catch {}
      finally { setLoadingUsers(false); }
    };
    load();
    const iv = setInterval(async () => {
      try {
        const res = await fetch("/api/chat/users", { cache: "no-store" });
        setChatUsers(await res.json());
      } catch {}
    }, 3000);
    return () => clearInterval(iv);
  }, []);

  // Reset on user switch
  useEffect(() => {
    setShouldAutoScroll(true);
    setShowNewMsgBtn(false);
    setChats([]);
    justSwitchedUser.current = true;
    switchTimeRef.current = Date.now();
  }, [selectedUserId]);

  // ── Fetch chat messages (poll 1s) ──────────────────────────
  const loadChats = async () => {
    if (!selectedUserId) return;
    try {
      const res = await fetch(`/api/chat/${selectedUserId}`, { cache: "no-store" });
      const data = await res.json();
      setChats((prev) => {
        if (data.length > prev.length && !shouldAutoScroll) setShowNewMsgBtn(true);
        return data;
      });
    } catch {}
  };

  useEffect(() => {
    if (!selectedUserId) return;
    loadChats();
    const iv = setInterval(loadChats, 1000);
    return () => clearInterval(iv);
  }, [selectedUserId]);

  // Auto-scroll
  useEffect(() => {
    if (!shouldAutoScroll) return;
    const el = chatContainerRef.current;
    if (!el) return;
    const timeSince = Date.now() - switchTimeRef.current;
    el.scrollTo({ top: el.scrollHeight, behavior: justSwitchedUser.current || timeSince < 500 ? "instant" : "smooth" });
    justSwitchedUser.current = false;
  }, [chats, shouldAutoScroll]);

  const handleChatScroll = () => {
    const el = chatContainerRef.current;
    if (!el) return;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 50;
    setShouldAutoScroll(atBottom);
    if (atBottom) setShowNewMsgBtn(false);
  };

  const scrollToBottom = () => {
    chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: "smooth" });
    setShowNewMsgBtn(false);
    setShouldAutoScroll(true);
  };

  const sendChatMessage = async () => {
    if (!chatMessage.trim() || !selectedUserId) return;
    try {
      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId, senderRole: "admin", message: chatMessage }),
      });
      setChatMessage("");
      setShouldAutoScroll(true);
      setShowNewMsgBtn(false);
      loadChats();
    } catch {}
  };

  // ── Loading / error ────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-base-200">
        <span className="loading loading-spinner loading-md text-primary" />
        <span className="text-xs tracking-widest uppercase text-base-content/40">Loading document...</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="alert alert-error max-w-sm shadow-sm"><span className="text-sm">{error}</span></div>
      </div>
    );
  }
  if (!form) {
    return <div className="min-h-screen flex items-center justify-center text-base-content/40 text-sm">ไม่พบข้อมูล</div>;
  }

  // ── Helpers ────────────────────────────────────────────────
  const calcItemTotal = (q: number, p: number) => (Number(q) || 0) * (Number(p) || 0);
  const calcGrandTotal = (items: any[]) => items.reduce((s, i) => s + calcItemTotal(i.quantity, i.unit_price), 0);
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
  const fmtCurrency = (v: number) => (v == null ? "" : fmt(v));
  const parseCurrency = (v: string) => { const n = parseFloat(v.replace(/,/g, "")); return isNaN(n) ? 0 : n; };
  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

  const handleChange = (field: string, value: any) => setForm({ ...form, [field]: value });
  const handleLineChange = (i: number, field: string, value: string) => {
    const updated = [...form.line_items];
    updated[i][field] = field === "description" || field === "unit" ? value : parseCurrency(value);
    setForm({ ...form, line_items: updated });
  };
  const addItem = () => setForm({ ...form, line_items: [...form.line_items, { item_number: form.line_items.length + 1, description: "", quantity: 1, unit: "", unit_price: 0 }] });
  const removeItem = (i: number) => setForm({ ...form, line_items: form.line_items.filter((_: any, j: number) => j !== i).map((item: any, j: number) => ({ ...item, item_number: j + 1 })) });

  const handleSubmit = async () => {
    try {
      setSaving(true);
      const res = await fetch(`/api/rfq/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error("Failed to save");
      alert("บันทึกสำเร็จ!");
      router.push("/Admin/rfq");
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  const grandTotal = calcGrandTotal(form.line_items || []);
  // ── Panels ─────────────────────────────────────────────────

  const PdfPanel = ({ className = "" }: { className?: string }) => (
    <div className={`bg-base-100 rounded-2xl border border-base-300 flex flex-col gap-3 p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-base-content/40">Original Document</span>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-error/10 rounded-lg">
          <div className="w-1.5 h-1.5 rounded-full bg-error" />
          <span className="text-[10px] font-semibold text-error">PDF</span>
        </div>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 bg-base-200 rounded-xl border border-base-300">
        <svg className="w-3.5 h-3.5 text-base-content/40 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className="text-xs text-base-content/60 truncate">{form.filename || "ไม่มีไฟล์ PDF"}</span>
      </div>
      <div className="flex-1 rounded-xl overflow-hidden border border-base-300 bg-base-200 min-h-0">
        {form.filename ? (
          <iframe src={`/api/pdf/view?filename=${encodeURIComponent(form.filename)}`} className="w-full h-full" />
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
  );

  const EditPanel = ({ className = "" }: { className?: string }) => (
    <div className={`bg-base-100 rounded-2xl border border-base-300 flex flex-col gap-4 p-4 overflow-hidden min-h-0 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-base-content/40">RFQ Data</span>
        <div className="flex items-center gap-2">
          <button className="btn btn-outline btn-sm gap-1.5 h-8 min-h-0 rounded-xl text-xs" onClick={() => router.push("/Admin/rfq")}>Cancel</button>
          <button className="btn btn-primary btn-sm gap-1.5 h-8 min-h-0 rounded-xl text-xs" onClick={handleSubmit} disabled={saving}>
            {saving ? <><span className="loading loading-spinner loading-xs" />Saving...</> : <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Save</>}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold tracking-[0.12em] uppercase text-base-content/40 pl-1">RFQ Number</label>
          <input type="text" className="input input-bordered input-sm h-9 rounded-xl text-sm bg-base-200 border-base-300 focus:border-primary focus:bg-base-100 transition-colors" value={form.rfq_number || ""} onChange={(e) => handleChange("rfq_number", e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold tracking-[0.12em] uppercase text-base-content/40 pl-1">Buyer Company</label>
          <input type="text" className="input input-bordered input-sm h-9 rounded-xl text-sm bg-base-200 border-base-300 focus:border-primary focus:bg-base-100 transition-colors" value={form.buyer_company_name || ""} onChange={(e) => handleChange("buyer_company_name", e.target.value)} />
        </div>
      </div>

      {/* Summary dropdown (mobile only) */}
      <div className="lg:hidden">
        <button className="w-full flex items-center justify-between px-3 py-2.5 bg-base-200 rounded-xl border border-base-300 hover:border-primary transition-colors" onClick={() => setSummaryOpen((v) => !v)}>
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg>
            <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-base-content/40">Summary</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-success tabular-nums">{fmt(grandTotal)}</span>
            <svg className={`w-3.5 h-3.5 text-base-content/40 transition-transform duration-200 ${summaryOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </div>
        </button>
        <div className={`overflow-hidden transition-all duration-300 ${summaryOpen ? "max-h-80 mt-2" : "max-h-0"}`}>
          <div className="bg-base-100 rounded-xl border border-base-300 px-3 py-2 flex flex-col divide-y divide-base-200">
            {[{ key: "RFQ Number", val: form.rfq_number || "—" }, { key: "Buyer", val: form.buyer_company_name || "—" }, { key: "Vendor", val: form.vendor_company_name || "—" }, { key: "Items", val: `${form.line_items?.length || 0} รายการ` }].map((row) => (
              <div key={row.key} className="flex justify-between items-center py-2">
                <span className="text-xs text-base-content/40">{row.key}</span>
                <span className="text-xs font-medium text-right max-w-[55%] truncate">{row.val}</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 pb-1">
              <span className="text-xs font-semibold text-success/70">Grand Total</span>
              <span className="text-sm font-bold text-success tabular-nums">{fmt(grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="flex flex-col gap-2 flex-1 min-h-0">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-base-content/40 pl-1">
            Line Items<span className="ml-2 px-1.5 py-0.5 bg-base-200 rounded-md text-base-content/50 normal-case tracking-normal">{form.line_items?.length || 0}</span>
          </span>
          <button className="btn btn-ghost btn-xs h-7 min-h-0 rounded-lg gap-1 text-primary text-xs font-medium hover:bg-primary/10" onClick={addItem}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            เพิ่มรายการ
          </button>
        </div>
        <div className="rounded-xl border border-base-300 overflow-hidden flex-1 min-h-0 flex flex-col">
          <div className="overflow-auto flex-1 min-h-0">
            <table className="table table-sm w-full min-w-205">
              <thead className="sticky top-0 bg-base-200 z-10">
                <tr className="border-b border-base-300">
                  <th className="text-[10px] tracking-widest uppercase text-base-content/40 font-semibold py-2.5 w-8">#</th>
                  <th className="text-[10px] tracking-widest uppercase text-base-content/40 font-semibold py-2.5">Description</th>
                  <th className="text-[10px] tracking-widest uppercase text-base-content/40 font-semibold py-2.5 text-center w-20">Qty</th>
                  <th className="text-[10px] tracking-widest uppercase text-base-content/40 font-semibold py-2.5 w-20">Unit</th>
                  <th className="text-[10px] tracking-widest uppercase text-base-content/40 font-semibold py-2.5 text-right w-28">Unit Price</th>
                  <th className="text-[10px] tracking-widest uppercase text-base-content/40 font-semibold py-2.5 text-right w-28">Total</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {form.line_items?.length > 0 ? (
                  form.line_items.map((item: any, i: number) => {
                    const total = calcItemTotal(item.quantity, item.unit_price);
                    return (
                      <tr key={i} className="border-b border-base-200 hover:bg-base-50 transition-colors group">
                        <td className="text-xs font-semibold text-base-content/40 py-1.5">{i + 1}</td>
                        <td className="py-1.5"><input type="text" value={item.description || ""} onChange={(e) => handleLineChange(i, "description", e.target.value)} placeholder="รายละเอียด..." className="input input-sm h-8 w-full rounded-lg bg-transparent border-transparent hover:border-base-300 focus:border-primary focus:bg-base-100 transition-all text-xs" /></td>
                        <td className="py-1.5"><input type="text" inputMode="decimal" value={focusedLineField === `${i}-qty` ? String(item.quantity || "") : fmtCurrency(item.quantity || 0)} onFocus={() => setFocusedLineField(`${i}-qty`)} onBlur={() => setFocusedLineField("")} onChange={(e) => handleLineChange(i, "quantity", e.target.value)} className="input input-sm h-8 w-full rounded-lg bg-transparent border-transparent hover:border-base-300 focus:border-primary focus:bg-base-100 transition-all text-xs text-center" /></td>
                        <td className="py-1.5"><input type="text" value={item.unit || ""} onChange={(e) => handleLineChange(i, "unit", e.target.value)} placeholder="unit" className="input input-sm h-8 w-full rounded-lg bg-transparent border-transparent hover:border-base-300 focus:border-primary focus:bg-base-100 transition-all text-xs" /></td>
                        <td className="py-1.5"><input type="text" inputMode="decimal" value={focusedLineField === `${i}-price` ? String(item.unit_price || "") : fmtCurrency(item.unit_price || 0)} onFocus={() => setFocusedLineField(`${i}-price`)} onBlur={() => setFocusedLineField("")} onChange={(e) => handleLineChange(i, "unit_price", e.target.value)} className="input input-sm h-8 w-full rounded-lg bg-transparent border-transparent hover:border-base-300 focus:border-primary focus:bg-base-100 transition-all text-xs text-right" /></td>
                        <td className="text-right text-xs font-semibold text-primary py-1.5 tabular-nums">{fmt(total)}</td>
                        <td className="py-1.5">
                          <button className="btn btn-ghost btn-xs h-7 min-h-0 w-7 rounded-lg p-0 text-base-content/30 hover:text-error hover:bg-error/10 opacity-0 group-hover:opacity-100 transition-all" onClick={() => removeItem(i)}>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan={7} className="py-10 text-center"><div className="flex flex-col items-center gap-2 text-base-content/25"><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg><span className="text-xs">ไม่มีรายการสินค้า</span></div></td></tr>
                )}
              </tbody>
              <tfoot className="sticky bottom-0 bg-base-200 border-t border-base-300">
                <tr>
                  <td colSpan={5} className="text-right text-[10px] font-semibold tracking-widest uppercase text-base-content/40 py-2.5">Grand Total</td>
                  <td className="text-right py-2.5"><span className="text-sm font-bold text-success tabular-nums">{fmt(grandTotal)}</span></td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Real Chat Panel ────────────────────────────────────────
  const ChatPanel = ({ className = "" }: { className?: string }) => (
    <div className={`bg-base-100 rounded-2xl border border-base-300 flex flex-col overflow-hidden ${className}`}>

      {/* Header + user selector */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-base-200 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-base-content/40">Messages</span>
          {selectedUserId && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-success/10 rounded-md">
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-[10px] text-success font-medium">Live</span>
            </div>
          )}
        </div>

        {/* User selector */}
        {loadingUsers ? (
          <div className="skeleton h-7 w-32 rounded-lg" />
        ) : chatUsers.length === 0 ? (
          <span className="text-[10px] text-base-content/30">No users</span>
        ) : (
          <div className="relative">
            <select
              className="select select-bordered select-xs h-7 min-h-0 rounded-lg pr-7 pl-2 text-xs bg-base-200 border-base-300 focus:border-primary max-w-45"
              value={selectedUserId || ""}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              {chatUsers.map((u) => (
                <option key={u.userId} value={u.userId}>
                  {u.user?.name || u.user?.email || "Unknown"}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Messages area */}
      {!selectedUserId ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-base-content/25">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="text-xs">Select a user to chat</span>
        </div>
      ) : (
        <>
          {/* Messages */}
          <div
            ref={chatContainerRef}
            onScroll={handleChatScroll}
            className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2 min-h-0"
          >
            {chats.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-1.5 text-base-content/25 py-8">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="text-xs">No messages yet</span>
              </div>
            ) : (
              chats.map((chat) => {
                const isAdmin = chat.senderRole === "admin";
                return (
                  <div key={chat._id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[82%] flex flex-col gap-0.5 ${isAdmin ? "items-end" : "items-start"}`}>
                      <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                        isAdmin
                          ? "bg-primary text-primary-content rounded-tr-sm"
                          : "bg-base-200 text-base-content/80 rounded-tl-sm"
                      }`}>
                        {chat.message}
                      </div>
                      <span className="text-[10px] text-base-content/30 px-1">{fmtTime(chat.createdAt)}</span>
                    </div>
                  </div>
                );
              })
            )}

            {/* New message button */}
            {showNewMsgBtn && (
              <div className="sticky bottom-2 flex justify-center">
                <button
                  onClick={scrollToBottom}
                  className="btn btn-primary btn-xs h-7 min-h-0 rounded-full shadow-lg gap-1 text-xs px-3"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  New message
                </button>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 px-4 py-3 border-t border-base-200 shrink-0">
            <input
              type="text"
              placeholder="พิมพ์ข้อความ... (Enter ส่ง)"
              className="input input-bordered input-sm h-8 flex-1 rounded-xl text-xs bg-base-200 border-transparent focus:border-primary focus:bg-base-100 transition-colors"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
            />
            <button
              className="btn btn-primary btn-sm h-8 min-h-0 rounded-xl px-3"
              onClick={sendChatMessage}
              disabled={!chatMessage.trim()}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  );

  // ── Tab config ─────────────────────────────────────────────
  const tabs = [
    { key: "pdf" as const, label: "PDF", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
    { key: "edit" as const, label: "แก้ไข", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg> },
    { key: "chat" as const, label: "Chat", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg> },
  ];

  // ── UI ─────────────────────────────────────────────────────
  return (
    <>
      {/* ─── MOBILE (< lg) ─── */}
      <div className="lg:hidden flex flex-col h-screen bg-base-200 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2.5 bg-base-100 border-b border-base-300 shrink-0">
          <button className="btn btn-ghost btn-xs h-7 min-h-0 gap-1 rounded-lg text-xs text-base-content/60" onClick={() => router.push("/Admin/rfq")}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            กลับ
          </button>
          <span className="text-xs font-semibold text-base-content/70 truncate max-w-35">{form.rfq_number || "RFQ"}</span>
          <button className="btn btn-primary btn-xs h-7 min-h-0 rounded-lg gap-1 text-xs" onClick={handleSubmit} disabled={saving}>
            {saving ? <span className="loading loading-spinner loading-xs" /> : <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
            Save
          </button>
        </div>

        <div className="flex bg-base-100 border-b border-base-300 shrink-0">
          {tabs.map((tab) => (
            <button key={tab.key} className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold tracking-wider uppercase transition-colors ${mobileTab === tab.key ? "text-primary border-b-2 border-primary" : "text-base-content/40 border-b-2 border-transparent hover:text-base-content/60"}`} onClick={() => setMobileTab(tab.key)}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-hidden p-3">
          {mobileTab === "pdf" && <PdfPanel className="h-full" />}
          {mobileTab === "edit" && <div className="h-full overflow-auto"><EditPanel className="min-h-full" /></div>}
          {mobileTab === "chat" && <ChatPanel className="h-full" />}
        </div>
      </div>

      {/* ─── DESKTOP (≥ lg) ─── */}
      <div className="hidden lg:grid h-screen bg-base-200 p-4 gap-4 grid-cols-[42%_1fr] grid-rows-[1fr_380px] overflow-hidden">

        {/* LEFT: PDF (full height) */}
        <div ref={pdfRef} className="bg-base-100 rounded-2xl border border-base-300 flex flex-col gap-3 p-4 row-span-2 overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-base-content/40">Original Document</span>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-error/10 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-error" />
              <span className="text-[10px] font-semibold text-error">PDF</span>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-base-200 rounded-xl border border-base-300">
            <svg className="w-3.5 h-3.5 text-base-content/40 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <span className="text-xs text-base-content/60 truncate">{form.filename || "ไม่มีไฟล์ PDF"}</span>
          </div>
          <div className="flex-1 rounded-xl overflow-hidden border border-base-300 bg-base-200 min-h-0">
            {form.filename ? (
              <iframe src={`/api/pdf/view?filename=${encodeURIComponent(form.filename)}`} className="w-full h-full" />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-base-content/30">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <span className="text-xs">ไม่มีไฟล์ PDF</span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT TOP: RFQ Data */}
        <div className="bg-base-100 rounded-2xl border border-base-300 flex flex-col gap-4 p-4 overflow-hidden min-h-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-base-content/40">RFQ Data</span>
            <div className="flex items-center gap-2">
              <button className="btn btn-outline btn-sm gap-1.5 h-8 min-h-0 rounded-xl text-xs" onClick={() => router.push("/Admin/rfq")}>Cancel</button>
              <button className="btn btn-primary btn-sm gap-1.5 h-8 min-h-0 rounded-xl text-xs" onClick={handleSubmit} disabled={saving}>
                {saving ? <><span className="loading loading-spinner loading-xs" />Saving...</> : <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Save</>}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold tracking-[0.12em] uppercase text-base-content/40 pl-1">RFQ Number</label>
              <input type="text" className="input input-bordered input-sm h-9 rounded-xl text-sm bg-base-200 border-base-300 focus:border-primary focus:bg-base-100 transition-colors" value={form.rfq_number || ""} onChange={(e) => handleChange("rfq_number", e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold tracking-[0.12em] uppercase text-base-content/40 pl-1">Buyer Company</label>
              <input type="text" className="input input-bordered input-sm h-9 rounded-xl text-sm bg-base-200 border-base-300 focus:border-primary focus:bg-base-100 transition-colors" value={form.buyer_company_name || ""} onChange={(e) => handleChange("buyer_company_name", e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-2 flex-1 min-h-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-base-content/40 pl-1">
                Line Items<span className="ml-2 px-1.5 py-0.5 bg-base-200 rounded-md text-base-content/50 normal-case tracking-normal">{form.line_items?.length || 0}</span>
              </span>
              <button className="btn btn-ghost btn-xs h-7 min-h-0 rounded-lg gap-1 text-primary text-xs font-medium hover:bg-primary/10" onClick={addItem}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                เพิ่มรายการ
              </button>
            </div>
            <div className="rounded-xl border border-base-300 overflow-hidden flex-1 min-h-0 flex flex-col">
              <div className="overflow-auto flex-1 min-h-0">
                <table className="table table-sm w-full min-w-205">
                  <thead className="sticky top-0 bg-base-200 z-10">
                    <tr className="border-b border-base-300">
                      <th className="text-[10px] tracking-widest uppercase text-base-content/40 font-semibold py-2.5 w-8">#</th>
                      <th className="text-[10px] tracking-widest uppercase text-base-content/40 font-semibold py-2.5">Description</th>
                      <th className="text-[10px] tracking-widest uppercase text-base-content/40 font-semibold py-2.5 text-center w-20">Qty</th>
                      <th className="text-[10px] tracking-widest uppercase text-base-content/40 font-semibold py-2.5 w-20">Unit</th>
                      <th className="text-[10px] tracking-widest uppercase text-base-content/40 font-semibold py-2.5 text-right w-28">Unit Price</th>
                      <th className="text-[10px] tracking-widest uppercase text-base-content/40 font-semibold py-2.5 text-right w-28">Total</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {form.line_items?.length > 0 ? (
                      form.line_items.map((item: any, i: number) => {
                        const total = calcItemTotal(item.quantity, item.unit_price);
                        return (
                          <tr key={i} className="border-b border-base-200 hover:bg-base-50 transition-colors group">
                            <td className="text-xs font-semibold text-base-content/40 py-1.5">{i + 1}</td>
                            <td className="py-1.5"><input type="text" value={item.description || ""} onChange={(e) => handleLineChange(i, "description", e.target.value)} placeholder="รายละเอียด..." className="input input-sm h-8 w-full rounded-lg bg-transparent border-transparent hover:border-base-300 focus:border-primary focus:bg-base-100 transition-all text-xs" /></td>
                            <td className="py-1.5"><input type="text" inputMode="decimal" value={focusedLineField === `${i}-qty` ? String(item.quantity || "") : fmtCurrency(item.quantity || 0)} onFocus={() => setFocusedLineField(`${i}-qty`)} onBlur={() => setFocusedLineField("")} onChange={(e) => handleLineChange(i, "quantity", e.target.value)} className="input input-sm h-8 w-full rounded-lg bg-transparent border-transparent hover:border-base-300 focus:border-primary focus:bg-base-100 transition-all text-xs text-center" /></td>
                            <td className="py-1.5"><input type="text" value={item.unit || ""} onChange={(e) => handleLineChange(i, "unit", e.target.value)} placeholder="unit" className="input input-sm h-8 w-full rounded-lg bg-transparent border-transparent hover:border-base-300 focus:border-primary focus:bg-base-100 transition-all text-xs" /></td>
                            <td className="py-1.5"><input type="text" inputMode="decimal" value={focusedLineField === `${i}-price` ? String(item.unit_price || "") : fmtCurrency(item.unit_price || 0)} onFocus={() => setFocusedLineField(`${i}-price`)} onBlur={() => setFocusedLineField("")} onChange={(e) => handleLineChange(i, "unit_price", e.target.value)} className="input input-sm h-8 w-full rounded-lg bg-transparent border-transparent hover:border-base-300 focus:border-primary focus:bg-base-100 transition-all text-xs text-right" /></td>
                            <td className="text-right text-xs font-semibold text-primary py-1.5 tabular-nums">{fmt(total)}</td>
                            <td className="py-1.5">
                              <button className="btn btn-ghost btn-xs h-7 min-h-0 w-7 rounded-lg p-0 text-base-content/30 hover:text-error hover:bg-error/10 opacity-0 group-hover:opacity-100 transition-all" onClick={() => removeItem(i)}>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr><td colSpan={7} className="py-10 text-center"><div className="flex flex-col items-center gap-2 text-base-content/25"><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg><span className="text-xs">ไม่มีรายการสินค้า</span></div></td></tr>
                    )}
                  </tbody>
                  <tfoot className="sticky bottom-0 bg-base-200 border-t border-base-300">
                    <tr>
                      <td colSpan={5} className="text-right text-[10px] font-semibold tracking-widest uppercase text-base-content/40 py-2.5">Grand Total</td>
                      <td className="text-right py-2.5"><span className="text-sm font-bold text-success tabular-nums">{fmt(grandTotal)}</span></td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT BOTTOM: Summary + Live Chat */}
        <div className="grid grid-cols-2 gap-4 overflow-hidden min-h-0">

          {/* Summary */}
          <div className="bg-base-100 rounded-2xl border border-base-300 p-4 flex flex-col gap-3 overflow-hidden">
            <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-base-content/40">Summary</span>
            <div className="flex flex-col divide-y divide-base-200 flex-1">
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
            <div className="flex items-center justify-between px-3 py-2.5 bg-success/8 border border-success/20 rounded-xl">
              <span className="text-xs font-semibold text-success/70">Grand Total</span>
              <span className="text-sm font-bold text-success tabular-nums">{fmt(grandTotal)}</span>
            </div>
          </div>

          {/* Live Chat */}
          <ChatPanel className="min-h-0" />
        </div>
      </div>
    </>
  );
}
