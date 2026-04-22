"use client";
import { useEffect, useRef } from "react";
export default function PdfDashboardLayout() {
  const pdfRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (pdfRef.current) {
      pdfRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center", // <-- สำคัญ: ให้อยู่กลางจอ
      });
    }
  }, []); // <-- run ครั้งเดียวตอนเข้า page
  return (
   <div
      className="grid gap-3 p-3 min-h-screen bg-gray-100 dark:bg-zinc-900
      grid-cols-1 lg:grid-cols-[40%_1fr]
      auto-rows-auto"
    >
      {/* ===== PDF Original ===== */}
       <div
        ref={pdfRef} // 👈 ใส่ ref ตรงนี้
        className="bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 rounded-xl p-4 flex flex-col gap-2.5
        lg:row-span-3 min-h-[300px] lg:min-h-[480px]"
      >
        <span className="text-[11px] font-medium tracking-widest uppercase text-gray-400">
          PDF Original
        </span>

        <div className="flex items-center gap-2 px-2.5 py-2 bg-gray-50 dark:bg-zinc-700 border border-black/10 dark:border-white/10 rounded-lg text-[13px] font-medium text-gray-800 dark:text-gray-100 overflow-hidden">
          <div className="w-[18px] h-[22px] bg-red-500 rounded-sm flex items-center justify-center text-[8px] text-white font-medium shrink-0">
            PDF
          </div>
          <span className="truncate">รายงานประจำปี_2567.pdf</span>
        </div>

        <div className="flex-1 bg-gray-100 dark:bg-zinc-700/50 rounded-lg flex items-center justify-center">
          <div className="flex flex-col gap-1.5 w-[80%] lg:w-[70%]">
            {[100, 80, 60, 100, 80, 60, 100, 80].map((w, i) => (
              <div
                key={i}
                className="h-2 bg-black/10 dark:bg-white/10 rounded"
                style={{ width: `${w}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ===== Data ===== */}
      <div
        className="bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 rounded-xl p-4 flex flex-col gap-2.5
        lg:col-start-2 lg:row-span-2 min-h-[300px]"
      >
        <span className="text-[11px] font-medium tracking-widest uppercase text-gray-400">
          Data
        </span>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            { value: "142", label: "หน้าทั้งหมด" },
            { value: "38", label: "ตาราง" },
            { value: "12", label: "กราฟ" },
          ].map((m) => (
            <div
              key={m.label}
              className="bg-gray-50 dark:bg-zinc-700/50 rounded-lg p-3 flex flex-col gap-1"
            >
              <span className="text-lg lg:text-xl font-medium text-gray-900 dark:text-gray-100">
                {m.value}
              </span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                {m.label}
              </span>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="flex-1 bg-gray-50 dark:bg-zinc-700/50 rounded-lg overflow-auto">
          <div className="min-w-[400px]">
            <div
              className="grid text-[11px] font-medium text-gray-500 dark:text-gray-400 px-3 py-2 border-b border-black/10 dark:border-white/10"
              style={{ gridTemplateColumns: "2fr 1fr 1fr" }}
            >
              <span>หัวข้อ</span>
              <span>หน้า</span>
              <span>สถานะ</span>
            </div>

            {[
              {
                title: "บทสรุปผู้บริหาร",
                pages: "1–8",
                status: "เสร็จสิ้น",
                type: "success",
              },
              {
                title: "ผลการดำเนินงาน",
                pages: "9–45",
                status: "เสร็จสิ้น",
                type: "success",
              },
              {
                title: "งบการเงิน",
                pages: "46–98",
                status: "รอตรวจ",
                type: "warning",
              },
              {
                title: "ภาคผนวก",
                pages: "99–142",
                status: "รอตรวจ",
                type: "warning",
              },
            ].map((row, i, arr) => (
              <div
                key={row.title}
                className={`grid items-center px-3 py-2 text-[13px] text-gray-800 dark:text-gray-200 ${
                  i < arr.length - 1
                    ? "border-b border-black/10 dark:border-white/10"
                    : ""
                }`}
                style={{ gridTemplateColumns: "2fr 1fr 1fr" }}
              >
                <span>{row.title}</span>
                <span className="text-gray-400 dark:text-gray-500">
                  {row.pages}
                </span>
                <span>
                  <span
                    className={`text-[11px] font-medium px-2 py-0.5 rounded inline-block ${
                      row.type === "success"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                    }`}
                  >
                    {row.status}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== Bottom Row ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:col-start-2">
        {/* Info */}
        <div className="bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 rounded-xl p-4 flex flex-col">
          {/* Mobile Toggle */}
          <details className="md:hidden group">
            <summary className="flex justify-between items-center cursor-pointer list-none">
              <span className="text-[11px] font-medium tracking-widest uppercase text-gray-400">
                Info
              </span>

              {/* icon */}
              <span className="text-gray-400 group-open:rotate-180 transition-transform">
                ▼
              </span>
            </summary>

            <div className="mt-2 flex flex-col">
              {[
                { key: "ชื่อไฟล์", val: "report_2567.pdf" },
                { key: "ขนาด", val: "4.2 MB" },
                { key: "อัปโหลด", val: "21 เม.ย. 2568" },
                { key: "ผู้อัปโหลด", val: "สมชาย ก." },
              ].map((row, i, arr) => (
                <div
                  key={row.key}
                  className={`flex justify-between text-[13px] py-1.5 ${
                    i < arr.length - 1
                      ? "border-b border-black/10 dark:border-white/10"
                      : ""
                  }`}
                >
                  <span className="text-gray-500 dark:text-gray-400">
                    {row.key}
                  </span>
                  <span className="font-medium text-gray-800 dark:text-gray-100">
                    {row.val}
                  </span>
                </div>
              ))}
            </div>
          </details>

          {/* Desktop View */}
          <div className="hidden md:flex flex-col gap-2">
            <span className="text-[11px] font-medium tracking-widest uppercase text-gray-400">
              Info
            </span>

            {[
              { key: "ชื่อไฟล์", val: "report_2567.pdf" },
              { key: "ขนาด", val: "4.2 MB" },
              { key: "อัปโหลด", val: "21 เม.ย. 2568" },
              { key: "ผู้อัปโหลด", val: "สมชาย ก." },
            ].map((row, i, arr) => (
              <div
                key={row.key}
                className={`flex justify-between text-[13px] py-1.5 ${
                  i < arr.length - 1
                    ? "border-b border-black/10 dark:border-white/10"
                    : ""
                }`}
              >
                <span className="text-gray-500 dark:text-gray-400">
                  {row.key}
                </span>
                <span className="font-medium text-gray-800 dark:text-gray-100">
                  {row.val}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Chat */}
        <div className="bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 rounded-xl p-4 flex flex-col gap-2">
          <span className="text-[11px] font-medium tracking-widest uppercase text-gray-400">
            Chat
          </span>

          <div className="flex flex-col gap-1.5 flex-1">
            <div className="self-start max-w-[90%] px-3 py-2 bg-gray-100 dark:bg-zinc-700 text-[13px] rounded-lg">
              สรุป: รายรับรวม 280 ล้านบาท เพิ่มขึ้น 12%
            </div>
            <div className="self-end max-w-[90%] px-3 py-2 bg-blue-50 dark:bg-blue-900/40 text-[13px] rounded-lg">
              งบการเงินหน้า 46 บอกว่าอะไร?
            </div>
          </div>

          <div className="flex gap-1.5">
            <input
              type="text"
              className="flex-1 h-9 px-2 text-[13px] rounded-lg bg-gray-50 dark:bg-zinc-700 border"
              placeholder="ถาม..."
            />
            <button className="px-3 h-9 text-[12px] border rounded-lg">
              ส่ง
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
