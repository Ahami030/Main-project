'use client';
import { useEffect, useState } from 'react';
import type { StaffStat } from '@/app/api/staff/stats/route';

// Quotations each staff member has sent to customers. The API decides the scope:
// admin gets every staff row, an employee gets only their own.
export default function StaffStatsCard() {
  const [stats, setStats] = useState<StaffStat[] | null>(null);
  const [scope, setScope] = useState<'all' | 'self'>('self');

  useEffect(() => {
    fetch('/api/staff/stats', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { stats: [] }))
      .then((d) => { setStats(d.stats ?? []); setScope(d.scope ?? 'self'); })
      .catch(() => setStats([]));
  }, []);

  return (
    <section className="card bg-base-100 border border-base-300/70 rounded-4xl shadow-mc-sm">
      <div className="card-body p-6 gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-base-content/55">Staff Performance</p>
          <h2 className="text-lg font-medium mt-1">{scope === 'all' ? 'ผลงานพนักงาน' : 'ผลงานของฉัน'}</h2>
          <p className="text-xs text-base-content/45 mt-0.5">นับใบเสนอราคาที่ส่งให้ลูกค้าแล้ว (1 งาน นับ 1 ครั้ง)</p>
        </div>

        {stats === null ? (
          <span className="loading loading-dots loading-sm opacity-40" />
        ) : stats.length === 0 ? (
          <p className="text-sm text-base-content/40">ยังไม่มีข้อมูล</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>พนักงาน</th>
                  <th className="text-right">วันนี้</th>
                  <th className="text-right">เดือนนี้</th>
                  <th className="text-right">ทั้งหมด</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => (
                  <tr key={s.id}>
                    <td className="font-medium">{s.name || '—'}</td>
                    <td className="text-right tabular-nums">{s.today}</td>
                    <td className="text-right tabular-nums">{s.month}</td>
                    <td className="text-right tabular-nums font-semibold">{s.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
