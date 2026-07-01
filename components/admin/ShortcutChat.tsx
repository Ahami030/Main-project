'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import ChatFileAttachment from '@/components/chat/ChatFileAttachment';
import ChatRfqSidebar, { type RfqDoc } from '@/components/admin/ChatRfqSidebar';

type UserWithChat = {
  userId: string;
  user: { name: string; email: string } | null;
  latestMessage: string;
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
  isDeleted?: boolean;
  createdAt: string;
};

export default function ShortcutChat() {
  const pathname = usePathname();

  const [view, setView] = useState<'list' | 'chat'>('list');
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<UserWithChat[]>([]);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [activeRfq, setActiveRfq] = useState<RfqDoc | null | undefined>(undefined);
  const [draft, setDraft] = useState('');
  const [pastedImage, setPastedImage] = useState<File | null>(null);
  const [pastedPreview, setPastedPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [seenAt, setSeenAt] = useState<Record<string, number>>({});
  const [showNewMsgButton, setShowNewMsgButton] = useState(false);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const msgContainerRef = useRef<HTMLDivElement>(null);
  const prevMsgCountRef = useRef(0);
  const justSwitchedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Suppress on pages that have inline chat
  const hidden =
    pathname === '/Admin/chat' ||
    pathname?.startsWith('/Admin/edit/') ||
    pathname === '/Admin/rfq/edit';

  // Effect A — load seenAt from localStorage
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('admin_seen_chats') || '{}');
      setSeenAt(stored);
    } catch {}
  }, []);

  // Effect B — poll users every 3s (always-on for badge count)
  useEffect(() => {
    if (hidden) return;
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/chat/users', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        setUsers(data.users ?? []);
      } catch {}
    };
    fetchUsers();
    const iv = setInterval(fetchUsers, 3000);
    return () => clearInterval(iv);
  }, [hidden]);

  // Effect C — poll messages every 1s when a chat is active
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
          if (data.length > prev.length && !shouldAutoScrollRef.current) {
            setShowNewMsgButton(true);
          }
          return data;
        });
      } catch {}
    };
    fetchMessages();
    const iv = setInterval(fetchMessages, 1000);
    return () => clearInterval(iv);
  }, [activeUserId]);

  // Effect D — fetch RFQ when activeUserId changes
  useEffect(() => {
    if (!activeUserId) return;
    setActiveRfq(undefined);
    const fetchRfq = async () => {
      try {
        const res = await fetch(`/api/rfq?userId=${activeUserId}`, { cache: 'no-store' });
        if (!res.ok) { setActiveRfq(null); return; }
        const data = await res.json();
        setActiveRfq(Array.isArray(data) && data.length > 0 ? data[0] : null);
      } catch {
        setActiveRfq(null);
      }
    };
    fetchRfq();
  }, [activeUserId]);

  // Effect E — reset scroll state when switching users
  useEffect(() => {
    shouldAutoScrollRef.current = true;
    prevMsgCountRef.current = 0;
    setShowNewMsgButton(false);
    setMessages([]);
    justSwitchedRef.current = true;
  }, [activeUserId]);

  // Effect F — auto-scroll when messages arrive
  useEffect(() => {
    const newCount = messages.length;
    const isNew = newCount > prevMsgCountRef.current;
    prevMsgCountRef.current = newCount;
    const el = msgContainerRef.current;
    if (!el) return;

    // Just opened this conversation: wait until messages actually load, then snap to bottom
    // instantly. (Consuming justSwitched on the empty render made the real scroll smooth →
    // it raced layout shifts + handleScroll and landed mid-list.)
    if (justSwitchedRef.current) {
      if (newCount === 0) return;
      requestAnimationFrame(() => el.scrollTo({ top: el.scrollHeight, behavior: 'instant' }));
      justSwitchedRef.current = false;
      return;
    }

    if (!isNew || !shouldAutoScrollRef.current) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // Re-snap to bottom once the RFQ card resolves (skeleton→card height change shifts layout)
  useEffect(() => {
    if (view !== 'chat' || activeRfq === undefined) return;
    const el = msgContainerRef.current;
    if (el && shouldAutoScrollRef.current) {
      requestAnimationFrame(() => el.scrollTo({ top: el.scrollHeight }));
    }
  }, [activeRfq, view]);

  // Effect H — scroll to bottom when chat view opens
  useEffect(() => {
    if (view !== 'chat') return;
    const el = msgContainerRef.current;
    if (el) requestAnimationFrame(() => el.scrollTo({ top: el.scrollHeight }));
  }, [view, activeUserId]);

  // Re-pin to bottom after an image finishes loading (rAF so scrollHeight reflects the new layout)
  const pinBottomAfterImage = () => {
    if (!shouldAutoScrollRef.current) return;
    requestAnimationFrame(() => {
      const el = msgContainerRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight });
    });
  };

  // Effect G — revoke object URL for paste preview
  useEffect(() => {
    if (!pastedImage) { setPastedPreview(''); return; }
    const url = URL.createObjectURL(pastedImage);
    setPastedPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [pastedImage]);

  if (hidden) return null;

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

  const openModal = () => {
    setView('list');
    dialogRef.current?.showModal();
  };

  const closeModal = () => {
    dialogRef.current?.close();
  };

  const openChat = (userId: string) => {
    setActiveUserId(userId);
    setView('chat');
    markSeen(userId);
  };

  const goToList = () => {
    setView('list');
    setActiveUserId(null);
  };

  const uploadAndSend = async (file: File) => {
    if (!activeUserId) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const up = await fetch('/api/chat/upload', { method: 'POST', body: fd });
      if (!up.ok) return;
      const { url, type, name } = await up.json();
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: activeUserId, senderRole: 'admin', message: '', fileUrl: url, fileType: type, fileName: name }),
      });
      shouldAutoScrollRef.current = true;
      setShowNewMsgButton(false);
    } catch {}
    setUploading(false);
  };

  const sendMessage = async () => {
    if (pastedImage) {
      const file = pastedImage;
      setPastedImage(null);
      await uploadAndSend(file);
      return;
    }
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

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

  const userInitial = (u: UserWithChat) =>
    (u.user?.name || u.user?.email || '?')[0].toUpperCase();

  const userName = (u: UserWithChat) =>
    u.user?.name || u.user?.email || 'Unknown';

  return (
    <>
      {/* ── Floating trigger button ── */}
      <button
        onClick={() => dialogRef.current?.open ? closeModal() : openModal()}
        className="fixed bottom-6 right-6 z-50 btn btn-primary btn-circle shadow-xl w-14 h-14"
        aria-label="Open messages"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-4 4-1-4z" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 badge badge-error badge-sm min-w-5 h-5 text-[10px] font-bold px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Modal ── */}
      <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
        <div
          className="modal-box p-0 flex flex-col overflow-hidden w-full sm:max-w-3xl"
          style={{ height: '640px', maxHeight: '90vh' }}
        >
          {/* ── Modal Header ── */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-base-200 shrink-0">
            {view === 'chat' ? (
              <button
                onClick={goToList}
                className="btn btn-ghost btn-xs gap-1.5 rounded-lg -ml-1 font-medium"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                กลับ
              </button>
            ) : (
              <div className="flex items-center gap-2.5">
                <span className="text-base font-bold text-base-content">ข้อความ</span>
                {unreadCount > 0 && (
                  <span className="badge badge-primary badge-sm text-[10px] font-semibold">
                    {unreadCount} ใหม่
                  </span>
                )}
              </div>
            )}
            <button
              onClick={closeModal}
              className="btn btn-ghost btn-xs btn-square rounded-lg"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* ── LIST VIEW ── */}
          {view === 'list' && (
            <>
              {/* Tabs */}
              <div className="px-5 py-3 border-b border-base-200 shrink-0">
                <div role="tablist" className="tabs tabs-boxed bg-base-200/80 w-full p-1 gap-1">
                  <button
                    role="tab"
                    className={`tab flex-1 text-xs font-semibold transition-all ${activeTab === 'all' ? 'tab-active' : ''}`}
                    onClick={() => setActiveTab('all')}
                  >
                    ทั้งหมด
                    <span className="ml-1.5 badge badge-sm badge-ghost text-[10px] font-normal">
                      {users.length}
                    </span>
                  </button>
                  <button
                    role="tab"
                    className={`tab flex-1 text-xs font-semibold transition-all ${activeTab === 'unread' ? 'tab-active' : ''}`}
                    onClick={() => setActiveTab('unread')}
                  >
                    ยังไม่ได้อ่าน
                    {unreadCount > 0 && (
                      <span className="ml-1.5 badge badge-primary badge-sm text-[10px]">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* User list */}
              <div className="flex-1 overflow-y-auto">
                {displayedUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-base-content/25 px-6 text-center">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2}
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-4 4-1-4z" />
                    </svg>
                    <p className="text-sm">
                      {activeTab === 'unread' ? 'ไม่มีข้อความที่ยังไม่ได้อ่าน' : 'ยังไม่มีการสนทนา'}
                    </p>
                  </div>
                ) : (
                  displayedUsers.map((u) => {
                    const unread = isUnread(u);
                    return (
                      <button
                        key={u.userId}
                        onClick={() => openChat(u.userId)}
                        className="w-full flex items-center gap-3 px-5 py-3.5 border-b border-base-200 last:border-0 hover:bg-base-200/40 active:bg-base-200/70 transition-colors text-left"
                      >
                        {/* Avatar */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
                          unread ? 'bg-primary text-primary-content' : 'bg-base-300 text-base-content/60'
                        }`}>
                          {userInitial(u)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-sm truncate ${unread ? 'font-bold text-base-content' : 'font-medium text-base-content/70'}`}>
                              {userName(u)}
                            </span>
                            {unread && (
                              <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 animate-pulse" />
                            )}
                          </div>
                          <p className={`text-xs truncate mt-0.5 ${unread ? 'text-base-content/70 font-medium' : 'text-base-content/40'}`}>
                            {u.latestMessage || 'ยังไม่มีข้อความ'}
                          </p>
                        </div>

                        <svg className="w-4 h-4 text-base-content/20 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <div className="flex-1 flex min-h-0">

            {/* LEFT: chat column */}
            <div className="flex-1 flex flex-col min-w-0 md:border-r border-base-200">

              {/* Compact RFQ chip — mobile only (desktop shows the full sidebar on the right) */}
              <div className="md:hidden px-5 py-3 border-b border-base-200 shrink-0">
                {activeRfq === undefined ? (
                  <div className="skeleton h-12 w-full rounded-xl" />
                ) : activeRfq === null ? (
                  <div className="px-3 py-2.5 bg-base-200 rounded-xl text-xs text-base-content/40 text-center">
                    ไม่พบ RFQ ที่เชื่อมกับผู้ใช้นี้
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-primary/8 border border-primary/15 rounded-xl">
                    <span className="text-xs font-bold text-primary truncate">
                      {activeRfq.rfq_number || 'RFQ'}
                    </span>
                    <a
                      href={`/Admin/edit/${activeRfq._id}`}
                      className="btn btn-primary btn-xs h-8 min-h-0 rounded-lg shrink-0 gap-1.5 text-[11px] font-semibold"
                      onClick={closeModal}
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
                className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2.5 min-h-0 bg-base-200/20"
              >
                {messages.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-base-content/30 text-xs">
                    ยังไม่มีข้อความ
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isAdmin = msg.senderRole === 'admin';
                    if (msg.isDeleted) {
                      return (
                        <div key={msg._id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                          <span className="text-xs italic text-base-content/30 px-2 py-1">ข้อความถูกลบแล้ว</span>
                        </div>
                      );
                    }
                    return (
                      <div key={msg._id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[78%] flex flex-col gap-0.5 ${isAdmin ? 'items-end' : 'items-start'}`}>
                          {msg.fileUrl ? (
                            <ChatFileAttachment
                              fileUrl={msg.fileUrl}
                              fileType={msg.fileType!}
                              fileName={msg.fileName!}
                              isAdmin={isAdmin}
                              onImageLoad={pinBottomAfterImage}
                            />
                          ) : (
                            <div className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed wrap-break-word ${
                              isAdmin
                                ? 'bg-primary text-primary-content rounded-tr-sm'
                                : 'bg-base-200 text-base-content/85 rounded-tl-sm'
                            }`}>
                              {msg.message}
                            </div>
                          )}
                          <span className="text-[10px] text-base-content/30 px-1">
                            {fmtTime(msg.createdAt)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* New message button */}
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

              {/* Paste preview bar */}
              {pastedImage && pastedPreview && (
                <div className="px-5 py-2 border-t border-base-200 bg-base-200/40 shrink-0 flex items-center gap-2">
                  <img src={pastedPreview} alt="paste preview" className="w-12 h-12 object-cover rounded-lg shrink-0" />
                  <span className="text-xs text-base-content/60 flex-1 truncate">{pastedImage.name}</span>
                  <button onClick={() => setPastedImage(null)} className="btn btn-ghost btn-xs btn-square rounded-lg">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <span className="text-[10px] text-base-content/40">Enter เพื่อส่ง</span>
                </div>
              )}

              {/* Input area */}
              <div className="flex items-center gap-2 px-5 py-3.5 border-t border-base-200 shrink-0">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadAndSend(file);
                    e.target.value = '';
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn-ghost btn-xs btn-square rounded-lg text-base-content/40 hover:text-base-content"
                  disabled={uploading}
                  aria-label="แนบไฟล์"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>
                <input
                  type="text"
                  placeholder={pastedImage ? 'Enter เพื่อส่งรูป' : 'พิมพ์ข้อความ... (Enter)'}
                  className="input input-bordered input-sm h-9 flex-1 rounded-xl text-sm bg-base-200/60 border-transparent focus:border-primary focus:bg-base-100 transition-colors"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  onPaste={(e) => {
                    const file = e.clipboardData?.files?.[0];
                    if (file?.type.startsWith('image/')) { e.preventDefault(); setPastedImage(file); }
                  }}
                />
                <button
                  className="btn btn-primary btn-sm h-9 min-h-0 rounded-xl px-3"
                  onClick={sendMessage}
                  disabled={(!draft.trim() && !pastedImage) || uploading}
                >
                  {uploading ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* RIGHT: full RFQ sidebar — desktop only (mobile uses the compact chip above) */}
            <ChatRfqSidebar rfq={activeRfq} onNavigate={closeModal} className="hidden md:flex" />
            </div>
          )}
        </div>

        {/* Backdrop — click outside to close */}
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </>
  );
}
