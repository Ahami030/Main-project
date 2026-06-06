"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Message {
  senderRole: "user" | "admin";
  message: string;
  originalCreatedAt?: string;
}

interface ArchivedChat {
  _id: string;
  userId: string;
  originalQuotationId?: string;
  archivedAt: string;
  messages: Message[];
}

export default function ArchivedChatsPage() {
  const router = useRouter();
  const [chats, setChats] = useState<ArchivedChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/history/chats")
      .then((r) => r.ok ? r.json() : [])
      .then(setChats)
      .finally(() => setLoading(false));
  }, []);

  const fmt = (d: string) =>
    new Date(d).toLocaleString("th-TH", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  return (
    <div className="min-h-screen bg-base-200 p-4 lg:p-6">
      <div className="max-w-4xl mx-auto flex flex-col gap-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => router.push("/Admin")}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            กลับ
          </button>
          <div>
            <h1 className="text-lg font-bold text-base-content">ประวัติแชท</h1>
            <p className="text-[11px] text-base-content/40">บทสนทนาที่ถูก archive ทั้งหมด</p>
          </div>
          <span className="badge badge-info badge-outline ml-auto">
            {chats.length} รายการ
          </span>
        </div>

        {/* Content */}
        <div className="bg-base-100 border border-base-300 rounded-2xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex justify-center py-16">
              <span className="loading loading-spinner loading-md" />
            </div>
          ) : chats.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-2 text-base-content/30">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-sm">ยังไม่มีประวัติแชท</p>
            </div>
          ) : (
            <div className="divide-y divide-base-200">
              {chats.map((chat) => (
                <div key={chat._id}>
                  <button
                    className="w-full px-5 py-4 flex items-center gap-4 hover:bg-base-200/40 transition-colors text-left"
                    onClick={() => setExpanded(expanded === chat._id ? null : chat._id)}
                  >
                    <div className="w-9 h-9 rounded-xl bg-info/10 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-base-content truncate">
                        User: <span className="font-mono text-xs text-base-content/60">{chat.userId}</span>
                      </p>
                      <p className="text-[11px] text-base-content/40 mt-0.5">
                        {chat.messages.length} ข้อความ · archive เมื่อ {fmt(chat.archivedAt)}
                      </p>
                    </div>
                    <svg
                      className={`w-4 h-4 text-base-content/30 shrink-0 transition-transform ${expanded === chat._id ? "rotate-180" : ""}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {expanded === chat._id && (
                    <div className="px-5 pb-5 bg-base-200/30">
                      <div className="max-h-72 overflow-y-auto rounded-xl border border-base-200 bg-base-100 p-3 flex flex-col gap-2">
                        {chat.messages.length === 0 ? (
                          <p className="text-xs text-base-content/30 text-center py-4">ไม่มีข้อความ</p>
                        ) : (
                          chat.messages.map((msg, i) => (
                            <div
                              key={i}
                              className={`flex gap-2 ${msg.senderRole === "admin" ? "flex-row-reverse" : ""}`}
                            >
                              <div className={`max-w-[75%] px-3 py-2 rounded-xl text-xs ${
                                msg.senderRole === "admin"
                                  ? "bg-primary text-primary-content"
                                  : "bg-base-200 text-base-content"
                              }`}>
                                <p className="leading-relaxed">{msg.message}</p>
                                {msg.originalCreatedAt && (
                                  <p className="text-[10px] opacity-60 mt-1">{fmt(msg.originalCreatedAt)}</p>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
