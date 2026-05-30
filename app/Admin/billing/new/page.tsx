"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

interface AcceptedPO {
  _id: string;
  poNumber: string;
  status: string;
  userName: string;
  userEmail: string;
  userId: string;
  fileOrigName: string;
  createdAt: string;
  billingId?: string | null;
}

function NewBillingForm() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselect = searchParams.get("preselect");

  const [pos, setPOs]         = useState<AcceptedPO[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedPoIds, setSelectedPoIds]           = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [error, setError]       = useState("");

  useEffect(() => {
    fetch("/api/po")
      .then((r) => r.ok ? r.json() : [])
      .then((all: AcceptedPO[]) =>
        setPOs(all.filter((p) => p.status === "accepted" && !p.billingId))
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!preselect || pos.length === 0) return;
    const target = pos.find((p) => p._id === preselect);
    if (target) {
      setSelectedCustomerId(target.userId);
      setSelectedPoIds(new Set([target._id]));
    }
  }, [preselect, pos]);

  const customers = Array.from(
    new Map(pos.map((p) => [p.userId, { id: p.userId, name: p.userName, email: p.userEmail }])).values()
  );
  const customerPOs = pos.filter((p) => p.userId === selectedCustomerId);

  const togglePO = (id: string) => {
    setSelectedPoIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    setError("");
    if (selectedPoIds.size === 0) { setError("กรุณาเลือก PO อย่างน้อย 1 ใบ"); return; }
    setCreating(true);
    const res = await fetch("/api/billing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ poIds: Array.from(selectedPoIds) }),
    });
    if (res.ok) {
      const billing = await res.json();
      router.push(`/Admin/billing/${billing._id}`);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.message || "เกิดข้อผิดพลาด กรุณาลองใหม่");
      setCreating(false);
    }
  };

  if (!session) return null;

  return (
    <div className="min-h-screen bg-base-200 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center gap-3">
          <button className="btn btn-ghost btn-sm gap-1.5" onClick={() => router.push("/Admin/billing")}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            กลับ
          </button>
          <div className="w-px h-5 bg-base-300" />
          <h1 className="text-lg font-bold">สร้างใบวางบิลใหม่</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><span className="loading loading-spinner loading-lg" /></div>
        ) : (
          <div className="flex flex-col gap-5">
            {/* Step 1: เลือกลูกค้า */}
            <div className="card bg-base-100 border border-base-300 shadow-sm">
              <div className="card-body gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-content flex items-center justify-center text-xs font-bold">1</div>
                  <h2 className="font-bold">เลือกลูกค้า</h2>
                </div>
                {customers.length === 0 ? (
                  <div className="flex flex-col items-center py-6 gap-2 text-base-content/40">
                    <p className="text-sm">ไม่มี PO ที่พร้อมวางบิล</p>
                    <p className="text-xs">PO ต้องมีสถานะ &quot;กำลังดำเนินการ&quot; และยังไม่อยู่ในใบวางบิลใด</p>
                    <button className="btn btn-sm btn-ghost mt-1" onClick={() => router.push("/Admin/po")}>ไปหน้า PO</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {customers.map((c) => (
                      <button key={c.id}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          selectedCustomerId === c.id ? "border-primary bg-primary/5" : "border-base-200 hover:border-base-300"
                        }`}
                        onClick={() => { setSelectedCustomerId(c.id); setSelectedPoIds(new Set()); }}>
                        <p className="font-semibold text-sm">{c.name}</p>
                        <p className="text-xs text-base-content/50 mt-0.5">{c.email}</p>
                        <p className="text-xs text-base-content/40 mt-1">
                          {pos.filter((p) => p.userId === c.id).length} PO รอวางบิล
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: เลือก PO */}
            {selectedCustomerId && (
              <div className="card bg-base-100 border border-base-300 shadow-sm">
                <div className="card-body gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary text-primary-content flex items-center justify-center text-xs font-bold">2</div>
                      <h2 className="font-bold">เลือก PO ที่ต้องการรวม</h2>
                    </div>
                    <button className="btn btn-ghost btn-xs" onClick={() => {
                      selectedPoIds.size === customerPOs.length
                        ? setSelectedPoIds(new Set())
                        : setSelectedPoIds(new Set(customerPOs.map((p) => p._id)));
                    }}>
                      {selectedPoIds.size === customerPOs.length ? "ยกเลิกทั้งหมด" : "เลือกทั้งหมด"}
                    </button>
                  </div>
                  <div className="flex flex-col gap-2">
                    {customerPOs.map((po) => (
                      <label key={po._id}
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          selectedPoIds.has(po._id) ? "border-primary bg-primary/5" : "border-base-200 hover:border-base-300"
                        }`}>
                        <input type="checkbox" className="checkbox checkbox-primary"
                          checked={selectedPoIds.has(po._id)} onChange={() => togglePO(po._id)} />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{po.poNumber}</p>
                          <p className="text-xs text-base-content/50 truncate">{po.fileOrigName}</p>
                          <p className="text-xs text-base-content/40 mt-0.5">
                            {new Date(po.createdAt).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}
                          </p>
                        </div>
                        <span className="badge badge-info badge-sm">กำลังดำเนินการ</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ปุ่มสร้าง */}
            {selectedCustomerId && (
              <div className="card bg-base-100 border border-base-300 shadow-sm">
                <div className="card-body gap-3">
                  {selectedPoIds.size > 0 && (
                    <div className="bg-base-200 rounded-xl p-3 text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-base-content/60">จำนวน PO</span>
                        <span className="font-semibold">{selectedPoIds.size} ใบ</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-base-content/60">เลขที่ PO</span>
                        <span className="font-medium text-right text-xs max-w-[60%]">
                          {customerPOs.filter((p) => selectedPoIds.has(p._id)).map((p) => p.poNumber).join(", ")}
                        </span>
                      </div>
                    </div>
                  )}
                  {error && <p className="text-error text-sm">{error}</p>}
                  <button className="btn btn-success w-full gap-2"
                    disabled={selectedPoIds.size === 0 || creating} onClick={handleCreate}>
                    {creating
                      ? <span className="loading loading-spinner loading-sm" />
                      : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    }
                    สร้างใบวางบิล ({selectedPoIds.size} PO)
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminBillingNewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-base-200 flex items-center justify-center"><span className="loading loading-spinner loading-lg" /></div>}>
      <NewBillingForm />
    </Suspense>
  );
}
