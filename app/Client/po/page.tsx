"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type POStatus = "pending" | "accepted" | "billed";

interface PO {
  _id: string;
  poNumber: string;
  status: POStatus;
  fileOrigName: string;
  fileMimeType: string;
  createdAt: string;
  billedAt?: string;
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

export default function ClientPOListPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    const res = await fetch("/api/po");
    if (res.ok) setOrders(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 8000);
    return () => clearInterval(interval);
  }, []);

  if (!session) return null;

  return (
    <div className="min-h-screen bg-base-200 py-10 px-4">
      <div className="max-w-3xl mx-auto">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">ใบสั่งซื้อของฉัน</h1>
            <p className="text-base-content/60 mt-0.5">ติดตามสถานะและดูใบวางบิล</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => router.push("/Client/po/new")}>
            + สร้างใบสั่งซื้อ
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <span className="loading loading-spinner loading-lg" />
          </div>
        ) : orders.length === 0 ? (
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body items-center text-center py-16">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-14 h-14 text-base-content/20 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-base-content/40">ยังไม่มีใบสั่งซื้อ</p>
              <button className="btn btn-primary btn-sm mt-4" onClick={() => router.push("/Client/po/new")}>
                สร้างใบสั่งซื้อแรก
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {orders.map((po) => (
              <div key={po._id} className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="card-body py-4 px-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-lg">{po.poNumber}</span>
                        <span className={`badge badge-sm ${STATUS_BADGE[po.status]}`}>
                          {STATUS_LABEL[po.status]}
                        </span>
                      </div>
                      <p className="text-sm text-base-content/60 mt-1 truncate">ไฟล์: {po.fileOrigName}</p>
                      <p className="text-xs text-base-content/40 mt-0.5">
                        ส่งเมื่อ {new Date(po.createdAt).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      {po.status === "billed" ? (
                        <Link href={`/Client/po/${po._id}`} className="btn btn-sm btn-success">
                          ดูใบวางบิล
                        </Link>
                      ) : (
                        <div className="text-xs text-base-content/40 text-right">
                          {po.status === "pending" ? "รอ admin ตรวจสอบ" : "กำลังดำเนินการ"}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status timeline */}
                  <div className="flex items-center gap-1 mt-3">
                    {(["pending", "accepted", "billed"] as POStatus[]).map((s, i) => {
                      const steps = ["pending", "accepted", "billed"] as POStatus[];
                      const currentIdx = steps.indexOf(po.status);
                      const stepIdx = steps.indexOf(s);
                      const done = stepIdx <= currentIdx;
                      return (
                        <div key={s} className="flex items-center gap-1">
                          {i > 0 && <div className={`h-0.5 w-6 ${done ? "bg-primary" : "bg-base-300"}`} />}
                          <div className={`w-2.5 h-2.5 rounded-full ${done ? "bg-primary" : "bg-base-300"}`} />
                        </div>
                      );
                    })}
                    <span className="text-xs text-base-content/50 ml-2">{STATUS_LABEL[po.status]}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
