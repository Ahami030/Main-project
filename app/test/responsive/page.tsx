export default function PdfDashboardLayout() {
  return (
    <div className="grid gap-3 p-3 min-h-screen bg-gray-100 dark:bg-zinc-900"
      style={{ gridTemplateColumns: "40% 1fr", gridTemplateRows: "auto 1fr auto" }}
    >
      {/* ===== PDF Original ===== */}
      <div
        className="bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 rounded-xl p-4 flex flex-col gap-2.5 row-span-3"
        style={{ minHeight: 480 }}
      >
        <span className="text-[11px] font-medium tracking-widest uppercase text-gray-400">
          PDF Original
        </span>

        {/* ชื่อไฟล์ */}
        <div className="flex items-center gap-2 px-2.5 py-2 bg-gray-50 dark:bg-zinc-700 border border-black/10 dark:border-white/10 rounded-lg text-[13px] font-medium text-gray-800 dark:text-gray-100 overflow-hidden">
          <div className="w-[18px] h-[22px] bg-red-500 rounded-sm flex items-center justify-center text-[8px] text-white font-medium shrink-0">
            PDF
          </div>
          <span className="truncate">รายงานประจำปี_2567.pdf</span>
        </div>

        {/* PDF Placeholder */}
        <div className="flex-1 bg-gray-100 dark:bg-zinc-700/50 rounded-lg flex items-center justify-center">
          <div className="flex flex-col gap-1.5 w-[70%]">
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
        className="bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 rounded-xl p-4 flex flex-col gap-2.5"
        style={{ gridColumn: 2, gridRow: "1 / 3", minHeight: 300 }}
      >
        <span className="text-[11px] font-medium tracking-widest uppercase text-gray-400">
          Data
        </span>

        {/* Metric Cards */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: "142", label: "หน้าทั้งหมด" },
            { value: "38", label: "ตาราง" },
            { value: "12", label: "กราฟ" },
          ].map((m) => (
            <div key={m.label} className="bg-gray-50 dark:bg-zinc-700/50 rounded-lg p-3 flex flex-col gap-1">
              <span className="text-xl font-medium text-gray-900 dark:text-gray-100">{m.value}</span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">{m.label}</span>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="flex-1 bg-gray-50 dark:bg-zinc-700/50 rounded-lg overflow-hidden">
          <div className="grid text-[11px] font-medium text-gray-500 dark:text-gray-400 px-3 py-2 border-b border-black/10 dark:border-white/10"
            style={{ gridTemplateColumns: "2fr 1fr 1fr" }}
          >
            <span>หัวข้อ</span><span>หน้า</span><span>สถานะ</span>
          </div>
          {[
            { title: "บทสรุปผู้บริหาร", pages: "1–8", status: "เสร็จสิ้น", type: "success" },
            { title: "ผลการดำเนินงาน", pages: "9–45", status: "เสร็จสิ้น", type: "success" },
            { title: "งบการเงิน", pages: "46–98", status: "รอตรวจ", type: "warning" },
            { title: "ภาคผนวก", pages: "99–142", status: "รอตรวจ", type: "warning" },
          ].map((row, i, arr) => (
            <div
              key={row.title}
              className={`grid items-center px-3 py-2 text-[13px] text-gray-800 dark:text-gray-200 ${i < arr.length - 1 ? "border-b border-black/10 dark:border-white/10" : ""}`}
              style={{ gridTemplateColumns: "2fr 1fr 1fr" }}
            >
              <span>{row.title}</span>
              <span className="text-gray-400 dark:text-gray-500">{row.pages}</span>
              <span>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded inline-block ${
                  row.type === "success"
                    ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                }`}>
                  {row.status}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ===== Bottom Row: Info + Chat ===== */}
      <div className="grid grid-cols-2 gap-3" style={{ gridColumn: 2, gridRow: 3 }}>

        {/* Info */}
        <div className="bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 rounded-xl p-4 flex flex-col gap-2">
          <span className="text-[11px] font-medium tracking-widest uppercase text-gray-400">
            Info
          </span>
          <div className="flex flex-col flex-1">
            {[
              { key: "ชื่อไฟล์", val: "report_2567.pdf" },
              { key: "ขนาด", val: "4.2 MB" },
              { key: "อัปโหลด", val: "21 เม.ย. 2568" },
              { key: "ผู้อัปโหลด", val: "สมชาย ก." },
            ].map((row, i, arr) => (
              <div
                key={row.key}
                className={`flex justify-between text-[13px] py-1.5 ${i < arr.length - 1 ? "border-b border-black/10 dark:border-white/10" : ""}`}
              >
                <span className="text-gray-500 dark:text-gray-400">{row.key}</span>
                <span className="font-medium text-gray-800 dark:text-gray-100">{row.val}</span>
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
            <div className="self-start max-w-[85%] px-3 py-2 bg-gray-100 dark:bg-zinc-700 text-gray-800 dark:text-gray-200 text-[13px] leading-snug rounded-lg">
              สรุป: รายรับรวม 280 ล้านบาท เพิ่มขึ้น 12% จากปีก่อน
            </div>
            <div className="self-end max-w-[85%] px-3 py-2 bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[13px] leading-snug rounded-lg">
              งบการเงินหน้า 46 บอกว่าอะไร?
            </div>
          </div>
          <div className="flex gap-1.5 items-center">
            <input
              type="text"
              placeholder="ถามเกี่ยวกับ PDF..."
              className="flex-1 h-8 px-2.5 text-[13px] bg-gray-50 dark:bg-zinc-700 border border-black/10 dark:border-white/10 rounded-lg text-gray-800 dark:text-gray-100 placeholder:text-gray-400 outline-none focus:ring-1 focus:ring-blue-400"
            />
            <button className="h-8 px-3 text-[12px] border border-black/15 dark:border-white/15 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors shrink-0">
              ส่ง
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}