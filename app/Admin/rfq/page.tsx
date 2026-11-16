"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import UploadForCustomerModal from "@/components/admin/UploadForCustomerModal";
import CustomerListModal from "@/components/admin/CustomerListModal";

type FilterTab = "all" | "pending";
type Folder = { _id: string; name: string; parentId: string | null };

export default function RFQListPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<any[]>([]);
  // ── Folders (File Explorer style) ──
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showMove, setShowMove] = useState(false);
  const [busyFolder, setBusyFolder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [showUpload, setShowUpload] = useState(false);
  const [showCustomers, setShowCustomers] = useState(false);
  // userId → customer info (for the hold-to-peek tooltip)
  const [customerMap, setCustomerMap] = useState<Record<string, { email: string; name?: string }>>({});
  const [hoverTip, setHoverTip] = useState<{ id: string; x: number; y: number } | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // userId → ISO timestamp ของข้อความล่าสุด
  const [chatTimes, setChatTimes] = useState<Record<string, string>>({});
  // userId → ms timestamp ที่ admin เคยกดเข้าไปดูล่าสุด
  const [seenAt, setSeenAt] = useState<Record<string, number>>({});
  // userId → มี quotation status "sent" ค้างอยู่หรือไม่
  const [pendingUserIds, setPendingUserIds] = useState<Set<string>>(new Set());
  const router = useRouter();

  // โหลด "เคยดูแล้ว" จาก localStorage
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("admin_seen_chats") || "{}");
      setSeenAt(stored);
    } catch {}
  }, []);

  // silent = no full-page spinner — the loading early-return unmounts everything
  // (including an open modal, wiping its one-time credentials)
  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [rfqRes, chatRes, quotationRes] = await Promise.all([
        fetch("/api/rfq"),
        fetch("/api/chat/users", { cache: "no-store" }),
        fetch("/api/quotation/all", { cache: "no-store" }),
      ]);
      if (!rfqRes.ok) throw new Error("Failed to fetch");
      const result = await rfqRes.json();
      setData(Array.isArray(result) ? result : []);
      if (chatRes.ok) {
        const chatData = await chatRes.json();
        const users: any[] = chatData.users ?? chatData;
        const times: Record<string, string> = {};
        users.forEach((u) => { if (u.latestUserMessageTime) times[u.userId] = u.latestUserMessageTime; });
        setChatTimes(times);
      }
      if (quotationRes.ok) {
        const { quotations } = await quotationRes.json();
        const pending = new Set<string>(
          (quotations ?? [])
            .filter((q: any) => q.status === "sent")
            .map((q: any) => q.userId as string)
        );
        setPendingUserIds(pending);
      }
      try {
        const folderRes = await fetch("/api/rfq-folders", { cache: "no-store" });
        if (folderRes.ok) setFolders(await folderRes.json());
      } catch {}
      // customer emails for the hold-to-peek tooltip — 403 for staff without
      // quotation permission is fine, the tooltip just shows less
      try {
        const cusRes = await fetch("/api/customers", { cache: "no-store" });
        if (cusRes.ok) {
          const customers: { _id: string; email: string; name?: string }[] = await cusRes.json();
          const map: Record<string, { email: string; name?: string }> = {};
          customers.forEach((c) => { map[c._id] = { email: c.email, name: c.name }; });
          setCustomerMap(map);
        }
      } catch {}
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const sessionUser = session?.user as { role?: string; permissions?: string[] } | undefined;
  const canUploadForCustomer =
    sessionUser?.role === "admin" ||
    (sessionUser?.role === "employee" && sessionUser?.permissions?.includes("quotation"));

  const hasNewChat = (userId: string) => {
    if (!chatTimes[userId]) return false;
    const seen = seenAt[userId] ?? 0;
    return new Date(chatTimes[userId]).getTime() > seen;
  };

  const markSeen = (userId: string) => {
    if (!userId) return;
    const updated = { ...seenAt, [userId]: Date.now() };
    setSeenAt(updated);
    try { localStorage.setItem("admin_seen_chats", JSON.stringify(updated)); } catch {}
  };

  const isPending = (userId: string) => pendingUserIds.has(userId);

  // hold-to-peek: hover a row for 1.5s → tooltip with customer email + submitted date
  const startHover = (id: string, x: number, y: number) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => setHoverTip({ id, x, y }), 1500);
  };
  const cancelHover = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setHoverTip(null);
  };

  const pendingCount = data.filter((item) => isPending(item.USER_ID)).length;

  const searchQuery = search.trim().toLowerCase();

  const filtered = data.filter((item) => {
    if (activeFilter === "pending" && !isPending(item.USER_ID)) return false;
    // searching looks across every folder; otherwise show only this folder's contents
    if (!searchQuery) return (item.folderId ?? null) === currentFolderId;
    return (
      (item.rfq_number || "").toLowerCase().includes(searchQuery) ||
      (item.buyer_company_name || "").toLowerCase().includes(searchQuery) ||
      (item.vendor_company_name || "").toLowerCase().includes(searchQuery)
    );
  });

  // ── Folder helpers ──────────────────────────────────────────
  const childFolders = searchQuery
    ? []
    : folders.filter((f) => (f.parentId ?? null) === currentFolderId);

  const folderById = (id: string | null) => folders.find((f) => f._id === id) ?? null;

  // root → … → current
  const breadcrumb: Folder[] = (() => {
    const trail: Folder[] = [];
    let cur = folderById(currentFolderId);
    while (cur) {
      trail.unshift(cur);
      cur = folderById(cur.parentId);
    }
    return trail;
  })();

  const countInFolder = (folderId: string) => {
    // direct children only — cheap and matches what the row represents
    const rfqs = data.filter((d) => (d.folderId ?? null) === folderId).length;
    const subs = folders.filter((f) => (f.parentId ?? null) === folderId).length;
    return { rfqs, subs };
  };

  const openFolder = (id: string | null) => {
    setCurrentFolderId(id);
    setSelected(new Set());
    setSearch("");
  };

  const createFolder = async () => {
    // ponytail: prompt() instead of a modal — internal admin tool, one text field
    const name = prompt("ชื่อโฟลเดอร์ใหม่ (เช่น เอกชน, โรงเรียน, อ.1)");
    if (!name?.trim()) return;
    setBusyFolder(true);
    try {
      const res = await fetch("/api/rfq-folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, parentId: currentFolderId }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) { alert(d?.message ?? "สร้างโฟลเดอร์ไม่สำเร็จ"); return; }
      setFolders((prev) => [...prev, d]);
    } finally { setBusyFolder(false); }
  };

  const renameFolder = async (f: Folder) => {
    const name = prompt("เปลี่ยนชื่อโฟลเดอร์", f.name);
    if (!name?.trim() || name === f.name) return;
    const res = await fetch(`/api/rfq-folders/${f._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const d = await res.json().catch(() => null);
    if (!res.ok) { alert(d?.message ?? "เปลี่ยนชื่อไม่สำเร็จ"); return; }
    setFolders((prev) => prev.map((x) => (x._id === f._id ? { ...x, name: d.name } : x)));
  };

  const deleteFolder = async (f: Folder) => {
    if (!confirm(`ลบโฟลเดอร์ "${f.name}"?`)) return;
    const res = await fetch(`/api/rfq-folders/${f._id}`, { method: "DELETE" });
    const d = await res.json().catch(() => null);
    if (!res.ok) { alert(d?.message ?? "ลบไม่สำเร็จ"); return; }
    setFolders((prev) => prev.filter((x) => x._id !== f._id));
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const moveSelected = async (folderId: string | null) => {
    setBusyFolder(true);
    try {
      const ids = [...selected];
      const res = await fetch("/api/rfq/move", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, folderId }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) { alert(d?.message ?? "ย้ายไม่สำเร็จ"); return; }
      setData((prev) => prev.map((x) => (ids.includes(x._id) ? { ...x, folderId } : x)));
      setSelected(new Set());
      setShowMove(false);
    } finally { setBusyFolder(false); }
  };

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
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-base-content tracking-tight">RFQ List</h1>
            {pendingCount > 0 && (
              <span className="badge badge-error badge-sm text-[10px] font-bold animate-pulse">
                {pendingCount} ค้าง
              </span>
            )}
          </div>
          <p className="text-[11px] text-base-content/40 mt-0.5">
            {data.length} document{data.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canUploadForCustomer && (
            <>
              <button
                className="btn btn-ghost btn-sm h-9 min-h-0 rounded-xl gap-1.5 text-xs font-semibold border border-base-300"
                onClick={() => setShowCustomers(true)}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                บัญชีลูกค้า
              </button>
              <button
                className="btn btn-accent btn-sm h-9 min-h-0 rounded-xl gap-1.5 text-xs font-semibold"
                onClick={() => setShowUpload(true)}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                อัปโหลดแทนลูกค้า
              </button>
            </>
          )}
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
      </div>

      {showUpload && (
        <UploadForCustomerModal
          onClose={() => setShowUpload(false)}
          onDone={() => fetchData(true)}
        />
      )}

      {showCustomers && <CustomerListModal onClose={() => setShowCustomers(false)} />}

      {/* hold-to-peek tooltip (desktop) */}
      {hoverTip && (() => {
        const item = data.find((d) => d._id === hoverTip.id);
        if (!item) return null;
        const cus = customerMap[item.USER_ID];
        return (
          <div
            className="fixed z-50 pointer-events-none rounded-xl bg-neutral text-neutral-content shadow-lg px-3.5 py-2.5 text-xs space-y-0.5"
            style={{ left: hoverTip.x + 14, top: hoverTip.y + 14 }}
          >
            <p className="font-semibold">{cus?.name || 'ไม่พบข้อมูลลูกค้า'}</p>
            {cus?.email && <p className="font-mono opacity-80">{cus.email}</p>}
            <p className="opacity-60">
              ส่งเมื่อ {item.createdAt
                ? new Date(item.createdAt).toLocaleString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                : '-'}
            </p>
          </div>
        );
      })()}

      {/* ── Filter tabs ── */}
      <div className="flex items-center gap-2">
        <div role="tablist" className="tabs tabs-boxed bg-base-100 border border-base-300 p-1 gap-1 rounded-xl">
          <button
            role="tab"
            className={`tab h-7 min-h-0 text-xs font-semibold rounded-lg transition-all ${activeFilter === "all" ? "tab-active" : ""}`}
            onClick={() => setActiveFilter("all")}
          >
            ทั้งหมด
            <span className="ml-1.5 text-[10px] opacity-50">({data.length})</span>
          </button>
          <button
            role="tab"
            className={`tab h-7 min-h-0 text-xs font-semibold rounded-lg transition-all ${activeFilter === "pending" ? "tab-active" : ""}`}
            onClick={() => setActiveFilter("pending")}
          >
            งานค้าง
            {pendingCount > 0 && (
              <span className="ml-1.5 badge badge-error badge-xs text-[9px] px-1">{pendingCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* ── Breadcrumb + folder actions ── */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1 text-xs flex-wrap min-w-0">
          <button
            onClick={() => openFolder(null)}
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors ${
              currentFolderId === null ? "text-base-content font-semibold" : "text-base-content/50 hover:bg-base-100"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l9-9 9 9M5 10v10h14V10" />
            </svg>
            ทั้งหมด
          </button>
          {breadcrumb.map((f) => (
            <span key={f._id} className="flex items-center gap-1 min-w-0">
              <span className="text-base-content/25">/</span>
              <button
                onClick={() => openFolder(f._id)}
                className={`px-2 py-1 rounded-lg truncate max-w-40 transition-colors ${
                  f._id === currentFolderId ? "text-base-content font-semibold" : "text-base-content/50 hover:bg-base-100"
                }`}
              >
                {f.name}
              </button>
            </span>
          ))}
        </div>
        <button
          onClick={createFolder}
          disabled={busyFolder}
          className="btn btn-ghost btn-sm h-8 min-h-0 rounded-xl gap-1.5 text-xs font-semibold border border-base-300 shrink-0"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11v4m2-2h-4" />
          </svg>
          สร้างโฟลเดอร์
        </button>
      </div>

      {/* ── Selection action bar ── */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-2 flex-wrap bg-primary/10 border border-primary/20 rounded-xl px-4 py-2.5">
          <span className="text-xs font-semibold text-primary">เลือก {selected.size} รายการ</span>
          <div className="flex items-center gap-2">
            <button className="btn btn-ghost btn-xs rounded-lg" onClick={() => setSelected(new Set())}>
              ยกเลิก
            </button>
            <button className="btn btn-primary btn-xs rounded-lg gap-1.5" onClick={() => setShowMove(true)}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
              </svg>
              ย้ายไปโฟลเดอร์
            </button>
          </div>
        </div>
      )}

      {/* ── Move modal ── */}
      {showMove && (
        <div className="modal modal-open modal-bottom sm:modal-middle">
          <div className="modal-box rounded-3xl max-w-md">
            <h3 className="font-medium text-lg tracking-mc mb-1">ย้าย {selected.size} รายการไปที่</h3>
            <p className="text-xs text-base-content/40 mb-4">เลือกโฟลเดอร์ปลายทาง</p>
            <div className="max-h-72 overflow-y-auto rounded-2xl border border-base-200 divide-y divide-base-200">
              <button
                onClick={() => moveSelected(null)}
                disabled={busyFolder}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-base-200/60 transition-colors"
              >
                ทั้งหมด <span className="text-base-content/40">(ไม่อยู่ในโฟลเดอร์)</span>
              </button>
              {folders.map((f) => {
                // indent by depth so the tree reads correctly in a flat list
                let depth = 0;
                let p = folderById(f.parentId);
                while (p) { depth++; p = folderById(p.parentId); }
                return (
                  <button
                    key={f._id}
                    onClick={() => moveSelected(f._id)}
                    disabled={busyFolder}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-base-200/60 transition-colors flex items-center gap-2"
                    style={{ paddingLeft: `${16 + depth * 16}px` }}
                  >
                    <svg className="w-3.5 h-3.5 text-warning shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                    </svg>
                    {f.name}
                  </button>
                );
              })}
            </div>
            <div className="modal-action">
              <button className="btn btn-ghost btn-sm" onClick={() => setShowMove(false)}>ปิด</button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowMove(false)} />
        </div>
      )}

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

        {filtered.length === 0 && childFolders.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-base-content/25">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm font-medium">
              {search ? "No results found" : currentFolderId ? "โฟลเดอร์นี้ยังว่าง" : "No RFQ documents yet"}
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
                    <th className="w-10 pl-4 py-3">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-xs"
                        aria-label="เลือกทั้งหมด"
                        checked={filtered.length > 0 && filtered.every((i) => selected.has(i._id))}
                        onChange={(e) =>
                          setSelected(e.target.checked ? new Set(filtered.map((i) => i._id)) : new Set())
                        }
                      />
                    </th>
                    <th className="text-[10px] tracking-widest uppercase text-base-content/40 font-semibold py-3 pl-1">#</th>
                    <th className="text-[10px] tracking-widest uppercase text-base-content/40 font-semibold py-3">RFQ Number</th>
                    <th className="text-[10px] tracking-widest uppercase text-base-content/40 font-semibold py-3">Buyer</th>
                    <th className="text-[10px] tracking-widest uppercase text-base-content/40 font-semibold py-3">Vendor</th>
                    <th className="text-[10px] tracking-widest uppercase text-base-content/40 font-semibold py-3 text-center">Items</th>
                    <th className="text-[10px] tracking-widest uppercase text-base-content/40 font-semibold py-3 text-right pr-5">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Folder rows first, File Explorer style */}
                  {childFolders.map((f) => {
                    const { rfqs, subs } = countInFolder(f._id);
                    return (
                      <tr
                        key={f._id}
                        className="border-b border-base-200 cursor-pointer transition-colors hover:bg-warning/5 group/folder"
                        onClick={() => openFolder(f._id)}
                      >
                        <td />
                        <td className="pl-1 py-3.5" />
                        <td className="py-3.5" colSpan={3}>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-warning/15 flex items-center justify-center shrink-0">
                              <svg className="w-4 h-4 text-warning" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                              </svg>
                            </div>
                            <span className="text-sm font-semibold text-base-content">{f.name}</span>
                            <span className="text-[11px] text-base-content/35">
                              {rfqs} รายการ{subs > 0 ? ` · ${subs} โฟลเดอร์` : ""}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 pr-5 text-right">
                          <div
                            className="inline-flex items-center gap-1 opacity-60 md:opacity-0 md:group-hover/folder:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              className="btn btn-ghost btn-xs btn-square rounded-lg"
                              title="เปลี่ยนชื่อ"
                              onClick={() => renameFolder(f)}
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              className="btn btn-ghost btn-xs btn-square rounded-lg text-error"
                              title="ลบ"
                              onClick={() => deleteFolder(f)}
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filtered.map((item, idx) => {
                    const total = grandTotal(item);
                    const itemCount = item.line_items?.length || 0;
                    const pending = isPending(item.USER_ID);
                    return (
                      <tr
                        key={item._id}
                        className={`border-b border-base-200 last:border-0 cursor-pointer transition-colors group ${
                          pending ? "bg-error/3 hover:bg-error/6" : "hover:bg-base-50"
                        }`}
                        onClick={() => { markSeen(item.USER_ID); router.push(`/Admin/edit/${item._id}`); }}
                        onMouseEnter={(e) => startHover(item._id, e.clientX, e.clientY)}
                        onMouseLeave={cancelHover}
                      >
                        <td className="pl-4 py-3.5 w-10" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="checkbox checkbox-xs"
                            aria-label={`เลือก ${item.rfq_number ?? ""}`}
                            checked={selected.has(item._id)}
                            onChange={() => toggleSelect(item._id)}
                          />
                        </td>
                        <td className="pl-1 py-3.5 w-10">
                          {pending ? (
                            <span className="w-2 h-2 rounded-full bg-error block mx-auto animate-pulse" />
                          ) : (
                            <span className="text-xs font-semibold text-base-content/30 tabular-nums">{idx + 1}</span>
                          )}
                        </td>
                        <td className="py-3.5">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${pending ? "bg-error/15" : "bg-primary/10"}`}>
                              <svg className={`w-3.5 h-3.5 ${pending ? "text-error" : "text-primary"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <span className="text-sm font-semibold transition-colors group-hover:text-primary text-base-content">
                              {item.rfq_number || <span className="text-base-content/30 font-normal">—</span>}
                            </span>
                            {pending && (
                              <span className="badge badge-error badge-sm text-[9px] font-bold">ค้าง</span>
                            )}
                            {hasNewChat(item.USER_ID) && (
                              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-primary/10 rounded-md">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                <span className="text-[9px] text-primary font-medium">Chat</span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 text-sm text-base-content/70 max-w-45 truncate">
                          {item.buyer_company_name || <span className="text-base-content/30">—</span>}
                        </td>
                        <td className="py-3.5 text-sm text-base-content/70 max-w-45 truncate">
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
              {childFolders.map((f) => {
                const { rfqs, subs } = countInFolder(f._id);
                return (
                  <div
                    key={f._id}
                    className="flex items-center gap-3 px-4 py-3.5 cursor-pointer active:bg-base-200 transition-colors"
                    onClick={() => openFolder(f._id)}
                  >
                    <div className="w-9 h-9 rounded-xl bg-warning/15 flex items-center justify-center shrink-0">
                      <svg className="w-4.5 h-4.5 text-warning" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{f.name}</p>
                      <p className="text-[11px] text-base-content/40 mt-0.5">
                        {rfqs} รายการ{subs > 0 ? ` · ${subs} โฟลเดอร์` : ""}
                      </p>
                    </div>
                    <button
                      className="btn btn-ghost btn-xs btn-square rounded-lg text-error shrink-0"
                      onClick={(e) => { e.stopPropagation(); deleteFolder(f); }}
                      aria-label="ลบโฟลเดอร์"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    <svg className="w-4 h-4 text-base-content/20 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                );
              })}

              {filtered.map((item) => {
                const total = grandTotal(item);
                const itemCount = item.line_items?.length || 0;
                const pending = isPending(item.USER_ID);
                return (
                  <div
                    key={item._id}
                    className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors ${
                      pending ? "bg-error/3 active:bg-error/8" : "hover:bg-base-50 active:bg-base-200"
                    }`}
                    onClick={() => { markSeen(item.USER_ID); router.push(`/Admin/edit/${item._id}`); }}
                  >
                    <input
                      type="checkbox"
                      className="checkbox checkbox-xs shrink-0"
                      aria-label={`เลือก ${item.rfq_number ?? ""}`}
                      checked={selected.has(item._id)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => toggleSelect(item._id)}
                    />
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 relative ${pending ? "bg-error/15" : "bg-primary/10"}`}>
                      <svg className={`w-4 h-4 ${pending ? "text-error" : "text-primary"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {pending && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-error border-2 border-base-100" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold truncate text-base-content">
                          {item.rfq_number || "—"}
                        </p>
                        {pending && <span className="badge badge-error badge-xs text-[9px] shrink-0">ค้าง</span>}
                        {hasNewChat(item.USER_ID) && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0" />
                        )}
                      </div>
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
