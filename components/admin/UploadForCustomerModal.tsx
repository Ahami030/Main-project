'use client';

import { useEffect, useRef, useState } from 'react';
import { upload } from '@vercel/blob/client';

type Customer = {
  _id: string;
  name?: string;
  email: string;
  phone?: string;
  organizationName?: string;
};

interface Props {
  onClose: () => void;
  onDone: () => void;
}

// Staff-assisted RFQ upload for walk-in customers. The account is created FIRST and
// its one-time credentials pinned on screen, so a later n8n failure can't lose them;
// retry then re-runs only the upload chain.
export default function UploadForCustomerModal({ onClose, onDone }: Props) {
  const [mode, setMode] = useState<'existing' | 'new'>('new');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Customer | null>(null);

  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [creds, setCreds] = useState<{ email: string; password: string } | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'working' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/customers')
      .then((r) => (r.ok ? r.json() : []))
      .then(setCustomers)
      .catch(() => {});
  }, []);

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return !q ||
      c.name?.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone?.includes(q);
  });

  const handleFile = (f: File | null) => {
    if (!f) return;
    const isPdf = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) { setMessage('รองรับเฉพาะไฟล์ PDF เท่านั้น'); setStatus('error'); return; }
    if (f.size > 20 * 1024 * 1024) { setMessage('ไฟล์ต้องมีขนาดไม่เกิน 20MB'); setStatus('error'); return; }
    setFile(f);
    if (status === 'error') { setStatus('idle'); setMessage(''); }
  };

  const canSubmit =
    !!file &&
    status !== 'working' &&
    (mode === 'existing' ? !!selected : !!newName.trim() || !!creds);

  const copyCreds = () => {
    if (!creds) return;
    navigator.clipboard.writeText(`อีเมล: ${creds.email}\nรหัสผ่าน: ${creds.password}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setStatus('working');
    setMessage('');

    let pdfData: { pdfId?: string; pdfPath?: string } = {};
    try {
      // 1) resolve the customer — create the account first so credentials survive any later failure
      let customer = selected;
      if (mode === 'new' && !creds) {
        setMessage('กำลังสร้างบัญชีลูกค้า…');
        const res = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newName, email: newEmail || undefined, phone: newPhone || undefined }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.message ?? 'สร้างบัญชีไม่สำเร็จ');
        customer = data.user;
        setSelected(data.user);
        setCreds({ email: data.user.email, password: data.password });
      }
      if (!customer) throw new Error('ยังไม่ได้เลือกลูกค้า');

      // 2) same upload chain as the customer flow (Client/quotation handleSend)
      setMessage('กำลังอัปโหลดไฟล์…');
      const blob = await upload(`PDF/${Date.now()}-${file.name}`, file, {
        access: 'private',
        handleUploadUrl: '/api/pdf/upload',
      });

      const pdfRes = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: blob.url, filename: file.name }),
      });
      pdfData = pdfRes.ok ? await pdfRes.json() : {};

      setMessage('กำลังประมวลผลเอกสาร อาจใช้เวลาสักครู่…');
      const d = new Date();
      const rfqNumber = `RFQ-${crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()}-${String(d.getFullYear()).slice(-2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

      const upRes = await fetch('/api/rfq/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: customer._id,
          filename: blob.url,
          rfq_number: rfqNumber,
          fileUrl: blob.url,
          origName: file.name,
        }),
      });
      if (!upRes.ok) {
        const errBody = await upRes.json().catch(() => null);
        throw new Error(errBody?.message ?? `ส่ง n8n ไม่สำเร็จ (HTTP ${upRes.status})`);
      }

      const qRes = await fetch('/api/quotation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          pdfId: pdfData.pdfId ?? null,
          pdfPath: pdfData.pdfPath ?? null,
          userId: customer._id,
        }),
      });
      if (!qRes.ok) throw new Error('บันทึกใบเสนอราคาไม่สำเร็จ');

      setStatus('success');
      setMessage('');
      onDone();
    } catch (err) {
      // rollback the PDF record only — the created account stays valid for retry
      if (pdfData.pdfId) {
        try { await fetch(`/api/pdf?pdfId=${pdfData.pdfId}`, { method: 'DELETE' }); } catch {}
      }
      setStatus('error');
      setMessage(`เกิดข้อผิดพลาด: ${(err as Error).message}`);
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box rounded-3xl max-w-lg p-0 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-base-300/70">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-base-content/55">Walk-in</p>
            <h3 className="font-medium text-lg tracking-mc">อัปโหลดแทนลูกค้า</h3>
          </div>
          <button className="btn btn-ghost btn-sm btn-circle" onClick={onClose} aria-label="ปิด">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">

          {status === 'success' ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="w-12 h-12 rounded-full bg-success/15 flex items-center justify-center">
                <svg className="w-6 h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-semibold">ส่งเอกสารสำเร็จ</p>
              <p className="text-sm text-base-content/50">
                ระบบกำลังประมวลผล — รายการจะโผล่ในหน้านี้เมื่อสกัดข้อมูลเสร็จ (ไม่กี่วินาที)
              </p>
              {creds && (
                <div className="w-full rounded-2xl border border-warning/30 bg-warning/8 p-3.5 space-y-1.5 text-left">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-warning">บัญชีลูกค้า — แสดงครั้งเดียว บันทึกก่อนปิด</p>
                    <button onClick={copyCreds} className="btn btn-warning btn-xs rounded-lg">
                      {copied ? 'คัดลอกแล้ว ✓' : 'คัดลอก'}
                    </button>
                  </div>
                  <p className="text-sm font-mono">{creds.email}</p>
                  <p className="text-sm font-mono">{creds.password}</p>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Mode tabs */}
              <div role="tablist" className="tabs tabs-boxed bg-base-200/70 w-full p-0.5 gap-0.5">
                <button role="tab" disabled={!!creds}
                  className={`tab flex-1 text-xs font-semibold ${mode === 'new' ? 'tab-active' : ''}`}
                  onClick={() => { setMode('new'); setSelected(null); }}>
                  ลูกค้าใหม่ (walk-in)
                </button>
                <button role="tab" disabled={!!creds}
                  className={`tab flex-1 text-xs font-semibold ${mode === 'existing' ? 'tab-active' : ''}`}
                  onClick={() => setMode('existing')}>
                  ลูกค้าเดิม
                </button>
              </div>

              {mode === 'existing' ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อ อีเมล หรือเบอร์โทร…"
                    className="input input-bordered input-sm w-full rounded-xl"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <div className="max-h-44 overflow-y-auto rounded-xl border border-base-200 divide-y divide-base-200">
                    {filtered.length === 0 ? (
                      <p className="text-xs text-base-content/40 text-center py-4">ไม่พบลูกค้า</p>
                    ) : (
                      filtered.map((c) => (
                        <button
                          key={c._id}
                          onClick={() => setSelected(c)}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-base-200/60 transition-colors ${
                            selected?._id === c._id ? 'bg-primary/10' : ''
                          }`}
                        >
                          <span className="font-medium">{c.name || c.email}</span>
                          <span className="block text-xs text-base-content/40 truncate">
                            {c.email}{c.phone ? ` · ${c.phone}` : ''}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <input type="text" placeholder="ชื่อลูกค้า *" disabled={!!creds}
                    className="input input-bordered input-sm w-full rounded-xl"
                    value={newName} onChange={(e) => setNewName(e.target.value)} />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="email" placeholder="อีเมล (ถ้ามี)" disabled={!!creds}
                      className="input input-bordered input-sm rounded-xl"
                      value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                    <input type="tel" placeholder="เบอร์โทร (ถ้ามี)" disabled={!!creds}
                      className="input input-bordered input-sm rounded-xl"
                      value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
                  </div>
                  <p className="text-[11px] text-base-content/40">
                    ไม่กรอกอีเมล → ระบบสร้างบัญชีพร้อมอีเมล/รหัสผ่านให้อัตโนมัติ
                  </p>
                </div>
              )}

              {/* One-time credentials */}
              {creds && (
                <div className="rounded-2xl border border-warning/30 bg-warning/8 p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-warning">บัญชีลูกค้า — แสดงครั้งเดียว บันทึกทันที</p>
                    <button onClick={copyCreds} className="btn btn-warning btn-xs rounded-lg">
                      {copied ? 'คัดลอกแล้ว ✓' : 'คัดลอก'}
                    </button>
                  </div>
                  <p className="text-sm font-mono">{creds.email}</p>
                  <p className="text-sm font-mono">{creds.password}</p>
                </div>
              )}

              {/* File picker */}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => { handleFile(e.target.files?.[0] ?? null); e.target.value = ''; }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`w-full rounded-2xl border-2 border-dashed px-4 py-5 text-center transition-colors ${
                  file ? 'border-success/40 bg-success/5' : 'border-base-300 hover:border-primary/40'
                }`}
              >
                {file ? (
                  <span className="text-sm font-medium">{file.name} <span className="text-base-content/40">({(file.size / 1024 / 1024).toFixed(2)} MB)</span></span>
                ) : (
                  <span className="text-sm text-base-content/50">เลือกไฟล์ PDF ใบขอเสนอราคาของลูกค้า</span>
                )}
              </button>

              {status === 'working' && (
                <div className="flex items-center gap-2 text-sm text-base-content/60">
                  <span className="loading loading-spinner loading-xs" />
                  {message}
                </div>
              )}
              {status === 'error' && (
                <div className="alert alert-error py-2.5 text-sm rounded-xl">{message}</div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-base-300/70 px-6 py-4 flex items-center justify-end gap-2">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            {status === 'success' ? 'ปิด' : 'ยกเลิก'}
          </button>
          {status !== 'success' && (
            <button className="btn btn-primary btn-sm gap-2" disabled={!canSubmit} onClick={handleSubmit}>
              {status === 'working' && <span className="loading loading-spinner loading-xs" />}
              {status === 'error' ? 'ลองใหม่' : 'ส่งเอกสาร'}
            </button>
          )}
        </div>
      </div>
      <div className="modal-backdrop" onClick={status === 'working' ? undefined : onClose} />
    </div>
  );
}
