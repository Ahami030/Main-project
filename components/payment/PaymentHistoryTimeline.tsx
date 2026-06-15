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

function IconUpload() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3.5 h-3.5">
      <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 20h14" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3.5 h-3.5">
      <path strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function IconX() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3.5 h-3.5">
      <path strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function IconRefresh() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3.5 h-3.5">
      <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function IconDot() {
  return <span className="block w-1.5 h-1.5 rounded-full bg-current" />;
}

const ACTION_CONFIG: Record<string, { label: string; colorClass: string; icon: () => React.ReactElement }> = {
  submitted:   { label: "ส่งหลักฐาน",   colorClass: "bg-info",    icon: IconUpload },
  approved:    { label: "อนุมัติแล้ว",   colorClass: "bg-success", icon: IconCheck },
  rejected:    { label: "ถูกปฏิเสธ",    colorClass: "bg-error",   icon: IconX },
  resubmitted: { label: "ส่งใหม่",       colorClass: "bg-warning", icon: IconRefresh },
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
        const cfg = ACTION_CONFIG[entry.action] ?? { label: entry.action, colorClass: "bg-neutral", icon: IconDot };
        const isLast = i === history.length - 1;
        const Icon = cfg.icon;
        return (
          <li key={i}>
            {i !== 0 && <hr />}
            <div className="timeline-middle">
              <div className={`w-7 h-7 rounded-full ${cfg.colorClass} flex items-center justify-center text-white shadow-sm`}>
                <Icon />
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
