'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import ChatFileAttachment from '@/components/chat/ChatFileAttachment';

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

export default function ChatNotificationBubble() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState('');
  const [pastedImage, setPastedImage] = useState<File | null>(null);
  const [pastedPreview, setPastedPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const msgContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const prevMsgCountRef = useRef(0);

  const userId = (session?.user as any)?.id;

  const hidden =
    pathname === '/Client/Bargain' ||
    pathname?.startsWith('/Client/pdf') ||
    pathname?.startsWith('/Client/sendpdf');

  // Hydrate from localStorage cache → instant display before the (slow) first DB fetch
  useEffect(() => {
    if (!userId) return;
    try {
      const cached = localStorage.getItem(`chat_cache_${userId}`);
      if (cached) setMessages(JSON.parse(cached));
    } catch {}
  }, [userId]);

  useEffect(() => {
    if (!userId || hidden) return;
    const fetchMsgs = async () => {
      try {
        const res = await fetch(`/api/chat/${userId}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data: ChatMsg[] = await res.json();
        setMessages((prev) => {
          const lastSame = data[data.length - 1]?._id === prev[prev.length - 1]?._id;
          if (data.length === prev.length && lastSame) return prev; // no change → skip re-render
          return data;
        });
        try { localStorage.setItem(`chat_cache_${userId}`, JSON.stringify(data)); } catch {}
        const lastSeen = parseInt(localStorage.getItem('client_chat_last_seen') || '0');
        const unread = data.filter(
          (c) => c.senderRole === 'admin' && new Date(c.createdAt).getTime() > lastSeen
        );
        setUnreadCount(unread.length);
      } catch {}
    };
    fetchMsgs();
    const iv = setInterval(fetchMsgs, open ? 1000 : 3000);
    return () => clearInterval(iv);
  }, [userId, open, hidden]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (!open) return;
    const newCount = messages.length;
    const isNew = newCount > prevMsgCountRef.current;
    prevMsgCountRef.current = newCount;
    if (!isNew || !shouldAutoScrollRef.current) return;
    msgContainerRef.current?.scrollTo({ top: msgContainerRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  // Re-pin to bottom after an image finishes loading (img has no height until loaded → initial scroll lands short)
  const pinBottomAfterImage = () => {
    if (!shouldAutoScrollRef.current) return;
    requestAnimationFrame(() => {
      const el = msgContainerRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight });
    });
  };

  // Revoke object URL for paste preview
  useEffect(() => {
    if (!pastedImage) { setPastedPreview(''); return; }
    const url = URL.createObjectURL(pastedImage);
    setPastedPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [pastedImage]);

  if (hidden) return null;

  const openPanel = () => {
    setOpen(true);
    shouldAutoScrollRef.current = true;
    localStorage.setItem('client_chat_last_seen', Date.now().toString());
    setUnreadCount(0);
    setTimeout(() => {
      msgContainerRef.current?.scrollTo({ top: msgContainerRef.current.scrollHeight, behavior: 'instant' });
    }, 50);
  };

  const uploadAndSend = async (file: File) => {
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
        body: JSON.stringify({ userId, senderRole: 'user', message: '', fileUrl: url, fileType: type, fileName: name }),
      });
      shouldAutoScrollRef.current = true;
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
    if (!draft.trim()) return;
    const text = draft;
    setDraft('');
    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, senderRole: 'user', message: text }),
      });
      shouldAutoScrollRef.current = true;
    } catch {}
  };

  const handleScroll = () => {
    const el = msgContainerRef.current;
    if (!el) return;
    shouldAutoScrollRef.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 50;
  };

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      {/* Floating button */}
      <button
        onClick={openPanel}
        className="fixed bottom-6 right-6 z-50 btn btn-primary btn-circle shadow-xl w-14 h-14"
        aria-label="เปิด chat"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 badge badge-error badge-sm min-w-5 h-5 text-[10px] font-bold px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 w-80 flex flex-col rounded-2xl shadow-2xl overflow-hidden border border-base-200 bg-base-100"
          style={{ height: '520px' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-base-200 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <span className="text-sm font-bold text-base-content">Chat กับเจ้าหน้าที่</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="btn btn-ghost btn-xs btn-square rounded-lg"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div
            ref={msgContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2 min-h-0"
          >
            {messages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-base-content/30 text-xs">
                ยังไม่มีข้อความ
              </div>
            ) : (
              messages.map((msg) => {
                const isUser = msg.senderRole === 'user';
                if (msg.isDeleted) {
                  return (
                    <div key={msg._id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-xs italic text-base-content/30 px-3 py-1.5">ข้อความถูกลบแล้ว</span>
                    </div>
                  );
                }
                return (
                  <div key={msg._id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] flex flex-col gap-0.5 ${isUser ? 'items-end' : 'items-start'}`}>
                      {msg.fileUrl ? (
                        <ChatFileAttachment
                          fileUrl={msg.fileUrl}
                          fileType={msg.fileType!}
                          fileName={msg.fileName!}
                          isAdmin={isUser}
                          onImageLoad={pinBottomAfterImage}
                        />
                      ) : (
                        <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed wrap-break-word ${
                          isUser
                            ? 'bg-primary text-primary-content rounded-tr-sm'
                            : 'bg-base-200 text-base-content/85 rounded-tl-sm'
                        }`}>
                          {msg.message}
                        </div>
                      )}
                      <span className="text-[10px] text-base-content/30 px-1">{fmtTime(msg.createdAt)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Paste preview bar */}
          {pastedImage && pastedPreview && (
            <div className="px-4 py-2 border-t border-base-200 bg-base-200/40 shrink-0 flex items-center gap-2">
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
          <div className="flex items-center gap-2 px-4 py-3 border-t border-base-200 shrink-0">
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
              placeholder={pastedImage ? 'Enter เพื่อส่งรูป' : 'พิมพ์ข้อความ...'}
              className="input input-bordered input-sm h-9 flex-1 rounded-xl text-sm bg-base-200/60 border-transparent focus:border-primary focus:bg-base-100 transition-colors"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
