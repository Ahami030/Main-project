"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface PDFFile {
  _id: string;
  filename: string;
  userId?: string;
}

interface ChatFile {
  _id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  createdAt: string;
}

type ViewMode = "pdf" | "chatfile";

export default function AdminPDFEdit() {
  const router = useRouter();
  const [pdfs, setPdfs] = useState<PDFFile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatFiles, setChatFiles] = useState<ChatFile[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("pdf");
  const [activeChatFile, setActiveChatFile] = useState<ChatFile | null>(null);

  useEffect(() => {
    fetch("/api/pdf/list")
      .then((res) => res.json())
      .then((data: PDFFile[]) => {
        setPdfs(data);
        if (data.length > 0) {
          setSelectedId(data[0]._id);
          // ดึงไฟล์จาก chat ของ user คนแรก
          if (data[0].userId) fetchChatFiles(data[0].userId);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const fetchChatFiles = async (userId: string) => {
    const res = await fetch(`/api/chat/${userId}`);
    if (!res.ok) return;
    const msgs: { _id: string; fileUrl?: string; fileType?: string; fileName?: string; createdAt: string }[] = await res.json();
    setChatFiles(msgs.filter((m) => m.fileUrl).map((m) => ({
      _id: m._id,
      fileName: m.fileName ?? "ไฟล์",
      fileUrl: m.fileUrl!,
      fileType: m.fileType ?? "pdf",
      createdAt: m.createdAt,
    })));
  };

  const handleSelectPdf = (id: string) => {
    setSelectedId(id);
    setViewMode("pdf");
    setActiveChatFile(null);
    const pdf = pdfs.find((p) => p._id === id);
    if (pdf?.userId) fetchChatFiles(pdf.userId);
  };

  const handleSelectChatFile = (cf: ChatFile) => {
    setActiveChatFile(cf);
    setViewMode("chatfile");
  };

  const selected = pdfs.find((p) => p._id === selectedId);

  return (
    <div className="min-h-screen bg-base-200 p-4 flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-base-content tracking-tight">PDF Documents</h1>
          <p className="text-[11px] text-base-content/40 mt-0.5">
            {pdfs.length} file{pdfs.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          className="btn btn-primary btn-sm h-9 min-h-0 rounded-xl gap-1.5 text-xs font-semibold"
          onClick={() => router.push("/Admin/rfq")}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>

      {/* Body */}
      <div className="flex gap-4 flex-1 h-[calc(100vh-8rem)]">

        {/* Left: file list */}
        <div className="w-64 shrink-0 bg-base-100 rounded-2xl border border-base-300 flex flex-col overflow-hidden">
          {/* PDF section */}
          <div className="px-4 py-3 border-b border-base-200 shrink-0">
            <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-base-content/40">
              PDF ต้นฉบับ
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="skeleton h-10 rounded-xl mb-2" />
              ))
            ) : pdfs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-base-content/25 py-10">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-xs">No PDF files</span>
              </div>
            ) : (
              pdfs.map((pdf) => (
                <button
                  key={pdf._id}
                  onClick={() => handleSelectPdf(pdf._id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-1 text-left transition-colors ${
                    selectedId === pdf._id && viewMode === "pdf"
                      ? "bg-primary/10 border border-primary/20 text-primary"
                      : "hover:bg-base-200 text-base-content/70 border border-transparent"
                  }`}
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                    selectedId === pdf._id && viewMode === "pdf" ? "bg-primary/20" : "bg-base-200"
                  }`}>
                    <svg className={`w-3.5 h-3.5 ${selectedId === pdf._id && viewMode === "pdf" ? "text-primary" : "text-base-content/40"}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium truncate">{pdf.filename}</span>
                </button>
              ))
            )}
          </div>

          {/* Chat files section */}
          {chatFiles.length > 0 && (
            <>
              <div className="px-4 py-3 border-t border-b border-base-200 shrink-0">
                <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-base-content/40">
                  ไฟล์จากแชท ({chatFiles.length})
                </span>
              </div>
              <div className="overflow-y-auto p-2 max-h-48">
                {chatFiles.map((cf) => (
                  <button
                    key={cf._id}
                    onClick={() => handleSelectChatFile(cf)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-1 text-left transition-colors ${
                      activeChatFile?._id === cf._id
                        ? "bg-accent/10 border border-accent/20 text-accent"
                        : "hover:bg-base-200 text-base-content/70 border border-transparent"
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                      activeChatFile?._id === cf._id ? "bg-accent/20" : "bg-base-200"
                    }`}>
                      {cf.fileType === "image" ? (
                        <svg className={`w-3.5 h-3.5 ${activeChatFile?._id === cf._id ? "text-accent" : "text-base-content/40"}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      ) : (
                        <svg className={`w-3.5 h-3.5 ${activeChatFile?._id === cf._id ? "text-accent" : "text-base-content/40"}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                    </div>
                    <span className="text-xs font-medium truncate">{cf.fileName}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Right: viewer */}
        <div className="flex-1 bg-base-100 rounded-2xl border border-base-300 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-base-200 shrink-0">
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-xs text-base-content/60 truncate">
                {viewMode === "chatfile" ? activeChatFile?.fileName : (selected?.filename ?? "เลือกไฟล์เพื่อดู")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {viewMode === "chatfile" && (
                <button
                  onClick={() => { setViewMode("pdf"); setActiveChatFile(null); }}
                  className="flex items-center gap-1 text-[10px] font-semibold text-base-content/60 hover:text-base-content transition-colors px-2 py-1 rounded-lg hover:bg-base-200"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  กลับ PDF ต้นฉบับ
                </button>
              )}
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${
                viewMode === "chatfile" ? "bg-accent/10" : "bg-error/10"
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${viewMode === "chatfile" ? "bg-accent" : "bg-error"}`} />
                <span className={`text-[10px] font-semibold ${viewMode === "chatfile" ? "text-accent" : "text-error"}`}>
                  {viewMode === "chatfile" ? (activeChatFile?.fileType === "image" ? "IMG" : "PDF") : "PDF"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0">
            {viewMode === "chatfile" && activeChatFile ? (
              activeChatFile.fileType === "image" ? (
                <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
                  <img
                    src={`/api/chat/file?url=${encodeURIComponent(activeChatFile.fileUrl)}`}
                    alt={activeChatFile.fileName}
                    className="max-w-full max-h-full object-contain rounded-xl"
                  />
                </div>
              ) : (
                <iframe
                  src={`/api/chat/file?url=${encodeURIComponent(activeChatFile.fileUrl)}`}
                  className="w-full h-full"
                />
              )
            ) : selectedId ? (
              <iframe
                src={`/api/pdf/view?id=${selectedId}`}
                className="w-full h-full"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-base-content/25">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm">ไม่มีไฟล์ PDF</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
