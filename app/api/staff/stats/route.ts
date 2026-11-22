import { NextResponse } from "next/server";
import { requireSession, getUser } from "@/lib/apiAuth";
import { connectMongoDB } from "@/lib/mongo";
import Quotation from "@/app/models/Quotation";
import User from "@/app/models/User";

export type StaffStat = { id: string; name: string; today: number; month: number; total: number };

// "Today" / "this month" in Thai time — the server (Vercel) runs in UTC
const BKK_OFFSET_MS = 7 * 60 * 60 * 1000;
function bangkokBoundaries(now = Date.now()) {
  const t = new Date(now + BKK_OFFSET_MS);
  const y = t.getUTCFullYear(), m = t.getUTCMonth(), d = t.getUTCDate();
  return {
    dayStart: new Date(Date.UTC(y, m, d) - BKK_OFFSET_MS),
    monthStart: new Date(Date.UTC(y, m, 1) - BKK_OFFSET_MS),
  };
}

// Quotations each staff member sent to customers (Quotation.handledBy, set once per job in
// PUT /api/rfq/[id]). Admin sees everyone — staff with 0 included; an employee sees only
// their own row.
export async function GET() {
  const sessionOrRes = await requireSession();
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;
  const me = getUser(sessionOrRes);
  if (me.role !== "admin" && me.role !== "employee") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const isAdmin = me.role === "admin";

  await connectMongoDB();
  const { dayStart, monthStart } = bangkokBoundaries();

  const counted = await Quotation.aggregate<{ _id: string; name: string; today: number; month: number; total: number }>([
    { $match: isAdmin ? { "handledBy.id": { $ne: null } } : { "handledBy.id": me.id } },
    {
      $group: {
        _id: "$handledBy.id",
        name: { $last: "$handledBy.name" },
        total: { $sum: 1 },
        month: { $sum: { $cond: [{ $gte: ["$handledAt", monthStart] }, 1, 0] } },
        today: { $sum: { $cond: [{ $gte: ["$handledAt", dayStart] }, 1, 0] } },
      },
    },
  ]);

  const byId = new Map<string, StaffStat>(
    counted.map((c) => [c._id, { id: c._id, name: c.name, today: c.today, month: c.month, total: c.total }])
  );

  // staff who haven't closed a job yet still get a row (0) — that's the point of tracking
  const staff = isAdmin
    ? await User.find({ role: { $in: ["admin", "employee"] } }, { name: 1, email: 1 }).lean<{ _id: unknown; name?: string; email: string }[]>()
    : [{ _id: me.id, name: me.name, email: me.email ?? "" }];
  for (const u of staff) {
    const id = String(u._id);
    const row = byId.get(id);
    if (row) row.name = u.name || u.email || row.name; // current name, not the one at save time
    else byId.set(id, { id, name: u.name || u.email, today: 0, month: 0, total: 0 });
  }

  const stats = [...byId.values()].sort((a, b) => b.month - a.month || b.total - a.total);
  return NextResponse.json({ stats, scope: isAdmin ? "all" : "self" });
}
