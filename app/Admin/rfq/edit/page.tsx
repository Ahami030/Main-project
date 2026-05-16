"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface PDFFile {
  _id: string;
  filename: string;
}

export default function AdminPDFEdit() {
  const router = useRouter();
  const [pdfs, setPdfs] = useState<PDFFile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/pdf/list")
      .then((res) => res.json())
      .then((data: PDFFile[]) => {
        setPdfs(data);
        if (data.length > 0) setSelectedId(data[0]._id);
      })
      .finally(() => setLoading(false));
  }, []);

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
          <div className="px-4 py-3 border-b border-base-200 shrink-0">
            <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-base-content/40">
              Files
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
                  onClick={() => setSelectedId(pdf._id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-1 text-left transition-colors ${
                    selectedId === pdf._id
                      ? "bg-primary/10 border border-primary/20 text-primary"
                      : "hover:bg-base-200 text-base-content/70 border border-transparent"
                  }`}
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                    selectedId === pdf._id ? "bg-primary/20" : "bg-base-200"
                  }`}>
                    <svg className={`w-3.5 h-3.5 ${selectedId === pdf._id ? "text-primary" : "text-base-content/40"}`}
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
                {selected?.filename ?? "เลือกไฟล์เพื่อดู"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-error/10 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-error" />
              <span className="text-[10px] font-semibold text-error">PDF</span>
            </div>
          </div>

          <div className="flex-1 min-h-0">
            {selectedId ? (
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
