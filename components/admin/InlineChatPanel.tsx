'use client';

import { useEffect, useRef, useState } from 'react';

type UserWithChat = {
  userId: string;
  user: { name: string; email: string } | null;
  latestMessage: string;
  latestMessageTime: string;
};

type ChatMsg = {
  _id: string;
  senderRole: 'user' | 'admin';
  message: string;
  createdAt: string;
};

type RfqDoc = {
  _id: string;
  rfq_number: string;
  buyer_company_name: string;
  line_items: Array<{ quantity: number; unit_price: number }>;
};

export default function InlineChatPanel() {
  const [view, setView] = useState<'list' | 'chat'>('list');
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [activeUserName, setActiveUserName] = useState('');
  const [users, setUsers] = useState<UserWithChat[]>([]);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [activeRfq, setActiveRfq] = useState<RfqDoc | null | undefined>(undefined);
  const [draft, setDraft] = useState('');
  const [seenAt, setSeenAt] = useState<Record<string, number>>({});
  const [showNewMsgButton, setShowNewMsgButton] = useState(false);

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

  // Poll users every 3s
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/chat/users', { cache: 'no-store' });
        if (res.ok) setUsers(await res.json());
      } catch {}
    };
    fetchUsers();
    const iv = setInterval(fetchUsers, 3000);
    return () => clearInterval(iv);
  }, []);

  // Poll messages every 1s when chat is active
  useEffect(() => {
    if (!activeUserId) return;
    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/chat/${activeUserId}`, { cache: 'no-store' });
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
  }, [activeUserId]);

  // Fetch RFQ when user changes
  useEffect(() => {
    if (!activeUserId) return;
    setActiveRfq(undefined);
    const fetchRfq = async () => {
      try {
        const res = await fetch(`/api/rfq?userId=${activeUserId}`, { cache: 'no-store' });
        if (!res.ok) { setActiveRfq(null); return; }
        const data = await res.json();
        setActiveRfq(Array.isArray(data) && data.length > 0 ? data[0] : null);
      } catch { setActiveRfq(null); }
    };
    fetchRfq();
  }, [activeUserId]);

  // Reset scroll state when switching users
  useEffect(() => {
    shouldAutoScrollRef.current = true;
    prevMsgCountRef.current = 0;
    setShowNewMsgButton(false);
    setMessages([]);
    justSwitchedRef.current = true;
    switchTimeRef.current = Date.now();
  }, [activeUserId]);

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
    if (!u.latestMessageTime) return false;
    return new Date(u.latestMessageTime).getTime() > (seenAt[u.userId] ?? 0);
  };

  const unreadCount = users.filter(isUnread).length;
  const displayedUsers = activeTab === 'unread' ? users.filter(isUnread) : users;

  const markSeen = (userId: string) => {
    const updated = { ...seenAt, [userId]: Date.now() };
    setSeenAt(updated);
    try { localStorage.setItem('admin_seen_chats', JSON.stringify(updated)); } catch {}
  };

  const openChat = (u: UserWithChat) => {
    setActiveUserId(u.userId);
    setActiveUserName(u.user?.name || u.user?.email || 'Unknown');
    setView('chat');
    markSeen(u.userId);
  };

  const goToList = () => {
    setView('list');
    setActiveUserId(null);
    setActiveUserName('');
  };

  const sendMessage = async () => {
    if (!draft.trim() || !activeUserId) return;
    const text = draft;
    setDraft('');
    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: activeUserId, senderRole: 'admin', message: text }),
      });
      shouldAutoScrollRef.current = true;
      setShowNewMsgButton(false);
      const res = await fetch(`/api/chat/${activeUserId}`, { cache: 'no-store' });
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

  const userInitial = (u: UserWithChat) =>
    (u.user?.name || u.user?.email || '?')[0].toUpperCase();

  const userName = (u: UserWithChat) =>
    u.user?.name || u.user?.email || 'Unknown';

  return (
    <div className="bg-base-100 border border-base-300 rounded-2xl flex flex-col overflow-hidden shadow-sm h-full">

      {/* ── Panel Header ── */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-base-200 shrink-0">
        {view === 'chat' ? (
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={goToList}
              className="btn btn-ghost btn-xs btn-square rounded-lg shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-base-content truncate">{activeUserName}</span>
          </div>
        ) : (
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
        )}

        {/* User count or RFQ indicator */}
        {view === 'list' && (
          <span className="text-[11px] text-base-content/35 font-medium">
            {users.length} การสนทนา
          </span>
        )}
        {view === 'chat' && activeRfq && (
          <span className="text-[10px] text-primary/60 font-medium truncate max-w-24">
            {activeRfq.rfq_number}
          </span>
        )}
      </div>

      {/* ── LIST VIEW ── */}
      {view === 'list' && (
        <>
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
                  <span className="ml-1.5 badge badge-primary badge-xs text-[9px] px-1">
                    {unreadCount}
                  </span>
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
                    onClick={() => openChat(u)}
                    className="w-full flex items-center gap-3 px-4 py-3 border-b border-base-200 last:border-0 hover:bg-base-200/40 active:bg-base-200 transition-colors text-left group"
                  >
                    {/* Avatar */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold transition-colors ${
                      unread
                        ? 'bg-primary text-primary-content'
                        : 'bg-base-200 text-base-content/50 group-hover:bg-base-300'
                    }`}>
                      {userInitial(u)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className={`text-sm truncate ${unread ? 'font-bold text-base-content' : 'font-medium text-base-content/65'}`}>
                          {userName(u)}
                        </span>
                        {unread && (
                          <span className="w-2 h-2 rounded-full bg-primary shrink-0 animate-pulse" />
                        )}
                      </div>
                      <p className={`text-xs truncate mt-0.5 ${unread ? 'text-base-content/65 font-medium' : 'text-base-content/35'}`}>
                        {u.latestMessage || 'ยังไม่มีข้อความ'}
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
        </>
      )}

      {/* ── CHAT VIEW ── */}
      {view === 'chat' && activeUserId && (
        <div className="flex-1 flex flex-col min-h-0">

          {/* RFQ card */}
          <div className="px-4 py-3 border-b border-base-200 shrink-0">
            {activeRfq === undefined ? (
              <div className="skeleton h-14 w-full rounded-xl" />
            ) : activeRfq === null ? (
              <div className="px-3 py-2 bg-base-200 rounded-xl text-xs text-base-content/40 text-center">
                ไม่พบ RFQ ที่เชื่อมกับผู้ใช้นี้
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-primary/8 border border-primary/15 rounded-xl">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-xs font-bold text-primary truncate">
                    {activeRfq.rfq_number || 'RFQ'}
                  </span>
                  <span className="text-[11px] text-base-content/55 truncate">
                    {activeRfq.buyer_company_name || '—'}
                  </span>
                  <span className="text-[11px] text-base-content/35">
                    {activeRfq.line_items?.length || 0} รายการ
                    {' · '}
                    <span className="text-success font-semibold">{fmtPrice(calcTotal(activeRfq))}</span>
                  </span>
                </div>
                <a
                  href={`/Admin/edit/${activeRfq._id}`}
                  className="btn btn-primary btn-xs h-8 min-h-0 rounded-lg shrink-0 gap-1 text-[11px] font-semibold"
                >
                  Go to Edit
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            )}
          </div>

          {/* Messages area */}
          <div
            ref={msgContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2 min-h-0"
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
                    <div className={`max-w-[82%] flex flex-col gap-0.5 ${isAdmin ? 'items-end' : 'items-start'}`}>
                      <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed break-words ${
                        isAdmin
                          ? 'bg-primary text-primary-content rounded-tr-sm'
                          : 'bg-base-200 text-base-content/80 rounded-tl-sm'
                      }`}>
                        {msg.message}
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

          {/* Input area */}
          <div className="flex items-center gap-2 px-4 py-3 border-t border-base-200 shrink-0">
            <input
              type="text"
              placeholder="พิมพ์ข้อความ... (Enter)"
              className="input input-bordered input-sm h-8 flex-1 rounded-xl text-xs bg-base-200/60 border-transparent focus:border-primary focus:bg-base-100 transition-colors"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
              }}
            />
            <button
              className="btn btn-primary btn-sm h-8 min-h-0 rounded-xl px-3"
              onClick={sendMessage}
              disabled={!draft.trim()}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
