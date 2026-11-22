// Customer-requested deadline for a quotation ("ต้องการใบเสนอราคาภายใน …").
// Shared by the upload forms (validation), POST /api/quotation (guard) and every list
// that shows the badge — plain functions, safe on both client and server.

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
export const MAX_DUE_DAYS = 90;

// The deadline only matters until the quotation reaches the customer (bargaining)
const OPEN = new Set(["processing", "sent", "reviewing", "completed"]);
export const isDueOpen = (status: string) => OPEN.has(status);

export type DueTone = "error" | "warning" | "ghost";
// full class names so Tailwind's source scan picks them up (no `badge-${tone}`)
export const DUE_BADGE: Record<DueTone, string> = {
  error: "badge-error", warning: "badge-warning", ghost: "badge-ghost",
};

export function formatDue(dueAt: string | Date) {
  return new Date(dueAt).toLocaleString("th-TH", {
    day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

// Badge for a still-open job: overdue → error, < 24h → warning, otherwise neutral.
export function dueInfo(dueAt: string | Date | null | undefined, now = Date.now()): { tone: DueTone; label: string } | null {
  if (!dueAt) return null;
  const t = new Date(dueAt).getTime();
  if (Number.isNaN(t)) return null;
  const left = t - now;
  if (left < 0) return { tone: "error", label: `เลยกำหนด · ${formatDue(dueAt)}` };
  if (left < DAY) {
    const h = Math.floor(left / HOUR);
    return { tone: "warning", label: h > 0 ? `ด่วน · อีก ${h} ชม.` : `ด่วน · อีก ${Math.max(1, Math.ceil(left / MIN))} นาที` };
  }
  return { tone: "ghost", label: `กำหนด ${formatDue(dueAt)}` };
}

// Open jobs with a deadline first (soonest on top); everything else keeps its order.
export function byDue<T extends { dueAt?: string | Date | null; status: string }>(a: T, b: T) {
  const key = (x: T) => (x.dueAt && isDueOpen(x.status) ? new Date(x.dueAt).getTime() : Infinity);
  const ka = key(a), kb = key(b);
  return ka === kb ? 0 : ka < kb ? -1 : 1;
}

// Optional field: empty → null. Otherwise must be in the future and within MAX_DUE_DAYS.
export function parseDueAt(v: unknown, now = Date.now()): { ok: true; value: Date | null } | { ok: false; message: string } {
  if (v === null || v === undefined || v === "") return { ok: true, value: null };
  const d = new Date(v as string);
  if (Number.isNaN(d.getTime())) return { ok: false, message: "รูปแบบวันเวลาไม่ถูกต้อง" };
  if (d.getTime() <= now) return { ok: false, message: "กรุณาเลือกเวลาในอนาคต" };
  if (d.getTime() > now + MAX_DUE_DAYS * DAY) return { ok: false, message: `กำหนดเวลาได้ไม่เกิน ${MAX_DUE_DAYS} วัน` };
  return { ok: true, value: d };
}

// value for <input type="datetime-local"> min= (local time, minute precision)
export function localInputMin(now = new Date()) {
  const d = new Date(now.getTime() - now.getTimezoneOffset() * MIN);
  return d.toISOString().slice(0, 16);
}
