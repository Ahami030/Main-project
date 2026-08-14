"use client";

import { useEffect, useState } from "react";
import QuotationDocument, { RFQData } from "@/components/QuotationDocument";

// html2canvas chokes on modern CSS colour functions that Tailwind v4 emits, so the
// cloned document is stripped down to the webfont before rasterising.
const stripStyles = (clonedDoc: Document) => {
  clonedDoc.querySelectorAll('link[rel="stylesheet"]').forEach((e) => e.remove());
  clonedDoc.querySelectorAll("style").forEach((e) => {
    if (!e.textContent?.includes("fonts.googleapis.com")) e.remove();
  });
};

interface Props {
  rfq: RFQData;
  /** show signature block — true once the customer has confirmed */
  confirmed?: boolean;
  onClose: () => void;
}

/**
 * Read-only quotation preview with a PDF download, so staff can hand the file to a
 * customer directly (LINE, email) instead of asking them to log in.
 */
export default function QuotationPreviewModal({ rfq, confirmed = false, onClose }: Props) {
  const [downloading, setDownloading] = useState(false);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!printing) return;
    const t = setTimeout(() => {
      const orig = document.title;
      document.title = rfq.rfq_number ?? "quotation";
      window.print();
      document.title = orig;
      setPrinting(false);
    }, 80);
    return () => clearTimeout(t);
  }, [printing, rfq.rfq_number]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await new Promise<void>((r) => setTimeout(r, 200));
      try { await document.fonts.ready; } catch {}
      const container = document.getElementById("quotation-preview-area");
      const pages = container?.querySelectorAll<HTMLElement>("[data-pdf-page]");
      if (!pages || pages.length === 0) return;

      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      for (let i = 0; i < pages.length; i++) {
        if (i > 0) pdf.addPage();
        const canvas = await html2canvas(pages[i], {
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
      setDownloading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap');
        @media print {
          @page { margin: 0; size: A4; }
          body * { visibility: hidden !important; }
          #quotation-preview-area, #quotation-preview-area * { visibility: visible !important; }
          #quotation-preview-area {
            position: absolute !important; top: 0 !important; left: 0 !important;
            width: 100% !important; background: white !important; overflow: visible !important;
            z-index: 9999 !important;
          }
          html, body {
            background: white !important; overflow: visible !important;
            -webkit-print-color-adjust: exact; print-color-adjust: exact;
          }
        }
      `}</style>

      <div className="modal modal-open modal-bottom sm:modal-middle print:hidden">
        <div className="modal-box w-full sm:w-11/12 max-w-4xl h-[92vh] p-0 overflow-hidden flex flex-col">

          <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-b border-base-300/70 shrink-0">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-base-content/55">Preview</p>
              <h3 className="font-medium text-base tracking-mc truncate">
                ใบเสนอราคา {rfq.rfq_number ?? ""}
              </h3>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                className="btn btn-ghost btn-sm rounded-xl gap-1.5 text-xs hidden sm:inline-flex"
                onClick={() => setPrinting(true)}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2m-12 0h12v6H6v-6z" />
                </svg>
                พิมพ์
              </button>
              <button
                className="btn btn-primary btn-sm rounded-xl gap-1.5 text-xs"
                onClick={handleDownload}
                disabled={downloading}
              >
                {downloading ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
                  </svg>
                )}
                ดาวน์โหลด PDF
              </button>
              <button className="btn btn-ghost btn-sm btn-square rounded-lg" onClick={onClose} aria-label="ปิด">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* the sheet is a fixed 210mm — let it scroll inside this box */}
          <div className="flex-1 min-h-0 overflow-auto bg-base-200 p-2 sm:p-4">
            <div id="quotation-preview-area" className="mx-auto w-fit">
              <QuotationDocument rfq={rfq} confirmed={confirmed} />
            </div>
          </div>
        </div>
        <div className="modal-backdrop" onClick={onClose} />
      </div>
    </>
  );
}
