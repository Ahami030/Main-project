"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type POStatus = "pending" | "accepted" | "billed";
type FilterTab = "all" | POStatus;

interface PO {
  _id: string;
  poNumber: string;
  status: POStatus;
  userName: string;
  userEmail: string;
  fileOrigName: string;
  createdAt: string;
}

const STATUS_LABEL: Record<POStatus, string> = {
  pending:  "รอตรวจสอบ",
  accepted: "กำลังดำเนินการ",
  billed:   "วางบิลแล้ว",
};

const STATUS_BADGE: Record<POStatus, string> = {
  pending:  "badge-warning",
  accepted: "badge-info",
  billed:   "badge-success",
};

export default function AdminPOListPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");

  const fetchOrders = async () => {
    const res = await fetch("/api/po");
    if (res.ok) setOrders(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const pendingCount = orders.filter((o) => o.status === "pending").length;

  const filtered = orders.filter((o) => {
    if (activeFilter !== "all" && o.status !== activeFilter) return false;
    const q = search.toLowerCase();
    return !q || o.poNumber.toLowerCase().includes(q) || o.userName.toLowerCase().includes(q);
  });

  if (!session) return null;

  return (
    <div className="min-h-screen bg-base-200 py-10 px-4">
      <div className="max-w-5xl mx-auto">

        <div className="mb-6">
          <h1 className="text-2xl font-bold">จัดการ PO</h1>
          <p className="text-base-content/60 mt-0.5">ตรวจสอบและดำเนินการใบสั่งซื้อจากลูกค้า</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div role="tablist" className="tabs tabs-boxed bg-base-100 border border-base-300 flex-shrink-0">
            {(["all", "pending", "accepted", "billed"] as FilterTab[]).map((tab) => (
              <button
                key={tab}
                role="tab"
                className={`tab h-7 min-h-0 text-xs font-semibold rounded-lg ${activeFilter === tab ? "tab-active" : ""}`}
                onClick={() => setActiveFilter(tab)}
              >
                {tab === "all" ? "ทั้งหมด" : STATUS_LABEL[tab as POStatus]}
                {tab === "all" && <span className="ml-1.5 text-[10px] opacity-50">({orders.length})</span>}
                {tab === "pending" && pendingCount > 0 && (
                  <span className="ml-1.5 badge badge-error badge-xs">{pendingCount}</span>
                )}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="ค้นหา PO# หรือชื่อลูกค้า..."
            className="input input-bordered input-sm flex-1"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <span className="loading loading-spinner loading-lg" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body items-center py-14 text-center">
              <p className="text-base-content/40">ไม่พบรายการ</p>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block card bg-base-100 shadow-sm overflow-hidden">
              <table className="table table-sm">
                <thead className="bg-base-200 text-xs uppercase">
                  <tr>
                    <th>เลขที่ PO</th>
                    <th>ลูกค้า</th>
                    <th>ไฟล์</th>
                    <th>วันที่ส่ง</th>
                    <th>สถานะ</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((po) => (
                    <tr key={po._id} className="hover cursor-pointer" onClick={() => router.push(`/Admin/po/${po._id}`)}>
                      <td className="font-semibold">{po.poNumber}</td>
                      <td>
                        <div className="font-medium">{po.userName}</div>
                        <div className="text-xs text-base-content/50">{po.userEmail}</div>
                      </td>
                      <td className="text-xs text-base-content/60 max-w-[160px] truncate">{po.fileOrigName}</td>
                      <td className="text-xs text-base-content/60">
                        {new Date(po.createdAt).toLocaleDateString("th-TH")}
                      </td>
                      <td>
                        <span className={`badge badge-sm ${STATUS_BADGE[po.status]}`}>
                          {STATUS_LABEL[po.status]}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-xs btn-ghost">ดู →</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden flex flex-col gap-3">
              {filtered.map((po) => (
                <div key={po._id} className="card bg-base-100 shadow-sm cursor-pointer" onClick={() => router.push(`/Admin/po/${po._id}`)}>
                  <div className="card-body py-3 px-4">
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{po.poNumber}</span>
                      <span className={`badge badge-sm ${STATUS_BADGE[po.status]}`}>{STATUS_LABEL[po.status]}</span>
                    </div>
                    <p className="text-sm">{po.userName}</p>
                    <p className="text-xs text-base-content/50 truncate">{po.fileOrigName}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
