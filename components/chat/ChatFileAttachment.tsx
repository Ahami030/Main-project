'use client';
import { useState } from 'react';

interface Props {
  fileUrl: string;
  fileType: string;
  fileName: string;
  onPdfClick?: () => void; // ถ้าไม่ส่ง → เปิด tab ใหม่
  isAdmin?: boolean;
}

export default function ChatFileAttachment({ fileUrl, fileType, fileName, onPdfClick, isAdmin }: Props) {
  const [open, setOpen] = useState(false);
  const proxyUrl = `/api/chat/file?url=${encodeURIComponent(fileUrl)}`;

  if (fileType === 'image') {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border transition-colors max-w-[180px] ${
            isAdmin
              ? 'border-primary-content/20 hover:bg-primary-content/10'
              : 'border-base-content/15 hover:bg-base-content/5 bg-base-200/50'
          }`}
        >
          <div className="w-7 h-7 rounded-md bg-blue-500/15 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-xs truncate">{fileName}</span>
        </button>

        {open && (
          <div
            className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4"
            onClick={() => setOpen(false)}
          >
            <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setOpen(false)}
                className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-base-100 shadow-lg flex items-center justify-center z-10 hover:bg-base-200 transition-colors"
              >
                <svg className="w-4 h-4 text-base-content" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <img
                src={proxyUrl}
                alt={fileName}
                className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
              />
              <p className="text-center text-white/60 text-xs mt-2">{fileName}</p>
            </div>
          </div>
        )}
      </>
    );
  }

  // PDF
  const handleClick = onPdfClick ?? (() => window.open(proxyUrl, '_blank'));
  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border transition-colors max-w-[180px] ${
        isAdmin
          ? 'border-primary-content/20 hover:bg-primary-content/10'
          : 'border-base-content/15 hover:bg-base-content/5 bg-base-200/50'
      }`}
    >
      <div className="w-7 h-7 rounded-md bg-error/15 flex items-center justify-center shrink-0">
        <svg className="w-4 h-4 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <span className="text-xs truncate">{fileName}</span>
    </button>
  );
}
