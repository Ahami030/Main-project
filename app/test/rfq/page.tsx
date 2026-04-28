"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function RFQListPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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

  if (loading) return <p className="p-5">กำลังโหลด...</p>;
  if (error) return <p className="p-5 text-red-500">Error: {error}</p>;

  return (
    <div className="p-5">
      <h1 className="text-xl mb-4 font-bold">RFQ List</h1>

      {data.length === 0 ? (
        <p className="text-gray-500">ไม่มีข้อมูล</p>
      ) : (
        data.map((item) => (
          <div
            key={item._id}
            className="border p-3 mb-2 cursor-pointer hover:bg-gray-100 rounded"
            onClick={() => router.push(`/test/edit/${item._id}`)}
          >
            <p className="font-bold">{item.rfq_number || "N/A"}</p>
            <p className="text-sm text-gray-600">{item.buyer_company_name || "N/A"}</p>
          </div>
        ))
      )}
    </div>
  );
}