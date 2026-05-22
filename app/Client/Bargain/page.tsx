"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import QuotationDocument, { RFQData } from "@/components/QuotationDocument";

type ChatType = {
  _id: string;
  senderRole: "user" | "admin";
  message: string;
  createdAt: string;
};

export default function DocumentChatPage() {
  const { data: session, status } = useSession();
  const USER_ID = (session?.user as any)?.id || session?.user?.email;
  const router = useRouter();

  const [message, setMessage] = useState("");
  const [chats, setChats] = useState<ChatType[]>([]);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [showNewButton, setShowNewButton] = useState(false);
  const [rfq, setRfq] = useState<RFQData | null>(null);
  const [rfqLoading, setRfqLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"doc" | "chat">("doc");

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // ── Guard: เข้าได้เฉพาะเมื่อ status = "bargaining" ────────
  useEffect(() => {
    if (!USER_ID) return;
    fetch("/api/quotation")
      .then((r) => r.json())
      .then((data) => {
        const list: { status: string }[] = data.quotations ?? [];
        const allowed = list.some((q) => q.status === "bargaining");
        if (!allowed) router.replace("/Client/quotation");
      });
  }, [USER_ID, router]);

  // ── โหลด RFQ ล่าสุดของ user ────────────────────────────────
  useEffect(() => {
    if (!USER_ID) return;
    fetch(`/api/rfq?userId=${USER_ID}`)
      .then((r) => r.json())
      .then((data: RFQData[]) => {
        if (Array.isArray(data) && data.length > 0) setRfq(data[0]);
      })
      .finally(() => setRfqLoading(false));
  }, [USER_ID]);

  // ── Chat ────────────────────────────────────────────────────
  const loadChats = async () => {
    if (!USER_ID) return;
    const res = await fetch(`/api/chat/${USER_ID}`, { cache: "no-store" });
    const data = await res.json();
    if (data.length > chats.length && !shouldAutoScroll) setShowNewButton(true);
    setChats(data);
  };

  const sendMessage = async () => {
    if (!message.trim() || !USER_ID) return;
    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: USER_ID, senderRole: "user", message }),
    });
    setMessage("");
    setShouldAutoScroll(true);
    setShowNewButton(false);
    loadChats();
  };

  const handleScroll = () => {
    const container = chatContainerRef.current;
    if (!container) return;
    const isAtBottom =
      container.scrollTop + container.clientHeight >= container.scrollHeight - 50;
    setShouldAutoScroll(isAtBottom);
    if (isAtBottom) setShowNewButton(false);
  };

  useEffect(() => {
    if (shouldAutoScroll)
      chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: "smooth" });
  }, [chats, shouldAutoScroll]);

  useEffect(() => {
    if (!USER_ID) return;
    loadChats();
    const interval = setInterval(loadChats, 1000);
    return () => clearInterval(interval);
  }, [USER_ID]);

  const scrollToBottom = () => {
    chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: "smooth" });
    setShowNewButton(false);
    setShouldAutoScroll(true);
  };

  if (status === "loading")
    return (
      <div className="flex items-center justify-center h-screen bg-base-300">
        <div className="flex flex-col items-center gap-3">
          <span className="loading loading-spinner loading-md text-primary" />
          <span className="text-base-content/50 text-sm font-mono">กำลังโหลด...</span>
        </div>
      </div>
    );

  if (!session)
    return (
      <div className="flex items-center justify-center h-screen bg-base-300 text-base-content/50">
        กรุณาเข้าสู่ระบบ
      </div>
    );

  return (
    <>
      {/* ── Print CSS ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap');
        @media print {
          @page { margin: 0; size: A4; }

          /* Reset เฉพาะ layout shell — ไม่แตะ content ของเอกสาร */
          html, body, [data-theme] {
            background-color: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .print-hide { display: none !important; }
          nav, header, footer { display: none !important; }

          .print-root {
            display: block !important;
            height: auto !important;
            overflow: visible !important;
            width: 100% !important;
            background: white !important;
          }
          .print-doc {
            display: block !important;
            height: auto !important;
            overflow: visible !important;
            width: 100% !important;
            flex-basis: 100% !important;
            border: none !important;
            background: transparent !important;
          }
          .print-scroll {
            height: auto !important;
            overflow: visible !important;
            padding: 0 !important;
            background: transparent !important;
          }
        }
      `}</style>

      <div className="print-root h-screen w-screen flex flex-col md:flex-row bg-base-300 overflow-hidden font-sans">

        {/* ── Mobile Tab Bar ── */}
        <div className="print-hide md:hidden shrink-0 flex bg-base-100 border-b border-base-content/10">
          <button
            onClick={() => setActiveTab("doc")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === "doc"
                ? "border-primary text-primary"
                : "border-transparent text-base-content/40"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            เอกสาร
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === "chat"
                ? "border-primary text-primary"
                : "border-transparent text-base-content/40"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            สนทนา
            {chats.length > 0 && (
              <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-mono">
                {chats.length}
              </span>
            )}
          </button>
        </div>

        {/* ══════════════════════════════════════
            LEFT: QUOTATION DOCUMENT (2/3)
        ══════════════════════════════════════ */}
        <div className={`print-doc md:basis-2/3 flex flex-col min-h-0 md:h-full bg-base-200 border-r border-base-content/10 ${activeTab === "doc" ? "flex-1" : "hidden md:flex"}`}>
          <div className="print-scroll flex-1 min-h-0 overflow-y-auto overflow-x-auto py-6 px-2">
            {rfqLoading ? (
              <div className="flex items-center justify-center h-full">
                <span className="loading loading-spinner loading-md text-primary" />
              </div>
            ) : rfq ? (
              <QuotationDocument rfq={rfq} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-base-content/30">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm">ยังไม่มีเอกสาร</p>
              </div>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════
            RIGHT: SIDEBAR (1/3)
        ══════════════════════════════════════ */}
        <aside className={`print-hide md:basis-1/3 flex flex-col md:h-full bg-base-300 overflow-hidden gap-2 p-3 ${activeTab === "chat" ? "flex-1" : "hidden md:flex"}`}>

          {/* ── CHAT PANEL ── */}
          <div className="flex flex-col flex-1 min-h-0 border border-base-content/10 rounded-xl overflow-hidden bg-base-200 shadow-inner">
            <div className="flex items-center justify-between px-3 py-2.5 bg-base-100 border-b border-base-content/10 shrink-0">
              <div className="flex items-center gap-2">
                <div className="relative flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <div className="w-1.5 h-1.5 rounded-full bg-primary absolute animate-ping opacity-60" />
                </div>
                <span className="text-base-content text-xs font-semibold tracking-tight">สื่อสารกับเจ้าหน้าที่</span>
              </div>
              {chats.length > 0 && (
                <span className="text-[10px] text-base-content/40 font-mono bg-base-200 px-2 py-0.5 rounded-full">
                  {chats.length}
                </span>
              )}
            </div>

            <div
              ref={chatContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0"
            >
              {chats.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-center py-4">
                  <div className="w-9 h-9 rounded-xl bg-base-100 border border-base-content/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-base-content/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-base-content/20 text-[11px]">ยังไม่มีข้อความ</p>
                </div>
              )}

              {chats.map((chat, idx) => {
                const isUser = chat.senderRole === "user";
                const prevChat = chats[idx - 1];
                const showTime =
                  !prevChat ||
                  new Date(chat.createdAt).getTime() - new Date(prevChat.createdAt).getTime() > 60000;

                return (
                  <div key={chat._id}>
                    {showTime && (
                      <div className="flex items-center gap-2 my-1.5">
                        <div className="flex-1 h-px bg-base-content/10" />
                        <span className="text-[9px] text-base-content/20 font-mono">
                          {new Date(chat.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <div className="flex-1 h-px bg-base-content/10" />
                      </div>
                    )}
                    <div className={`flex items-end gap-1.5 ${isUser ? "justify-end" : "justify-start"}`}>
                      {!isUser && (
                        <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 mb-0.5">
                          <svg className="w-2.5 h-2.5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                      <div
                        className={`max-w-[78%] px-2.5 py-1.5 rounded-xl text-xs leading-relaxed ${
                          isUser
                            ? "bg-primary text-primary-content rounded-br-sm"
                            : "bg-base-100 border border-base-content/10 text-base-content rounded-bl-sm"
                        }`}
                      >
                        {chat.message}
                      </div>
                    </div>
                  </div>
                );
              })}

              {showNewButton && (
                <button
                  onClick={scrollToBottom}
                  className="sticky bottom-1 left-1/2 -translate-x-1/2 w-fit mx-auto flex items-center gap-1 bg-primary text-primary-content text-[10px] px-2.5 py-1 rounded-full shadow-lg hover:bg-primary/80 transition-colors"
                >
                  ข้อความใหม่
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
            </div>

            <div className="px-3 pb-2.5 pt-2 shrink-0 border-t border-base-content/10 bg-base-200">
              <div className="flex items-end gap-2 bg-base-100 border border-base-content/10 rounded-lg p-1.5 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                <textarea
                  className="flex-1 bg-transparent text-base-content text-xs placeholder-base-content/20 resize-none outline-none leading-relaxed max-h-16 min-h-6.5 py-0.5 px-1"
                  placeholder="พิมพ์ข้อความ... (Enter ส่ง)"
                  value={message}
                  rows={1}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = e.target.scrollHeight + "px";
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!message.trim()}
                  className="w-7 h-7 rounded-md bg-primary hover:bg-primary/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center shrink-0"
                >
                  <svg className="w-3 h-3 text-primary-content translate-x-px" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* ── DOC INFO PANEL ── */}
          <div className="flex flex-col flex-1 min-h-0 border border-base-content/10 rounded-xl overflow-hidden bg-base-200 shadow-inner">
            <div className="flex items-center gap-2 px-3 py-2.5 bg-base-100 border-b border-base-content/10 shrink-0">
              <div className="w-5 h-5 rounded bg-primary/15 flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                </svg>
              </div>
              <span className="text-base-content text-xs font-semibold tracking-tight">ข้อมูลเอกสาร</span>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-2.5 min-h-0">
              <div className="space-y-0 mb-3">
                {rfq ? (
                  [
                    { label: "เลขที่เอกสาร", value: rfq.rfq_number },
                    { label: "เสนอมา ณ วันที่", value: rfq.rfq_date },
                    { label: "ยืนยันภายใน", value: rfq.due_date },
                    { label: "จำนวนรายการ", value: `${rfq.line_items.length} รายการ` },
                  ].map((item, i, arr) => (
                    <div
                      key={item.label}
                      className={`flex justify-between items-center py-2 ${i < arr.length - 1 ? "border-b border-base-content/5" : ""}`}
                    >
                      <span className="text-base-content/40 text-[11px]">{item.label}</span>
                      <span className="text-[11px] font-medium text-base-content">{item.value || "—"}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-base-content/30 text-[11px] text-center py-4">ไม่พบข้อมูลเอกสาร</p>
                )}
              </div>

              <div className="flex items-center gap-2 bg-base-100 border border-base-content/10 rounded-lg px-2.5 py-2 mb-3">
                <svg className="w-3 h-3 text-base-content/30 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="text-base-content/40 text-[11px]">
                  {chats.length === 0
                    ? "ยังไม่มีการสนทนา"
                    : `${chats.length} ข้อความ · ล่าสุด ${new Date(chats[chats.length - 1]?.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}`}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  disabled={!rfq}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-primary hover:bg-primary/80 disabled:opacity-40 disabled:cursor-not-allowed text-primary-content text-[11px] font-medium rounded-lg transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  พิมพ์
                </button>
              </div>
            </div>
          </div>

        </aside>
      </div>
    </>
  );
}
