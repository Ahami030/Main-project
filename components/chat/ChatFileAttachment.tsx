'use client';
import { useState } from 'react';
import { createPortal } from 'react-dom';

function FileIcon({ type }: { type: string }) {
  if (type === 'image') return (
    <svg className="w-4 h-4 shrink-0 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
  return (
    <svg className="w-4 h-4 shrink-0 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

export { FileIcon };

interface Props {
  fileUrl: string;
  fileType: string;
  fileName: string;
  onPdfClick?: (url: string) => void;
  isAdmin?: boolean;
}

export default function ChatFileAttachment({ fileUrl, fileType, fileName, onPdfClick, isAdmin }: Props) {
  const [open, setOpen] = useState(false);
  const proxyUrl = `/api/chat/file?url=${encodeURIComponent(fileUrl)}`;
  const cardCls = `flex items-center gap-2 px-2.5 py-2 rounded-xl transition-colors max-w-[200px] ${isAdmin ? 'hover:bg-white/10 text-primary-content' : 'hover:bg-base-content/8 text-base-content/80'}`;

  if (fileType === 'image') {
    // ponytail: portal to document.body so the lightbox escapes <dialog> stacking context
    const lightbox = open && typeof document !== 'undefined' ? createPortal(
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-6"
        style={{ zIndex: 999999 }}
        onClick={() => setOpen(false)}
      >
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setOpen(false)}
            className="absolute -top-4 -right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={proxyUrl}
            alt={fileName}
            className="max-w-[88vw] max-h-[88vh] object-contain rounded-2xl shadow-2xl"
          />
          <p className="text-center text-white/40 text-xs mt-3">{fileName}</p>
        </div>
      </div>,
      document.body
    ) : null;

    return (
      <>
        <button onClick={() => setOpen(true)} className="rounded-xl overflow-hidden hover:opacity-90 transition-opacity">
          <img src={proxyUrl} alt={fileName} className="max-w-40 max-h-30 object-cover rounded-xl block" />
        </button>
        {lightbox}
      </>
    );
  }

  // PDF
  const handleClick = onPdfClick ? () => onPdfClick(proxyUrl) : () => window.open(proxyUrl, '_blank');
  return (
    <button onClick={handleClick} className={cardCls}>
      <FileIcon type="pdf" />
      <span className="text-xs truncate leading-none">{fileName}</span>
    </button>
  );
}
