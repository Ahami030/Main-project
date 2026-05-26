"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Chat = { _id: string; senderRole: "user" | "admin"; message: string; createdAt: string };

export default function ChatNotificationBubble() {
  const { data: session } = useSession();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestMsg, setLatestMsg] = useState("");
  const [visible, setVisible] = useState(false);
  const prevCountRef = useRef(0);

  const userId = (session?.user as any)?.id;

  useEffect(() => {
    if (!userId) return;

    const check = async () => {
      try {
        const res = await fetch(`/api/chat/${userId}`, { cache: "no-store" });
        if (!res.ok) return;
        const chats: Chat[] = await res.json();
        const lastSeen = parseInt(localStorage.getItem("client_chat_last_seen") || "0");
        const unread = chats.filter(
          (c) => c.senderRole === "admin" && new Date(c.createdAt).getTime() > lastSeen
        );
        const count = unread.length;

        // animate in เมื่อมีข้อความใหม่เข้ามา
        if (count > prevCountRef.current && count > 0) {
          setVisible(false);
          setTimeout(() => setVisible(true), 50);
        }
        prevCountRef.current = count;
        setUnreadCount(count);
        if (unread.length > 0) setLatestMsg(unread[unread.length - 1].message);
      } catch {}
    };

    check();
    const id = setInterval(check, 5000);
    return () => clearInterval(id);
  }, [userId]);

  if (!unreadCount || !visible) return null;

  return (
    <button
      onClick={() => router.push("/Client/Bargain")}
      className="fixed bottom-6 right-6 z-50 max-w-72 flex items-center gap-3
                 bg-base-100 border border-primary/30 rounded-2xl px-4 py-3
                 shadow-2xl shadow-primary/20 hover:shadow-primary/40
                 hover:border-primary/60 active:scale-95
                 transition-all duration-200
                 animate-[slideUp_0.3s_ease-out]"
      style={{ animation: "slideUp 0.3s ease-out" }}
    >
      {/* ไอคอน chat พร้อม badge */}
      <div className="relative shrink-0">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <svg className="w-4.5 h-4.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <span className="absolute -top-1 -right-1 min-w-4 h-4 px-0.5 rounded-full bg-error text-error-content text-[9px] font-bold flex items-center justify-center">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
        {/* ping animation */}
        <span className="absolute -top-1 -right-1 min-w-4 h-4 rounded-full bg-error animate-ping opacity-40" />
      </div>

      {/* ข้อความ */}
      <div className="flex flex-col items-start min-w-0">
        <span className="text-xs font-semibold text-base-content leading-tight">
          เจ้าหน้าที่ตอบกลับ
          {unreadCount > 1 && (
            <span className="ml-1 text-primary font-bold">{unreadCount} ข้อความ</span>
          )}
        </span>
        {latestMsg && (
          <span className="text-[11px] text-base-content/50 truncate max-w-44 mt-0.5">
            {latestMsg}
          </span>
        )}
      </div>

      {/* arrow */}
      <svg className="w-3.5 h-3.5 text-primary/60 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
      `}</style>
    </button>
  );
}
