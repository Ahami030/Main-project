'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { RfqDoc } from '@/components/admin/ChatRfqSidebar';

// useLayoutEffect on the client (scroll before paint = no visible jump), useEffect on the
// server to avoid React's SSR warning.
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export type UserWithChat = {
  userId: string;
  user: { name: string; email: string } | null;
  latestMessage: string;
  latestFileType?: string | null;
  latestMessageTime: string;
  latestUserMessageTime?: string | null;
};

export type ChatMsg = {
  _id: string;
  senderRole: 'user' | 'admin';
  message: string;
  fileUrl?: string;
  fileType?: string;
  fileName?: string;
  isDeleted?: boolean;
  createdAt: string;
};

/**
 * Shared admin-chat logic for the inline dashboard panel and the floating bubble.
 * The two used to keep parallel copies of this and drifted — that drift was the
 * source of the scroll bugs. One source of truth now.
 */
export function useAdminChat(opts: { enabled?: boolean; onRfqCount?: (n: number) => void } = {}) {
  const { enabled = true } = opts;

  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [users, setUsers] = useState<UserWithChat[]>([]);
  const [activeUser, setActiveUser] = useState<UserWithChat | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [activeRfq, setActiveRfq] = useState<RfqDoc | null | undefined>(undefined);
  const [draft, setDraft] = useState('');
  const [seenAt, setSeenAt] = useState<Record<string, number>>({});
  const [showNewMsgButton, setShowNewMsgButton] = useState(false);
  const [uploading, setUploading] = useState(false);

  const msgContainerRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(true);                 // stick to bottom
  const loadedUserRef = useRef<string | null>(null); // user whose first load we've already jumped for
  const cacheRef = useRef<Record<string, ChatMsg[]>>({}); // last-seen thread per user → instant reopen
  const onRfqCountRef = useRef(opts.onRfqCount);
  useEffect(() => { onRfqCountRef.current = opts.onRfqCount; });

  const activeUserId = activeUser?.userId ?? null;

  // seenAt from localStorage
  useEffect(() => {
    try { setSeenAt(JSON.parse(localStorage.getItem('admin_seen_chats') || '{}')); } catch {}
  }, []);

  // poll users (3s) — piggybacks newRfqCount at zero extra cost
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/chat/users', { cache: 'no-store' });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        setUsers(data.users ?? []);
        onRfqCountRef.current?.(data.newRfqCount ?? 0);
      } catch {}
    };
    fetchUsers();
    const iv = setInterval(fetchUsers, 3000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [enabled]);

  // poll messages (1s) for the active user — cancelled flag drops stale writes on rapid switching
  useEffect(() => {
    if (!activeUserId) return;
    let cancelled = false;
    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/chat/${activeUserId}`, { cache: 'no-store' });
        if (!res.ok || cancelled) return;
        const data: ChatMsg[] = await res.json();
        if (cancelled) return;
        cacheRef.current[activeUserId] = data; // activeUserId from closure — data provably this user's
        setMessages((prev) => {
          const lastIdSame = data[data.length - 1]?._id === prev[prev.length - 1]?._id;
          if (data.length === prev.length && lastIdSame) return prev;
          if (data.length > prev.length && !pinnedRef.current) setShowNewMsgButton(true);
          return data;
        });
      } catch {}
    };
    fetchMessages();
    const iv = setInterval(fetchMessages, 1000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [activeUserId]);

  // fetch RFQ for the active user
  useEffect(() => {
    if (!activeUserId) return;
    let cancelled = false;
    setActiveRfq(undefined);
    (async () => {
      try {
        const res = await fetch(`/api/rfq?userId=${activeUserId}`, { cache: 'no-store' });
        if (cancelled) return;
        if (!res.ok) { setActiveRfq(null); return; }
        const data = await res.json();
        if (cancelled) return;
        setActiveRfq(Array.isArray(data) && data.length > 0 ? data[0] : null);
      } catch { if (!cancelled) setActiveRfq(null); }
    })();
    return () => { cancelled = true; };
  }, [activeUserId]);

  // reset scroll state on user switch — seed from cache so a reopened chat shows instantly
  // (no empty/loading flash), like opening a Messenger thread you've already read
  useEffect(() => {
    pinnedRef.current = true;
    loadedUserRef.current = null;
    setShowNewMsgButton(false);
    setMessages(activeUserId ? (cacheRef.current[activeUserId] ?? []) : []);
  }, [activeUserId]);

  // Auto-scroll — runs BEFORE paint (useLayoutEffect), so the first frame is already at the
  // bottom: messages just appear pinned, no visible jump. Direct scrollTop assignment, never
  // smooth — a smooth animation fires scroll events at intermediate positions, which handleScroll
  // reads as "user scrolled up" and un-pins mid-flight (that fight was the flash / stuck-at-top
  // bug). First render for a user jumps to bottom; after that we only stick if the reader is pinned.
  useIsoLayoutEffect(() => {
    const el = msgContainerRef.current;
    if (!el || messages.length === 0) return;
    if (loadedUserRef.current !== activeUserId) {
      loadedUserRef.current = activeUserId;
      pinnedRef.current = true;
      el.scrollTop = el.scrollHeight;
      return;
    }
    if (pinnedRef.current) el.scrollTop = el.scrollHeight;
  // activeUserId is read but not subscribed — we only react to message changes
  }, [messages]);

  // ── helpers ──
  const isUnread = (u: UserWithChat) =>
    !!u.latestUserMessageTime && new Date(u.latestUserMessageTime).getTime() > (seenAt[u.userId] ?? 0);

  const unreadCount = users.filter(isUnread).length;
  const displayedUsers = activeTab === 'unread' ? users.filter(isUnread) : users;

  const markSeen = (userId: string) => {
    const updated = { ...seenAt, [userId]: Date.now() };
    setSeenAt(updated);
    try { localStorage.setItem('admin_seen_chats', JSON.stringify(updated)); } catch {}
  };

  const openUser = (u: UserWithChat) => { setActiveUser(u); markSeen(u.userId); };
  const closeUser = () => setActiveUser(null);

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
      pinnedRef.current = true;
      setShowNewMsgButton(false);
      const res = await fetch(`/api/chat/${activeUserId}`, { cache: 'no-store' });
      if (res.ok) setMessages(await res.json());
    } catch {}
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
      pinnedRef.current = true;
      setShowNewMsgButton(false);
    } catch {}
    setUploading(false);
  };

  const handleScroll = () => {
    const el = msgContainerRef.current;
    if (!el) return;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 50;
    pinnedRef.current = atBottom;
    if (atBottom) setShowNewMsgButton(false);
  };

  const scrollToBottom = () => {
    const el = msgContainerRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    setShowNewMsgButton(false);
    pinnedRef.current = true;
  };

  // Re-pin after an image loads (rAF so scrollHeight reflects the new layout)
  const pinBottomAfterImage = () => {
    if (!pinnedRef.current) return;
    requestAnimationFrame(() => {
      const el = msgContainerRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight });
    });
  };

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  const userInitial = (u: UserWithChat) => (u.user?.name || u.user?.email || '?')[0].toUpperCase();
  const userName = (u: UserWithChat) => u.user?.name || u.user?.email || 'Unknown';

  return {
    activeTab, setActiveTab,
    users, displayedUsers, unreadCount, isUnread,
    activeUser, activeUserId, openUser, closeUser,
    messages, activeRfq,
    draft, setDraft, sendMessage, uploadAndSend, uploading,
    msgContainerRef, handleScroll, scrollToBottom, showNewMsgButton, pinBottomAfterImage,
    fmtTime, userInitial, userName,
  };
}
