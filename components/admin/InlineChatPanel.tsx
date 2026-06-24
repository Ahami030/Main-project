'use client';

import { useEffect, useRef, useState } from 'react';
import ChatFileAttachment from '@/components/chat/ChatFileAttachment';

type UserWithChat = {
  userId: string;
  user: { name: string; email: string } | null;
  latestMessage: string;
  latestFileType?: string | null;
  latestMessageTime: string;
  latestUserMessageTime?: string | null;
};

type ChatMsg = {
  _id: string;
  senderRole: 'user' | 'admin';
  message: string;
  fileUrl?: string;
  fileType?: string;
  fileName?: string;
  createdAt: string;
};

type RfqDoc = {
  _id: string;
  rfq_number: string;
  document_type?: string;
  rfq_date?: string;
  due_date?: string;
  buyer_company_name: string;
  vendor_company_name?: string;
  line_items: Array<{ quantity: number; unit_price: number; description?: string }>;
};

interface Props {
  onRfqCount?: (count: number) => void;
}

export default function InlineChatPanel({ onRfqCount }: Props) {
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [activeUser, setActiveUser] = useState<UserWithChat | null>(null);
  const [users, setUsers] = useState<UserWithChat[]>([]);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [activeRfq, setActiveRfq] = useState<RfqDoc | null | undefined>(undefined);
  const [draft, setDraft] = useState('');
  const [seenAt, setSeenAt] = useState<Record<string, number>>({});
  const [showNewMsgButton, setShowNewMsgButton] = useState(false);

  const chatDialogRef = useRef<HTMLDialogElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const msgContainerRef = useRef<HTMLDivElement>(null);
  const prevMsgCountRef = useRef(0);
  const justSwitchedRef = useRef(false);
  const switchTimeRef = useRef(0);

  // Load seenAt from localStorage
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('admin_seen_chats') || '{}');
      setSeenAt(stored);
    } catch {}
  }, []);

  // Poll users every 3s — also piggybacks newRfqCount at zero extra cost
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/chat/users', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        setUsers(data.users ?? []);
        if (onRfqCount) onRfqCount(data.newRfqCount ?? 0);
      } catch {}
    };
    fetchUsers();
    const iv = setInterval(fetchUsers, 3000);
    return () => clearInterval(iv);
  // onRfqCount is intentionally omitted — it's a stable callback ref from parent
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll messages every 1s when modal is open
  useEffect(() => {
    if (!activeUser) return;
    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/chat/${activeUser.userId}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data: ChatMsg[] = await res.json();
        setMessages((prev) => {
          const lastIdSame = data[data.length - 1]?._id === prev[prev.length - 1]?._id;
          if (data.length === prev.length && lastIdSame) return prev;
          if (data.length > prev.length && !shouldAutoScrollRef.current) setShowNewMsgButton(true);
          return data;
        });
      } catch {}
    };
    fetchMessages();
    const iv = setInterval(fetchMessages, 1000);
    return () => clearInterval(iv);
  }, [activeUser]);

  // Fetch RFQ when active user changes
  useEffect(() => {
    if (!activeUser) return;
    setActiveRfq(undefined);
    const fetchRfq = async () => {
      try {
        const res = await fetch(`/api/rfq?userId=${activeUser.userId}`, { cache: 'no-store' });
        if (!res.ok) { setActiveRfq(null); return; }
        const data = await res.json();
        setActiveRfq(Array.isArray(data) && data.length > 0 ? data[0] : null);
      } catch { setActiveRfq(null); }
    };
    fetchRfq();
  }, [activeUser]);

  // Reset scroll state when switching users
  useEffect(() => {
    shouldAutoScrollRef.current = true;
    prevMsgCountRef.current = 0;
    setShowNewMsgButton(false);
    setMessages([]);
    justSwitchedRef.current = true;
    switchTimeRef.current = Date.now();
  }, [activeUser]);

  // Auto-scroll on new messages
  useEffect(() => {
    const newCount = messages.length;
    const isNew = newCount > prevMsgCountRef.current;
    prevMsgCountRef.current = newCount;
    if (!isNew && !justSwitchedRef.current) return;
    if (!shouldAutoScrollRef.current) return;
    const el = msgContainerRef.current;
    if (!el) return;
    const timeSince = Date.now() - switchTimeRef.current;
    el.scrollTo({ top: el.scrollHeight, behavior: (justSwitchedRef.current || timeSince < 500) ? 'instant' : 'smooth' });
    justSwitchedRef.current = false;
  }, [messages]);

  // ── Helpers ──

  const isUnread = (u: UserWithChat) => {
    if (!u.latestUserMessageTime) return false;
    return new Date(u.latestUserMessageTime).getTime() > (seenAt[u.userId] ?? 0);
  };

  const unreadCount = users.filter(isUnread).length;
  const displayedUsers = activeTab === 'unread' ? users.filter(isUnread) : users;

  const markSeen = (userId: string) => {
    const updated = { ...seenAt, [userId]: Date.now() };
    setSeenAt(updated);
    try { localStorage.setItem('admin_seen_chats', JSON.stringify(updated)); } catch {}
  };

  const openChatModal = (u: UserWithChat) => {
    setActiveUser(u);
    markSeen(u.userId);
    chatDialogRef.current?.showModal();
  };

  const closeChatModal = () => {
    chatDialogRef.current?.close();
  };

  const sendMessage = async () => {
    if (!draft.trim() || !activeUser) return;
    const text = draft;
    setDraft('');
    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: activeUser.userId, senderRole: 'admin', message: text }),
      });
      shouldAutoScrollRef.current = true;
      setShowNewMsgButton(false);
      const res = await fetch(`/api/chat/${activeUser.userId}`, { cache: 'no-store' });
      if (res.ok) setMessages(await res.json());
    } catch {}
  };

  const handleScroll = () => {
    const el = msgContainerRef.current;
    if (!el) return;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 50;
    shouldAutoScrollRef.current = atBottom;
    if (atBottom) setShowNewMsgButton(false);
  };

  const scrollToBottom = () => {
    msgContainerRef.current?.scrollTo({ top: msgContainerRef.current.scrollHeight, behavior: 'smooth' });
    setShowNewMsgButton(false);
    shouldAutoScrollRef.current = true;
  };

  const calcTotal = (rfq: RfqDoc) =>
    (rfq.line_items || []).reduce((s, li) => s + (Number(li.quantity) || 0) * (Number(li.unit_price) || 0), 0);

  const fmtPrice = (n: number) =>
    new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

  const fmtDate = (str?: string) => {
    if (!str) return '—';
    const d = new Date(str);
    return isNaN(d.getTime()) ? str : d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const userInitial = (u: UserWithChat) =>
    (u.user?.name || u.user?.email || '?')[0].toUpperCase();

  const userName = (u: UserWithChat) =>
    u.user?.name || u.user?.email || 'Unknown';

  return (
    <>
      {/* ── Panel (list view only) ── */}
      <div className="bg-base-100 border border-base-300 rounded-2xl flex flex-col overflow-hidden shadow-sm h-full">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-base-200 shrink-0">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-4 4-1-4z" />
            </svg>
            <span className="text-sm font-bold text-base-content">ข้อความลูกค้า</span>
            {unreadCount > 0 && (
              <span className="badge badge-primary badge-sm text-[10px] font-semibold animate-pulse">
                {unreadCount} ใหม่
              </span>
            )}
          </div>
          <span className="text-[11px] text-base-content/35 font-medium">{users.length} การสนทนา</span>
        </div>

        {/* Tabs */}
        <div className="px-4 py-2.5 border-b border-base-200 shrink-0">
          <div role="tablist" className="tabs tabs-boxed bg-base-200/70 w-full p-0.5 gap-0.5">
            <button
              role="tab"
              className={`tab flex-1 text-xs font-semibold h-7 min-h-0 rounded-lg transition-all ${activeTab === 'all' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              ทั้งหมด
              <span className="ml-1 opacity-50 text-[10px] font-normal">({users.length})</span>
            </button>
            <button
              role="tab"
              className={`tab flex-1 text-xs font-semibold h-7 min-h-0 rounded-lg transition-all ${activeTab === 'unread' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('unread')}
            >
              ยังไม่ได้อ่าน
              {unreadCount > 0 && (
                <span className="ml-1.5 badge badge-primary badge-xs text-[9px] px-1">{unreadCount}</span>
              )}
            </button>
          </div>
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto">
          {displayedUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-base-content/25 px-6 py-10 text-center">
              <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-4 4-1-4z" />
              </svg>
              <p className="text-xs">
                {activeTab === 'unread' ? 'ไม่มีข้อความที่ยังไม่ได้อ่าน' : 'ยังไม่มีการสนทนา'}
              </p>
            </div>
          ) : (
            displayedUsers.map((u) => {
              const unread = isUnread(u);
              return (
                <button
                  key={u.userId}
                  onClick={() => openChatModal(u)}
                  className="w-full flex items-center gap-3 px-4 py-3 border-b border-base-200 last:border-0 hover:bg-base-200/50 active:bg-base-200 transition-colors text-left group"
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold transition-colors ${
                    unread ? 'bg-primary text-primary-content' : 'bg-base-200 text-base-content/50 group-hover:bg-base-300'
                  }`}>
                    {userInitial(u)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className={`text-sm truncate ${unread ? 'font-bold text-base-content' : 'font-medium text-base-content/65'}`}>
                        {userName(u)}
                      </span>
                      {unread && <span className="w-2 h-2 rounded-full bg-primary shrink-0 animate-pulse" />}
                    </div>
                    <p className={`text-xs truncate mt-0.5 flex items-center gap-1 ${unread ? 'text-base-content/65 font-medium' : 'text-base-content/35'}`}>
                      {u.latestFileType === 'image' ? (
                        <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      ) : u.latestFileType ? (
                        <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      ) : null}
                      <span className="truncate">{u.latestMessage || 'ยังไม่มีข้อความ'}</span>
                    </p>
                  </div>
                  <svg className="w-3.5 h-3.5 text-base-content/20 shrink-0 group-hover:text-base-content/40 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Chat Modal ── */}
      <dialog ref={chatDialogRef} className="modal modal-middle">
        <div
          className="modal-box p-0 overflow-hidden w-full max-w-3xl flex flex-col"
          style={{ height: '600px' }}
        >
          {/* Modal header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-base-200 shrink-0 bg-base-100">
            <div className="flex items-center gap-3">
              {activeUser && (
                <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                  {userInitial(activeUser)}
                </div>
              )}
              <div>
                <p className="text-sm font-bold text-base-content leading-tight">
                  {activeUser ? userName(activeUser) : ''}
                </p>
                <p className="text-[11px] text-base-content/40">
                  {activeUser?.user?.email || ''}
                </p>
              </div>
            </div>
            <button onClick={closeChatModal} className="btn btn-ghost btn-sm btn-square rounded-lg">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Modal body: two columns */}
          <div className="flex flex-1 overflow-hidden">

            {/* ── LEFT: Chat ── */}
            <div className="flex-1 flex flex-col min-w-0 border-r border-base-200">

              {/* Messages */}
              <div
                ref={msgContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2.5 min-h-0 bg-base-200/20"
              >
                {messages.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-base-content/25 text-xs">
                    ยังไม่มีข้อความ
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isAdmin = msg.senderRole === 'admin';
                    return (
                      <div key={msg._id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[78%] flex flex-col gap-0.5 ${isAdmin ? 'items-end' : 'items-start'}`}>
                          <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed wrap-break-word ${
                            isAdmin
                              ? 'bg-primary text-primary-content rounded-tr-sm'
                              : 'bg-base-100 text-base-content/80 rounded-tl-sm shadow-sm border border-base-200'
                          }`}>
                            {msg.fileUrl
                              ? <ChatFileAttachment fileUrl={msg.fileUrl} fileType={msg.fileType!} fileName={msg.fileName ?? 'ไฟล์'} isAdmin={isAdmin} />
                              : msg.message}
                          </div>
                          <span className="text-[10px] text-base-content/30 px-1">{fmtTime(msg.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })
                )}

                {showNewMsgButton && (
                  <div className="sticky bottom-2 flex justify-center">
                    <button
                      onClick={scrollToBottom}
                      className="btn btn-primary btn-xs h-7 min-h-0 rounded-full shadow-lg gap-1 text-xs px-3"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      ข้อความใหม่
                    </button>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="flex items-center gap-2 px-4 py-3 border-t border-base-200 shrink-0 bg-base-100">
                <input
                  type="text"
                  placeholder="พิมพ์ข้อความ... (Enter)"
                  className="input input-bordered input-sm h-9 flex-1 rounded-xl text-sm bg-base-200/60 border-transparent focus:border-primary focus:bg-base-100 transition-colors"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                  }}
                />
                <button
                  className="btn btn-primary btn-sm h-9 min-h-0 rounded-xl px-3.5"
                  onClick={sendMessage}
                  disabled={!draft.trim()}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>

            {/* ── RIGHT: RFQ info ── */}
            <div className="w-64 shrink-0 flex flex-col bg-base-100 overflow-y-auto">

              {/* RFQ header */}
              <div className="px-4 pt-4 pb-3 border-b border-base-200">
                <p className="text-[10px] text-base-content/40 font-semibold uppercase tracking-wider mb-1">
                  RFQ Details
                </p>
                {activeRfq === undefined ? (
                  <div className="flex flex-col gap-2 mt-2">
                    <div className="skeleton h-4 w-32 rounded" />
                    <div className="skeleton h-3 w-24 rounded" />
                  </div>
                ) : activeRfq === null ? (
                  <div className="flex flex-col items-center gap-2 py-4 text-base-content/25">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-xs text-center">ไม่พบ RFQ ที่เชื่อมกับผู้ใช้นี้</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-base font-bold text-primary leading-tight">
                      {activeRfq.rfq_number || '—'}
                    </p>
                    {activeRfq.document_type && (
                      <p className="text-[11px] text-base-content/40 mt-0.5">{activeRfq.document_type}</p>
                    )}
                  </div>
                )}
              </div>

              {/* RFQ fields */}
              {activeRfq && activeRfq !== null && (
                <div className="flex-1 px-4 py-3 flex flex-col gap-3">

                  {/* Buyer */}
                  <div>
                    <p className="text-[10px] text-base-content/35 font-semibold uppercase tracking-wider mb-0.5">Buyer</p>
                    <p className="text-xs font-medium text-base-content/80">
                      {activeRfq.buyer_company_name || '—'}
                    </p>
                  </div>

                  {/* Vendor */}
                  {activeRfq.vendor_company_name && (
                    <div>
                      <p className="text-[10px] text-base-content/35 font-semibold uppercase tracking-wider mb-0.5">Vendor</p>
                      <p className="text-xs font-medium text-base-content/80">{activeRfq.vendor_company_name}</p>
                    </div>
                  )}

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] text-base-content/35 font-semibold uppercase tracking-wider mb-0.5">วันที่</p>
                      <p className="text-xs text-base-content/70">{fmtDate(activeRfq.rfq_date)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-base-content/35 font-semibold uppercase tracking-wider mb-0.5">Due date</p>
                      <p className="text-xs text-base-content/70">{fmtDate(activeRfq.due_date)}</p>
                    </div>
                  </div>

                  {/* Items & Total */}
                  <div className="bg-base-200/60 rounded-xl px-3 py-2.5 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-base-content/50">จำนวนรายการ</span>
                      <span className="text-xs font-semibold text-base-content">
                        {activeRfq.line_items?.length || 0} รายการ
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-base-content/50">ราคารวม</span>
                      <span className="text-sm font-bold text-success">
                        {fmtPrice(calcTotal(activeRfq))}
                      </span>
                    </div>
                  </div>

                  {/* Line items preview */}
                  {activeRfq.line_items?.length > 0 && (
                    <div>
                      <p className="text-[10px] text-base-content/35 font-semibold uppercase tracking-wider mb-1.5">รายการสินค้า</p>
                      <div className="flex flex-col gap-1">
                        {activeRfq.line_items.slice(0, 4).map((li, i) => (
                          <div key={i} className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="text-base-content/60 truncate flex-1">
                              {li.description || `รายการ ${i + 1}`}
                            </span>
                            <span className="text-base-content/40 shrink-0">
                              ×{li.quantity}
                            </span>
                          </div>
                        ))}
                        {activeRfq.line_items.length > 4 && (
                          <p className="text-[10px] text-base-content/30 mt-0.5">
                            +{activeRfq.line_items.length - 4} รายการ
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Go to Edit button */}
              <div className="px-4 py-4 border-t border-base-200 shrink-0">
                {activeRfq && activeRfq !== null ? (
                  <a
                    href={`/Admin/edit/${activeRfq._id}`}
                    className="btn btn-primary w-full rounded-xl gap-2"
                    onClick={closeChatModal}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Go to Edit
                  </a>
                ) : (
                  <button disabled className="btn btn-disabled w-full rounded-xl">
                    ไม่พบ RFQ
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Backdrop */}
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </>
  );
}
