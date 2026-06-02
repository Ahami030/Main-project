import React from "react";

export interface HistoryEntry {
  action: string;
  actor: string;
  actorName: string;
  timestamp: string;
  note?: string;
  amount?: number;
}

interface Props {
  history: HistoryEntry[];
}

const ACTION_CONFIG: Record<string, { label: string; colorClass: string; icon: string }> = {
  submitted:   { label: "ส่งหลักฐาน",   colorClass: "bg-info",    icon: "📤" },
  approved:    { label: "อนุมัติแล้ว",   colorClass: "bg-success", icon: "✅" },
  rejected:    { label: "ถูกปฏิเสธ",    colorClass: "bg-error",   icon: "❌" },
  resubmitted: { label: "ส่งใหม่",       colorClass: "bg-warning", icon: "🔄" },
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleString("th-TH", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

const fmtAmount = (n: number) =>
  n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function PaymentHistoryTimeline({ history }: Props) {
  if (!history || history.length === 0) {
    return <p className="text-sm text-base-content/50">ยังไม่มีประวัติ</p>;
  }

  return (
    <ul className="timeline timeline-vertical timeline-compact">
      {history.map((entry, i) => {
        const cfg = ACTION_CONFIG[entry.action] ?? { label: entry.action, colorClass: "bg-neutral", icon: "•" };
        const isLast = i === history.length - 1;
        return (
          <li key={i}>
            {i !== 0 && <hr />}
            <div className="timeline-middle">
              <div className={`w-7 h-7 rounded-full ${cfg.colorClass} flex items-center justify-center text-sm`}>
                {cfg.icon}
              </div>
            </div>
            <div className={`timeline-end timeline-box ${isLast ? "border-primary/30" : ""}`}>
              <p className="font-semibold text-sm">{cfg.label}</p>
              <p className="text-xs text-base-content/60">{entry.actorName} · {fmtDate(entry.timestamp)}</p>
              {entry.amount != null && (
                <p className="text-xs text-base-content/70 mt-0.5">ยอด {fmtAmount(entry.amount)} บาท</p>
              )}
              {entry.note && (
                <p className="text-xs text-base-content/50 mt-1 italic">{entry.note}</p>
              )}
            </div>
            {!isLast && <hr />}
          </li>
        );
      })}
    </ul>
  );
}
