"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import QuotationDocument, { RFQData } from "@/components/QuotationDocument";
import ChatFileAttachment from "@/components/chat/ChatFileAttachment";

type ChatType = {
  _id: string;
  senderRole: "user" | "admin";
  message: string;
  fileUrl?: string;
  fileType?: string;
  fileName?: string;
  isEdited?: boolean;
  isDeleted?: boolean;
  createdAt: string;
};

const canEdit = (chat: ChatType) =>
  !chat.fileUrl && !chat.isDeleted &&
  Date.now() - new Date(chat.createdAt).getTime() < 2 * 60 * 1000;

export default function DocumentChatPage() {
  const { data: session, status } = useSession();
  const USER_ID = (session?.user as any)?.id || session?.user?.email;
  const router = useRouter();

  const [message, setMessage] = useState("");
  const [chats, setChats] = useState<ChatType[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [showNewButton, setShowNewButton] = useState(false);
  const [rfq, setRfq] = useState<RFQData | null>(null);
  const [rfqLoading, setRfqLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"doc" | "chat">("doc");
  const [quotationId, setQuotationId] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [downloadReady, setDownloadReady] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showHighlights, setShowHighlights] = useState(true);
  const [pdfModal, setPdfModal]   = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText]   = useState("");

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // ── Mark chats as read เมื่อเข้าหน้านี้ ────────────────────
  useEffect(() => {
    localStorage.setItem("client_chat_last_seen", Date.now().toString());
  }, []);

  // ── Guard: เข้าได้เฉพาะเมื่อ status = "bargaining" หรือ "confirmed" ────────
  useEffect(() => {
    if (!USER_ID) return;
    fetch("/api/quotation")
      .then((r) => r.json())
      .then((data) => {
        const list: { _id: string; status: string }[] = data.quotations ?? [];
        const active = list.find((q) => q.status === "bargaining" || q.status === "confirmed");
        if (!active) router.replace("/Client/quotation");
        else {
          setQuotationId(active._id);
          setIsConfirmed(active.status === "confirmed");
        }
      });
  }, [USER_ID, router]);

  // ── โหลด RFQ ล่าสุดของ user (poll 10s เพื่อรับ version ใหม่) ──
  useEffect(() => {
    if (!USER_ID) return;
    const load = () =>
      fetch(`/api/rfq?userId=${USER_ID}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((data: RFQData[]) => {
          if (Array.isArray(data) && data.length > 0) setRfq(data[0]);
        })
        .finally(() => setRfqLoading(false));
    load();
    const iv = setInterval(load, 10000);
    return () => clearInterval(iv);
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

  const handleSaveEdit = async (id: string) => {
    if (!editText.trim()) return;
    await fetch(`/api/chat/message/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: editText }),
    });
    setEditingId(null);
    loadChats();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("ลบข้อความนี้?")) return;
    await fetch(`/api/chat/message/${id}`, { method: "DELETE" });
    loadChats();
  };

  const uploadAndSend = async (file: File) => {
    if (!USER_ID) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/chat/upload", { method: "POST", body: fd });
      if (!res.ok) { const d = await res.json(); alert(d.message ?? "อัปโหลดไม่สำเร็จ"); return; }
      const { fileUrl, fileType, fileName } = await res.json();
      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: USER_ID, senderRole: "user", message: "", fileUrl, fileType, fileName }),
      });
      setShouldAutoScroll(true);
      loadChats();
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    await uploadAndSend(file);
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    for (const item of e.clipboardData.items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) await uploadAndSend(new File([file], `screenshot-${Date.now()}.png`, { type: file.type }));
        break;
      }
    }
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

  const handleConfirm = async () => {
    if (!quotationId) return;
    setShowConfirmModal(false);
    setConfirmLoading(true);
    await fetch(`/api/quotation/${quotationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "confirmed" }),
    });
    setIsConfirmed(true);
    setConfirmLoading(false);
    router.push("/Client");
  };

  const handleDownload = () => {
    if (!rfq) return;
    setDownloadReady(true);
  };

  useEffect(() => {
    if (!downloadReady || !rfq) return;
    const generate = async () => {
      setPdfLoading(true);
      await new Promise<void>(r => setTimeout(r, 200));
      try { await document.fonts.ready; } catch {}
      const container = document.getElementById("quotation-print-area");
      if (!container) { setDownloadReady(false); setPdfLoading(false); return; }
      const pageEls = container.querySelectorAll<HTMLElement>("[data-pdf-page]");
      if (pageEls.length === 0) { setDownloadReady(false); setPdfLoading(false); return; }
      try {
        const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
          import("html2canvas"),
          import("jspdf"),
        ]);
        const stripStyles = (clonedDoc: Document) => {
          clonedDoc.querySelectorAll('link[rel="stylesheet"]').forEach(el => el.remove());
          clonedDoc.querySelectorAll("style").forEach(el => {
            if (!el.textContent?.includes("fonts.googleapis.com")) el.remove();
          });
        };
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        for (let i = 0; i < pageEls.length; i++) {
          if (i > 0) pdf.addPage();
          const canvas = await html2canvas(pageEls[i], {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false,
            onclone: stripStyles,
          });
          pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, 210, 297);
        }
        pdf.save(`${rfq.rfq_number ?? "quotation"}.pdf`);
      } finally {
        setDownloadReady(false);
        setPdfLoading(false);
      }
    };
    generate();
  }, [downloadReady, rfq]);

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
          <div id="quotation-print-area" className="print-scroll flex-1 min-h-0 overflow-y-auto overflow-x-auto py-6 px-2">
            {rfqLoading ? (
              <div className="flex items-center justify-center h-full">
                <span className="loading loading-spinner loading-md text-primary" />
              </div>
            ) : rfq ? (
              <QuotationDocument rfq={rfq} confirmed={isConfirmed} showHighlights={showHighlights} />
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
                    <div className={`flex items-end gap-1.5 group ${isUser ? "justify-end" : "justify-start"}`}>
                      {!isUser && (
                        <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 mb-0.5">
                          <svg className="w-2.5 h-2.5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}

                      {/* ⋮ menu — เฉพาะ own message */}
                      {isUser && !chat.isDeleted && editingId !== chat._id && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 order-first">
                          {canEdit(chat) && (
                            <button
                              onClick={() => { setEditingId(chat._id); setEditText(chat.message); }}
                              className="w-5 h-5 rounded-full bg-base-content/10 hover:bg-base-content/20 flex items-center justify-center transition-colors"
                              title="แก้ไข"
                            >
                              <svg className="w-2.5 h-2.5 text-base-content/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(chat._id)}
                            className="w-5 h-5 rounded-full bg-base-content/10 hover:bg-error/20 flex items-center justify-center transition-colors"
                            title="ลบ"
                          >
                            <svg className="w-2.5 h-2.5 text-base-content/60 hover:text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}

                      <div className={`max-w-[78%] px-2.5 py-1.5 rounded-xl text-xs leading-relaxed ${
                        isUser
                          ? "bg-primary text-primary-content rounded-br-sm"
                          : "bg-base-100 border border-base-content/20 shadow-mc-sm text-base-content rounded-bl-sm"
                      }`}>
                        {chat.isDeleted ? (
                          <span className="italic opacity-40">ข้อความถูกลบแล้ว</span>
                        ) : chat.fileUrl ? (
                          <ChatFileAttachment fileUrl={chat.fileUrl} fileType={chat.fileType!} fileName={chat.fileName ?? "ไฟล์"} isAdmin={isUser} onPdfClick={(url) => setPdfModal(url)} />
                        ) : (
                          <div>
                            {chat.message}
                            {chat.isEdited && <span className="ml-1 opacity-40 text-[9px]">(แก้ไขแล้ว)</span>}
                          </div>
                        )}
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
              <input
                type="file"
                accept="image/*,application/pdf"
                hidden
                ref={fileInputRef}
                onChange={handleFileSelect}
              />
              <div className="flex items-end gap-2 bg-base-100 border border-base-content/10 rounded-lg p-1.5 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-7 h-7 rounded-md hover:bg-base-200 disabled:opacity-30 transition-all flex items-center justify-center shrink-0"
                  title="แนบไฟล์"
                >
                  {uploading ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    <svg className="w-3.5 h-3.5 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  )}
                </button>
                <textarea
                  className="flex-1 bg-transparent text-base-content text-xs placeholder-base-content/20 resize-none outline-none leading-relaxed max-h-16 min-h-6.5 py-0.5 px-1"
                  placeholder="พิมพ์ข้อความ... (Enter ส่ง)"
                  value={message}
                  rows={1}
                  onPaste={handlePaste}
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

              {/* ── Facebook-style edit modal ── */}
              {editingId && (
                <div className="border-t border-base-content/10 bg-base-100 px-3 py-2.5 animate-in slide-in-from-bottom-2 duration-150">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold text-base-content/50 uppercase tracking-wider">แก้ไขข้อความ</span>
                    <button onClick={() => setEditingId(null)} className="w-4 h-4 flex items-center justify-center text-base-content/40 hover:text-base-content transition-colors">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      className="flex-1 bg-base-200 rounded-full px-3 py-1.5 text-xs text-base-content outline-none focus:ring-1 focus:ring-primary/30 transition-all"
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") handleSaveEdit(editingId);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                    />
                    <button
                      onClick={() => handleSaveEdit(editingId)}
                      disabled={!editText.trim()}
                      className="w-7 h-7 rounded-full bg-primary hover:bg-primary/80 disabled:opacity-30 flex items-center justify-center shrink-0 transition-all"
                    >
                      <svg className="w-3 h-3 text-primary-content" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
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
                  <>
                    {[
                      { label: "เลขที่เอกสาร", value: rfq.rfq_number },
                      { label: "เสนอมา ณ วันที่", value: rfq.rfq_date },
                      { label: "ยืนยันภายใน", value: rfq.due_date },
                      { label: "จำนวนรายการ", value: `${rfq.line_items.length} รายการ` },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="flex justify-between items-center py-2 border-b border-base-content/5"
                      >
                        <span className="text-base-content/40 text-[11px]">{item.label}</span>
                        <span className="text-[11px] font-medium text-base-content">{item.value || "—"}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center py-2 border-t-2 border-success/20 mt-1 bg-success/5 rounded-lg px-1">
                      <span className="text-[11px] font-semibold text-success/80">รวมเงิน</span>
                      <span className="text-[13px] font-bold text-success tabular-nums">
                        {new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
                          rfq.line_items.reduce((s, it) => s + it.quantity * it.unit_price, 0)
                        )} ฿
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-base-content/30 text-[11px] text-center py-4">ไม่พบข้อมูลเอกสาร</p>
                )}
              </div>

              {rfq?.change_log && rfq.change_log.length > 0 && (
                <label className={`flex items-center gap-3 px-3 py-3 rounded-xl border cursor-pointer select-none mb-1 transition-colors ${
                  showHighlights
                    ? "bg-warning/8 border-warning/30"
                    : "bg-base-200/60 border-base-content/10"
                }`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    showHighlights ? "bg-warning/20" : "bg-base-content/8"
                  }`}>
                    <svg className={`w-4 h-4 transition-colors ${showHighlights ? "text-warning" : "text-base-content/30"}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold leading-tight transition-colors ${
                      showHighlights ? "text-warning" : "text-base-content/50"
                    }`}>
                      แสดงการเปลี่ยนแปลง
                    </p>
                    <p className="text-[10px] text-base-content/35 mt-0.5 leading-tight">
                      {showHighlights ? "กำลังแสดง highlight · ปิดก่อนพิมพ์/ดาวน์โหลดถ้าต้องการ" : "ซ่อน highlight แล้ว"}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="toggle toggle-warning toggle-sm shrink-0"
                    checked={showHighlights}
                    onChange={(e) => setShowHighlights(e.target.checked)}
                  />
                </label>
              )}

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
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-base-100 border border-base-content/10 hover:bg-base-200 disabled:opacity-40 disabled:cursor-not-allowed text-base-content text-[11px] font-medium rounded-lg transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  พิมพ์
                </button>
                <button
                  onClick={handleDownload}
                  disabled={!rfq || pdfLoading}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-primary hover:bg-primary/80 disabled:opacity-40 disabled:cursor-not-allowed text-primary-content text-[11px] font-medium rounded-lg transition-colors"
                >
                  {pdfLoading ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  )}
                  {pdfLoading ? "กำลังสร้าง PDF..." : "ดาวน์โหลด PDF"}
                </button>
              </div>

              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={isConfirmed || confirmLoading || !quotationId}
                className={`mt-2 w-full flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium rounded-lg transition-colors ${
                  isConfirmed
                    ? "bg-success/20 text-success cursor-default border border-success/30"
                    : "bg-success hover:bg-success/80 disabled:opacity-40 disabled:cursor-not-allowed text-success-content"
                }`}
              >
                {confirmLoading ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : isConfirmed ? (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    ยืนยันแล้ว
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    ยืนยันรับราคา
                  </>
                )}
              </button>
            </div>
          </div>

        </aside>
      </div>
      {/* ── Confirm Modal ── */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-success/15 flex items-center justify-center">
                <svg className="w-6 h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-base-content">ยืนยันรับราคา?</h3>
                <p className="text-sm text-base-content/50 mt-1 leading-relaxed">
                  เมื่อยืนยันแล้วจะไม่สามารถแก้ไขได้<br />ระบบจะบันทึกการยอมรับราคานี้
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-1">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 btn btn-ghost btn-sm rounded-xl border border-base-content/10"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 btn btn-success btn-sm rounded-xl text-success-content"
              >
                ยืนยัน
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── PDF Modal ── */}
      {pdfModal && (
        <div
          className="fixed inset-0 z-99999 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPdfModal(null)}
        >
          <div className="relative w-full max-w-3xl h-[88vh]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPdfModal(null)}
              className="absolute -top-4 -right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-10"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <iframe src={pdfModal} className="w-full h-full rounded-2xl" />
          </div>
        </div>
      )}
    </>
  );
}
