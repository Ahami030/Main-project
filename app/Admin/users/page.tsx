'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

type UserRole = 'user' | 'employee' | 'admin';

interface UserDoc {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions: string[];
  createdAt: string;
}
// Permission labels for display
//
const PERMISSION_LABELS: Record<string, string> = {
  quotation: 'Manage RFQ',
  po:        'Manage PO',
  billing:   'Billing',
  payments:  'Payment',
};
const PERMISSION_KEYS = Object.keys(PERMISSION_LABELS);
const STARTER_PERMISSIONS = ['quotation', 'po'];

const ROLE_BADGE: Record<UserRole, string> = {
  admin:    'badge-error',
  employee: 'badge-warning',
  user:     'badge-ghost',
};

const ROLE_LABELS: Record<UserRole, string> = {
  admin:    'Admin',
  employee: 'Employee',
  user:     'Customer',
};

export default function UsersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const role = (session?.user as any)?.role;

  const [users, setUsers]           = useState<UserDoc[]>([]);
  const [loading, setLoading]       = useState(true);
  const [editUser, setEditUser]     = useState<UserDoc | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // create form state
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    role: 'employee' as UserRole,
    permissions: [...STARTER_PERMISSIONS],
  });

  useEffect(() => {
    if (role && role !== 'admin') router.replace('/Admin');
  }, [role, router]);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) setUsers(await res.json());
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowCreate(false);
      setForm({ name: '', email: '', password: '', role: 'employee', permissions: [...STARTER_PERMISSIONS] });
      fetchUsers();
    } else {
      const d = await res.json();
      alert(d.message ?? 'เกิดข้อผิดพลาด');
    }
  }

  async function handleSaveEdit() {
    if (!editUser) return;
    const res = await fetch(`/api/admin/users/${editUser._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: editUser.role, permissions: editUser.permissions ?? [] }),
    });
    if (res.ok) {
      setEditUser(null);
      fetchUsers();
    } else {
      let message = 'เกิดข้อผิดพลาด';
      try { const d = await res.json(); message = d.message ?? message; } catch {}
      alert(message);
    }
  }

  async function handleDelete(u: UserDoc) {
    if (!confirm(`ลบ ${u.name} (${u.email}) ออกจากระบบ?`)) return;
    const res = await fetch(`/api/admin/users/${u._id}`, { method: 'DELETE' });
    if (res.ok) fetchUsers();
    else { const d = await res.json(); alert(d.message ?? 'เกิดข้อผิดพลาด'); }
  }

  function togglePermission(key: string, current: string[], onChange: (p: string[]) => void) {
    onChange(current.includes(key) ? current.filter((p) => p !== key) : [...current, key]);
  }

  return (
    <div className="font-mc min-h-screen bg-base-200 text-base-content p-4 lg:p-8">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">

        {/* Header */}
        <div className="pt-2">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-base-content/55 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            Admin Console
          </p>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-medium tracking-mc leading-tight">
                จัดการ<span className="text-accent">ผู้ใช้งาน</span>
              </h1>
              <p className="text-sm text-base-content/55 mt-1">เพิ่ม แก้ไข และกำหนดสิทธิ์การเข้าถึงของ Employee</p>
            </div>
            <button
              className="btn btn-primary btn-sm rounded-xl gap-2"
              onClick={() => setShowCreate(true)}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              เพิ่มผู้ใช้
            </button>
          </div>
        </div>

        {/* User table */}
        <div className="bg-base-100 border border-base-300/70 rounded-[2rem] shadow-mc-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <span className="loading loading-spinner loading-md" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-center py-16 text-base-content/40 text-sm">ยังไม่มีผู้ใช้</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-sm w-full">
                <thead>
                  <tr className="bg-base-200/60 text-[10px] uppercase tracking-wider text-base-content/40">
                    <th>ชื่อ / อีเมล</th>
                    <th>Role</th>
                    <th>Permissions</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u._id} className="hover:bg-base-200/30 transition-colors">
                      <td>
                        <div className="font-medium text-sm">{u.name}</div>
                        <div className="text-xs text-base-content/50">{u.email}</div>
                      </td>
                      <td>
                        <span className={`badge badge-sm ${ROLE_BADGE[u.role] ?? 'badge-ghost'}`}>
                          {ROLE_LABELS[u.role] ?? u.role}
                        </span>
                      </td>
                      <td>
                        {u.role === 'employee' ? (
                          <div className="flex flex-wrap gap-1">
                            <span className="badge badge-xs badge-info">Chat</span>
                            {(u.permissions ?? []).map((p) => (
                              <span key={p} className="badge badge-xs badge-outline">
                                {PERMISSION_LABELS[p] ?? p}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-base-content/30">—</span>
                        )}
                      </td>
                      <td className="text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            className="btn btn-xs btn-ghost"
                            onClick={() => setEditUser({ ...u })}
                          >แก้ไข</button>
                          <button
                            className="btn btn-xs btn-error btn-outline"
                            onClick={() => handleDelete(u)}
                          >ลบ</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Chat note */}
        <p className="text-xs text-base-content/40 px-1">
          * Chat เป็นสิทธิ์พื้นฐานของทุก Employee — ไม่ต้องกำหนดเพิ่มเติม
        </p>
      </div>

      {/* ── Create modal ── */}
      {showCreate && (
        <div className="modal modal-open">
          <div className="modal-box rounded-3xl max-w-md">
            <h3 className="font-medium text-lg mb-4">เพิ่มผู้ใช้ใหม่</h3>
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <input
                className="input input-bordered input-sm rounded-xl w-full"
                placeholder="ชื่อ"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <input
                className="input input-bordered input-sm rounded-xl w-full"
                placeholder="อีเมล"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
              <input
                className="input input-bordered input-sm rounded-xl w-full"
                placeholder="รหัสผ่าน"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <select
                className="select select-bordered select-sm rounded-xl w-full"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
              >
                <option value="user">Customer</option>
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
              </select>

              {form.role === 'employee' && (
                <div className="bg-base-200 rounded-2xl p-4 flex flex-col gap-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-base-content/50">Permissions</p>
                  <div className="flex items-center gap-2 opacity-60">
                    <input type="checkbox" className="checkbox checkbox-xs checkbox-info" checked disabled readOnly />
                    <span className="text-sm">Chat (default)</span>
                  </div>
                  {PERMISSION_KEYS.map((key) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-xs"
                        checked={form.permissions.includes(key)}
                        onChange={() => togglePermission(key, form.permissions, (p) => setForm({ ...form, permissions: p }))}
                      />
                      <span className="text-sm">{PERMISSION_LABELS[key]}</span>
                    </label>
                  ))}
                </div>
              )}

              <div className="modal-action mt-2">
                <button type="button" className="btn btn-ghost btn-sm rounded-xl" onClick={() => setShowCreate(false)}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary btn-sm rounded-xl">สร้าง</button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={() => setShowCreate(false)} />
        </div>
      )}

      {/* ── Edit modal ── */}
      {editUser && (
        <div className="modal modal-open">
          <div className="modal-box rounded-3xl max-w-md">
            <h3 className="font-medium text-lg mb-1">แก้ไขสิทธิ์</h3>
            <p className="text-sm text-base-content/50 mb-4">{editUser.name} · {editUser.email}</p>
            <div className="flex flex-col gap-3">
              <select
                className="select select-bordered select-sm rounded-xl w-full"
                value={editUser.role}
                onChange={(e) => setEditUser({ ...editUser, role: e.target.value as UserRole })}
              >
                <option value="user">Customer</option>
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
              </select>

              {editUser.role === 'employee' && (
                <div className="bg-base-200 rounded-2xl p-4 flex flex-col gap-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-base-content/50">Permissions</p>
                  <div className="flex items-center gap-2 opacity-60">
                    <input type="checkbox" className="checkbox checkbox-xs checkbox-info" checked disabled readOnly />
                    <span className="text-sm">Chat (default)</span>
                  </div>
                  {PERMISSION_KEYS.map((key) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-xs"
                        checked={(editUser.permissions ?? []).includes(key)}
                        onChange={() =>
                          togglePermission(key, editUser.permissions ?? [], (p) =>
                            setEditUser({ ...editUser, permissions: p })
                          )
                        }
                      />
                      <span className="text-sm">{PERMISSION_LABELS[key]}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-action mt-4">
              <button className="btn btn-ghost btn-sm rounded-xl" onClick={() => setEditUser(null)}>ยกเลิก</button>
              <button className="btn btn-primary btn-sm rounded-xl" onClick={handleSaveEdit}>บันทึก</button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setEditUser(null)} />
        </div>
      )}
    </div>
  );
}
