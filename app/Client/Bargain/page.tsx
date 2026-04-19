"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

type ChatType = {
  _id: string;
  senderRole: "user" | "admin";
  message: string;
  createdAt: string;
};

export default function DocumentChatPage() {
  const { data: session, status } = useSession();
  const USER_ID = (session?.user as any)?.id || session?.user?.email;

  const [message, setMessage] = useState("");
  const [chats, setChats] = useState<ChatType[]>([]);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [showNewButton, setShowNewButton] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  const loadChats = async () => {
    if (!USER_ID) return;
    const res = await fetch(`/api/chat/${USER_ID}`, { cache: "no-store" });
    const data = await res.json();
    if (data.length > chats.length && !shouldAutoScroll) {
      setShowNewButton(true);
    }
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
    if (shouldAutoScroll) {
      chatContainerRef.current?.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [chats, shouldAutoScroll]);

  useEffect(() => {
    if (!USER_ID) return;
    loadChats();
    const interval = setInterval(loadChats, 1000);
    return () => clearInterval(interval);
  }, [USER_ID]);

  const scrollToBottom = () => {
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: "smooth",
    });
    setShowNewButton(false);
    setShouldAutoScroll(true);
  };

  if (status === "loading")
    return (
      <div className="flex items-center justify-center h-screen bg-[#0f1117]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#e8533a] border-t-transparent rounded-full animate-spin" />
          <span className="text-[#8b8fa8] text-sm font-mono">กำลังโหลด...</span>
        </div>
      </div>
    );

  if (!session)
    return (
      <div className="flex items-center justify-center h-screen bg-[#0f1117] text-[#8b8fa8]">
        กรุณาเข้าสู่ระบบ
      </div>
    );

  return (
    <div className="h-screen w-screen flex flex-col md:flex-row bg-[#0f1117] overflow-hidden font-sans">

      {/* ══════════════════════════════════════
          LEFT: PDF VIEWER (2/3)
      ══════════════════════════════════════ */}
      <div className="md:basis-2/3 flex flex-col h-[45vh] md:h-full bg-[#13151f] border-r border-[#1e2130]">
        {/* PDF Toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#0f1117] border-b border-[#1e2130] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-[#e8533a] flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
              </svg>
            </div>
            <span className="text-[#e2e4ef] text-sm font-medium tracking-tight">เอกสารประกอบการพิจารณา</span>
            <span className="text-[#4a4f6a] text-xs font-mono">· 3 หน้า</span>
          </div>
          <div className="flex items-center gap-1">
            <button className="px-3 py-1.5 text-xs text-[#8b8fa8] hover:text-[#e2e4ef] hover:bg-[#1e2130] rounded-md transition-colors flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              ดาวน์โหลด
            </button>
            <button className="px-3 py-1.5 text-xs text-[#8b8fa8] hover:text-[#e2e4ef] hover:bg-[#1e2130] rounded-md transition-colors flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              พิมพ์
            </button>
          </div>
        </div>

        {/* PDF Iframe */}
        <div className="flex-1 relative overflow-hidden bg-[#1a1c28]">
          <iframe
            src="/pdf/test.pdf"
            className="w-full h-full border-0"
            title="PDF Preview"
          />
        </div>
      </div>

      {/* ══════════════════════════════════════
          RIGHT: SIDEBAR (1/3)
          top half  = CHAT
          bot half  = DOC INFO
      ══════════════════════════════════════ */}
      <aside className="md:basis-1/3 flex flex-col h-[55vh] md:h-full bg-[#0f1117] overflow-hidden gap-2 p-3">

        {/* ── CHAT PANEL ── */}
        <div className="flex flex-col flex-1 min-h-0 border border-[#252838] rounded-xl overflow-hidden bg-[#0d0f18] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">

          {/* Chat Header */}
          <div className="flex items-center justify-between px-3 py-2.5 bg-[#13151f] border-b border-[#252838] shrink-0">
            <div className="flex items-center gap-2">
              <div className="relative flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-[#e8533a]" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#e8533a] absolute animate-ping opacity-60" />
              </div>
              <span className="text-[#e2e4ef] text-xs font-semibold tracking-tight">สื่อสารกับเจ้าหน้าที่</span>
            </div>
            {chats.length > 0 && (
              <span className="text-[10px] text-[#4a4f6a] font-mono bg-[#1e2130] px-2 py-0.5 rounded-full">
                {chats.length}
              </span>
            )}
          </div>

          {/* Messages */}
          <div
            ref={chatContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0"
          >
            {chats.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-center py-4">
                <div className="w-9 h-9 rounded-xl bg-[#13151f] border border-[#1e2130] flex items-center justify-center">
                  <svg className="w-4 h-4 text-[#3d4259]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-[#3d4259] text-[11px]">ยังไม่มีข้อความ</p>
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
                      <div className="flex-1 h-px bg-[#1a1c28]" />
                      <span className="text-[9px] text-[#2e3248] font-mono">
                        {new Date(chat.createdAt).toLocaleTimeString("th-TH", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <div className="flex-1 h-px bg-[#1a1c28]" />
                    </div>
                  )}

                  <div className={`flex items-end gap-1.5 ${isUser ? "justify-end" : "justify-start"}`}>
                    {!isUser && (
                      <div className="w-5 h-5 rounded-full bg-[#e8533a]/20 border border-[#e8533a]/30 flex items-center justify-center shrink-0 mb-0.5">
                        <svg className="w-2.5 h-2.5 text-[#e8533a]" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                    <div
                      className={`max-w-[78%] px-2.5 py-1.5 rounded-xl text-xs leading-relaxed ${
                        isUser
                          ? "bg-[#e8533a] text-white rounded-br-sm"
                          : "bg-[#13151f] border border-[#252838] text-[#c9ccdf] rounded-bl-sm"
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
                className="sticky bottom-1 left-1/2 -translate-x-1/2 w-fit mx-auto flex items-center gap-1 bg-[#e8533a] text-white text-[10px] px-2.5 py-1 rounded-full shadow-lg shadow-[#e8533a]/25 hover:bg-[#d4422a] transition-colors"
              >
                ข้อความใหม่
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>

          {/* Input */}
          <div className="px-3 pb-2.5 pt-2 shrink-0 border-t border-[#252838] bg-[#0d0f18]">
            <div className="flex items-end gap-2 bg-[#13151f] border border-[#252838] rounded-lg p-1.5 focus-within:border-[#e8533a]/50 focus-within:shadow-[0_0_0_2px_rgba(232,83,58,0.08)] transition-all">
              <textarea
                className="flex-1 bg-transparent text-[#e2e4ef] text-xs placeholder-[#2e3248] resize-none outline-none leading-relaxed max-h-16 min-h-[26px] py-0.5 px-1"
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
                className="w-7 h-7 rounded-md bg-[#e8533a] hover:bg-[#d4422a] disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center shrink-0"
              >
                <svg className="w-3 h-3 text-white translate-x-px" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* ── DOC INFO PANEL ── */}
        <div className="flex flex-col flex-1 min-h-0 border border-[#252838] rounded-xl overflow-hidden bg-[#0d0f18] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">

          {/* Info Header */}
          <div className="flex items-center gap-2 px-3 py-2.5 bg-[#13151f] border-b border-[#252838] shrink-0">
            <div className="w-5 h-5 rounded bg-[#e8533a]/15 flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-[#e8533a]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
              </svg>
            </div>
            <span className="text-[#e2e4ef] text-xs font-semibold tracking-tight">ข้อมูลเอกสาร</span>
          </div>

          {/* Info Content */}
          <div className="flex-1 overflow-y-auto px-3 py-2.5 min-h-0">
            <div className="space-y-0 mb-3">
              {[
                { label: "สถานะ", value: "รอการตรวจสอบ", accent: true },
                { label: "วันที่อัปโหลด", value: "19 เม.ย. 2569" },
                { label: "จำนวนหน้า", value: "3 หน้า" },
                { label: "ผู้รับผิดชอบ", value: "เจ้าหน้าที่ฝ่ายเอกสาร" },
              ].map((item, i, arr) => (
                <div
                  key={item.label}
                  className={`flex justify-between items-center py-2 ${i < arr.length - 1 ? "border-b border-[#13151f]" : ""}`}
                >
                  <span className="text-[#4a4f6a] text-[11px]">{item.label}</span>
                  <span className={`text-[11px] font-medium ${item.accent ? "text-[#e8533a]" : "text-[#c9ccdf]"}`}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Chat summary */}
            <div className="flex items-center gap-2 bg-[#13151f] border border-[#1e2130] rounded-lg px-2.5 py-2 mb-3">
              <svg className="w-3 h-3 text-[#4a4f6a] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="text-[#4a4f6a] text-[11px]">
                {chats.length === 0
                  ? "ยังไม่มีการสนทนา"
                  : `${chats.length} ข้อความ · ล่าสุด ${new Date(chats[chats.length - 1]?.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}`}
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#e8533a] hover:bg-[#d4422a] text-white text-[11px] font-medium rounded-lg transition-colors">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                ดาวน์โหลด
              </button>
              <button className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#13151f] hover:bg-[#1e2130] text-[#8b8fa8] hover:text-[#e2e4ef] text-[11px] font-medium rounded-lg border border-[#1e2130] transition-colors">
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
  );
}