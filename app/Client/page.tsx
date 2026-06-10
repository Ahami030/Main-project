"use client";

import { JSX, useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import ChatNotificationBubble from "@/components/client/ChatNotificationBubble";
import QuotationDocument, { RFQData } from "@/components/QuotationDocument";
import BillingNoteDocument from "@/components/BillingNoteDocument";
import PaymentStatusBadge from "@/components/payment/PaymentStatusBadge";
import PaymentHistoryModal from "@/components/payment/PaymentHistoryModal";

// ─── Types ────────────────────────────────────────────────────────────────────
type QuotationStatus = "sent" | "reviewing" | "completed" | "bargaining" | "confirmed";

interface Quotation {
  _id: string;
  filename: string;
  status: QuotationStatus;
  createdAt: string;
  pdfId:   string | null;
  pdfPath: string | null;
}

type POStatus = "pending" | "accepted" | "billed";

interface BillingInfo {
  _id: string;
  billingNumber: string;
  poNumbers: string[];
  status: string;
}

interface POOrder {
  _id: string;
  poNumber: string;
  status: POStatus;
  fileOrigName: string;
  fileMimeType: string;
  createdAt: string;
  billedAt?: string;
  billingId?: BillingInfo | null;
}

interface BillingButton {
  key:      string;
  label:    string;   // PO number (single) or billing number (group)
  sublabel: string;
  isGroup:  boolean;
  href:     string;
}

interface ModalBillingData {
  poNumbers:      string[];
  billingGroupId?: string;
  userName:       string;
  userEmail:      string;
  taxInvoices:    { _id?: string; invoiceNumber: string; invoiceDate: string; amount: number }[];
  billedAt?:      string | null;
  createdAt:      string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STEPS: { key: QuotationStatus; label: string; sublabel: string }[] = [
  { key: "sent",       label: "ส่งไฟล์แล้ว",        sublabel: "ระบบได้รับเอกสารของคุณแล้ว" },
  { key: "reviewing",  label: "ตรวจสอบ / จัดทำราย", sublabel: "ทีมงานกำลังตรวจสอบเอกสาร" },
  { key: "completed",  label: "ดำเนินการเสร็จสิ้น",  sublabel: "ใบเสนอราคาพร้อมแล้ว" },
  { key: "bargaining", label: "พร้อมต่อรองราคา",     sublabel: "เอกสารพร้อมแล้ว กดเพื่อต่อรอง" },
  { key: "confirmed",  label: "ยืนยันแล้ว",          sublabel: "ลูกค้ายืนยันรับราคาเรียบร้อย" },
];

const STATUS_ORDER: Record<QuotationStatus, number> = {
  sent: 0, reviewing: 1, completed: 2, bargaining: 3, confirmed: 4,
};

const STATUS_META: Record<QuotationStatus, {
  spotlight: string; dot: string; bar: string; badge: string; label: string;
}> = {
  sent:       { spotlight: "border-success/25 bg-success/5",  dot: "bg-success", bar: "from-success to-success/30",   badge: "badge-success", label: "ส่งแล้ว" },
  reviewing:  { spotlight: "border-warning/25 bg-warning/5",  dot: "bg-warning", bar: "from-warning to-warning/30",   badge: "badge-warning", label: "กำลังดำเนินการ" },
  completed:  { spotlight: "border-primary/25 bg-primary/5",  dot: "bg-primary", bar: "from-primary to-primary/30",   badge: "badge-primary", label: "เสร็จสิ้น" },
  bargaining: { spotlight: "border-accent/25  bg-accent/5",   dot: "bg-accent",  bar: "from-accent  to-accent/30",    badge: "badge-accent",  label: "พร้อมต่อรอง" },
  confirmed:  { spotlight: "border-success/40 bg-success/10", dot: "bg-success", bar: "from-success to-success/40",   badge: "badge-success", label: "ยืนยันแล้ว" },
};

const PROCESS_STEPS = [
  { step: "01", title: "อัปโหลดเอกสาร",  desc: "แนบไฟล์ PDF รายการสินค้า ใบสั่งซื้อ หรือ BOQ" },
  { step: "02", title: "ระบบประมวลผล",   desc: "AI อ่านและจัดโครงสร้างข้อมูลอัตโนมัติ พร้อมส่งทีมงาน" },
  { step: "03", title: "ออกใบเสนอราคา",  desc: "ทีมงานจัดทำใบเสนอราคาตามรายการสินค้า" },
  { step: "04", title: "ต่อรองราคา",     desc: "พูดคุยและต่อรองราคากับทีมงานได้โดยตรง" },
];

const PO_STEPS: { key: POStatus; label: string; sublabel: string }[] = [
  { key: "pending",  label: "ส่งไฟล์แล้ว",   sublabel: "ระบบได้รับเอกสารของคุณแล้ว" },
  { key: "accepted", label: "กำลังดำเนินการ", sublabel: "admin รับเรื่องแล้ว กำลังจัดสินค้า" },
  { key: "billed",   label: "วางบิลแล้ว",     sublabel: "ออกใบวางบิลเรียบร้อยแล้ว" },
];

const PO_STATUS_ORDER: Record<POStatus, number> = { pending: 0, accepted: 1, billed: 2 };

const PO_STATUS_META: Record<POStatus, { spotlight: string; dot: string; bar: string; badge: string; label: string }> = {
  pending:  { spotlight: "border-warning/25 bg-warning/5",   dot: "bg-warning", bar: "from-warning to-warning/30",  badge: "badge-warning",  label: "รอตรวจสอบ" },
  accepted: { spotlight: "border-info/25 bg-info/5",         dot: "bg-info",    bar: "from-info to-info/30",         badge: "badge-info",     label: "กำลังดำเนินการ" },
  billed:   { spotlight: "border-success/40 bg-success/10",  dot: "bg-success", bar: "from-success to-success/40",  badge: "badge-success",  label: "วางบิลแล้ว" },
};

// ─── Icons ────────────────────────────────────────────────────────────────────
function IconArrow() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
    </svg>
  );
}

function IconDoc() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M3 3.5A1.5 1.5 0 0 1 4.5 2h6.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 1 .439 1.061V15.5A1.5 1.5 0 0 1 13.5 17h-9A1.5 1.5 0 0 1 3 15.5v-12Z" />
    </svg>
  );
}

function IconBanknote() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
      <rect x="2" y="6" width="20" height="12" rx="2" strokeWidth={2} />
      <circle cx="12" cy="12" r="2" strokeWidth={2} />
      <path strokeWidth={2} strokeLinecap="round" d="M6 12h.01M18 12h.01" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
      <circle cx="12" cy="12" r="9" strokeWidth={2} />
      <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
    </svg>
  );
}

function IconXCircle() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
      <circle cx="12" cy="12" r="9" strokeWidth={2} />
      <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M15 9l-6 6m0-6l6 6" />
    </svg>
  );
}

function IconCheckCircle() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
      <circle cx="12" cy="12" r="9" strokeWidth={2} />
      <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
    </svg>
  );
}

function IconHistory() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
      <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 1 0 2.64-6.36L3 8" />
      <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M3 3v5h5" />
      <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
    </svg>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Page(): JSX.Element {
  const { data: session } = useSession();
  const router = useRouter();

  // ── Page state ───────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [learnMore, setLearnMore]   = useState(false);
  const [modalQuotation, setModalQuotation] = useState<Quotation | null>(null);
  const [rfqForModal, setRfqForModal]             = useState<RFQData | null>(null);
  const [rfqForModalLoading, setRfqForModalLoading] = useState(false);

  const userId =
    (session?.user as any)?.id ??
    (session as any)?.id ??
    (session as any)?.sessionId ??
    "ไม่พบข้อมูล";
  const name  = session?.user?.name  ?? "ผู้ใช้";
  const email = session?.user?.email ?? "";
  const uid   = (session?.user as { id?: string })?.id ?? "";

  // ── Fetch quotations ─────────────────────────────────────────────────────
  const fetchQuotations = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res  = await fetch("/api/quotation");
      const data = await res.json();
      setQuotations(data.quotations ?? []);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchQuotations(); }, [fetchQuotations]);
  useEffect(() => {
    const id = setInterval(() => fetchQuotations(true), 5000);
    return () => clearInterval(id);
  }, [fetchQuotations]);

  // ── Fetch PO orders ──────────────────────────────────────────────────────
  const [poOrders, setPoOrders]     = useState<POOrder[]>([]);
  const [poLoading, setPoLoading]   = useState(true);

  const fetchPOOrders = useCallback(async (silent = false) => {
    if (!silent) setPoLoading(true);
    try {
      const res  = await fetch("/api/po");
      const data = await res.json();
      setPoOrders(Array.isArray(data) ? data : []);
    } finally {
      if (!silent) setPoLoading(false);
    }
  }, []);

  useEffect(() => { fetchPOOrders(); }, [fetchPOOrders]);
  useEffect(() => {
    const id = setInterval(() => fetchPOOrders(true), 8000);
    return () => clearInterval(id);
  }, [fetchPOOrders]);

  // ── Fetch payment proofs ─────────────────────────────────────────────────
  type PaymentInfo = {
    status: "unpaid" | "pending" | "rejected" | "partial" | "approved";
    totalPaid: number;
    billingTotal: number;
    remaining: number;
    lastReviewedAt: string | null;
  };
  const [paymentProofs, setPaymentProofs] = useState<Record<string, PaymentInfo>>({});

  // ── Track which billings the client has already "seen" the latest admin review for ──
  const [seenReviews, setSeenReviews] = useState<Record<string, string>>({});
  useEffect(() => {
    try {
      const raw = localStorage.getItem("payment_seen_reviews");
      if (raw) setSeenReviews(JSON.parse(raw));
    } catch {}
  }, []);

  const markReviewSeen = useCallback((key: string, reviewedAt: string | null) => {
    if (!reviewedAt) return;
    setSeenReviews((prev) => {
      const next = { ...prev, [key]: reviewedAt };
      try { localStorage.setItem("payment_seen_reviews", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const hasUnseenReview = (key: string) => {
    const info = paymentProofs[key];
    if (!info?.lastReviewedAt) return false;
    const seen = seenReviews[key];
    return !seen || new Date(info.lastReviewedAt) > new Date(seen);
  };

  const fetchPaymentProofs = useCallback(async (buttons: { key: string; isGroup: boolean }[]) => {
    if (buttons.length === 0) return;
    try {
      const results = await Promise.all(
        buttons.map(async ({ key, isGroup }) => {
          const param = isGroup ? `billingId=${key}` : `poId=${key}`;
          const proofs: { status: string; amount: number; reviewedAt: string | null }[] = await fetch(`/api/payment-proof?${param}`)
            .then((r) => r.ok ? r.json() : [])
            .catch(() => []);

          let billingTotal = 0;
          try {
            const infoRes = await fetch(isGroup ? `/api/billing/${key}` : `/api/po/${key}`);
            if (infoRes.ok) {
              const info = await infoRes.json();
              billingTotal = (info.taxInvoices ?? []).reduce(
                (s: number, inv: { amount: number }) => s + (inv.amount ?? 0), 0
              );
            }
          } catch {}

          return { key, proofs, billingTotal };
        })
      );

      const map: Record<string, PaymentInfo> = {};
      results.forEach(({ key, proofs, billingTotal }) => {
        const totalPaid = (proofs ?? [])
          .filter((p) => p.status === "approved")
          .reduce((s, p) => s + (p.amount ?? 0), 0);
        const remaining = billingTotal > 0 ? Math.max(0, billingTotal - totalPaid) : 0;

        let status: PaymentInfo["status"];
        if (!proofs || proofs.length === 0) {
          status = "unpaid";
        } else if (proofs.every((p) => p.status === "approved")) {
          status = billingTotal > 0 && remaining > 0 ? "partial" : "approved";
        } else if (proofs.some((p) => p.status === "pending")) {
          status = "pending";
        } else if (proofs.some((p) => p.status === "rejected")) {
          status = "rejected";
        } else {
          status = "unpaid";
        }

        const reviewedTimestamps = (proofs ?? [])
          .map((p) => p.reviewedAt)
          .filter((d): d is string => !!d);
        const lastReviewedAt = reviewedTimestamps.length > 0
          ? reviewedTimestamps.reduce((a, b) => (new Date(a) > new Date(b) ? a : b))
          : null;

        map[key] = { status, totalPaid, billingTotal, remaining, lastReviewedAt };
      });
      setPaymentProofs(map);
    } catch {}
  }, []);

  // ── Fetch RFQ when document modal opens ─────────────────────────────────
  useEffect(() => {
    if (!modalQuotation || !userId || userId === "ไม่พบข้อมูล") return;
    setRfqForModal(null);
    setRfqForModalLoading(true);
    fetch(`/api/rfq?userId=${userId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data: RFQData[]) => {
        if (Array.isArray(data) && data.length > 0) setRfqForModal(data[0]);
      })
      .finally(() => setRfqForModalLoading(false));
  }, [modalQuotation, userId]);

  const [printReady, setPrintReady]         = useState(false);
  const [downloadReady, setDownloadReady]   = useState(false);
  const [printConfirmed, setPrintConfirmed] = useState(false);
  const [showHighlights, setShowHighlights] = useState(true);

  // ── Billing modal state ──────────────────────────────────────────────
  const [modalBilling, setModalBilling]             = useState<ModalBillingData | null>(null);
  const [billingModalLoading, setBillingModalLoading] = useState(false);
  const [billingPrintReady, setBillingPrintReady]   = useState(false);
  const [billingDownloadReady, setBillingDownloadReady] = useState(false);

  // ── Payment history modal state ──────────────────────────────────────
  const [historyModal, setHistoryModal] = useState<{ key: string; isGroup: boolean; label: string } | null>(null);

  // ── Billing modal handlers ───────────────────────────────────────────
  const handleOpenBillingModal = async (btn: BillingButton) => {
    setBillingModalLoading(true);
    setModalBilling(null);
    try {
      let data: ModalBillingData | null = null;
      if (btn.isGroup) {
        const res = await fetch(`/api/billing/${btn.key}`);
        if (res.ok) {
          const b = await res.json();
          data = {
            poNumbers:      b.poNumbers,
            billingGroupId: b.billingNumber,
            userName:       b.customerName,
            userEmail:      b.customerEmail,
            taxInvoices:    b.taxInvoices,
            billedAt:       b.billingDate,
            createdAt:      b.createdAt,
          };
        }
      } else {
        const res = await fetch(`/api/po/${btn.key}`);
        if (res.ok) {
          const po = await res.json();
          data = {
            poNumbers:   [po.poNumber],
            userName:    po.userName,
            userEmail:   po.userEmail,
            taxInvoices: po.taxInvoices ?? [],
            billedAt:    po.billedAt,
            createdAt:   po.createdAt,
          };
        }
      }
      if (data) setModalBilling(data);
    } finally {
      setBillingModalLoading(false);
    }
  };

  const handleBillingPrint = () => {
    if (!modalBilling) return;
    setBillingPrintReady(true);
    setTimeout(() => {
      window.print();
      setBillingPrintReady(false);
    }, 80);
  };

  const handleBillingDownload = () => {
    if (!modalBilling) return;
    setBillingDownloadReady(true);
  };

  // ── Billing PDF download effect ──────────────────────────────────────
  useEffect(() => {
    if (!billingDownloadReady || !modalBilling) return;
    const generate = async () => {
      await new Promise<void>((r) => setTimeout(r, 200));
      try { await document.fonts.ready; } catch {}
      const el = document.getElementById("billing-note-print-area");
      if (!el) { setBillingDownloadReady(false); return; }
      try {
        const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
          import("html2canvas"),
          import("jspdf"),
        ]);
        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
        });
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, 210, 297);
        const filename = modalBilling.billingGroupId
          ? `${modalBilling.billingGroupId}.pdf`
          : `${modalBilling.poNumbers[0] ?? "billing"}.pdf`;
        pdf.save(filename);
      } finally {
        setBillingDownloadReady(false);
      }
    };
    generate();
  }, [billingDownloadReady, modalBilling]);

  const handlePrint = () => {
    if (!rfqForModal) return;
    setPrintConfirmed(modalQuotation?.status === "confirmed");
    setPrintReady(true);
  };

  const handleDirectPrint = async () => {
    if (!userId || userId === "ไม่พบข้อมูล" || !latest) return;
    try {
      const res  = await fetch(`/api/rfq?userId=${userId}`, { cache: "no-store" });
      const data: RFQData[] = await res.json();
      if (!Array.isArray(data) || data.length === 0) return;
      setRfqForModal(data[0]);
      setPrintConfirmed(latest.status === "confirmed");
      setPrintReady(true);
    } catch {}
  };

  const handleDownloadPdf = () => {
    if (!rfqForModal) return;
    setPrintConfirmed(modalQuotation?.status === "confirmed");
    setDownloadReady(true);
  };

  const handleDirectDownload = async () => {
    if (!userId || userId === "ไม่พบข้อมูล" || !latest) return;
    try {
      const res  = await fetch(`/api/rfq?userId=${userId}`, { cache: "no-store" });
      const data: RFQData[] = await res.json();
      if (!Array.isArray(data) || data.length === 0) return;
      setRfqForModal(data[0]);
      setPrintConfirmed(latest.status === "confirmed");
      setDownloadReady(true);
    } catch {}
  };

  useEffect(() => {
    if (!printReady) return;
    const id = setTimeout(() => {
      const orig = document.title;
      document.title = rfqForModal?.rfq_number ?? "quotation";
      window.print();
      document.title = orig;
      setPrintReady(false);
    }, 80);
    return () => clearTimeout(id);
  }, [printReady, rfqForModal]);

  useEffect(() => {
    if (!downloadReady || !rfqForModal) return;
    const generate = async () => {
      await new Promise<void>(r => setTimeout(r, 200));
      try { await document.fonts.ready; } catch {}
      const container = document.getElementById("quotation-print-area");
      if (!container) { setDownloadReady(false); return; }
      const pageEls = container.querySelectorAll<HTMLElement>("[data-pdf-page]");
      if (pageEls.length === 0) { setDownloadReady(false); return; }
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
        pdf.save(`${rfqForModal.rfq_number ?? "quotation"}.pdf`);
      } finally {
        setDownloadReady(false);
      }
    };
    generate();
  }, [downloadReady, rfqForModal]);

  // ── Derived state ─────────────────────────────────────────────────────────
  const latest      = quotations[0] ?? null;
  const meta        = latest ? STATUS_META[latest.status] : null;
  const currentStep = latest ? STEPS.find((s) => s.key === latest.status)! : null;
  const isInProgress = latest?.status === "sent" || latest?.status === "reviewing";

  const poLatest       = poOrders[0] ?? null;
  const poMeta         = poLatest ? PO_STATUS_META[poLatest.status] : null;
  const poCurrentStep  = poLatest ? PO_STEPS.find((s) => s.key === poLatest.status)! : null;
  const poIsInProgress = poLatest?.status === "pending" || poLatest?.status === "accepted";

  // Derive billing buttons from ALL billed POs (single + group, deduped)
  const billingButtons: BillingButton[] = (() => {
    const billedPOs = poOrders.filter((po) => po.status === "billed");

    // Single-PO billing (no billingId)
    const singles: BillingButton[] = billedPOs
      .filter((po) => !po.billingId)
      .map((po) => ({
        key:      po._id,
        label:    po.poNumber,
        sublabel: "ออกใบวางบิลเรียบร้อยแล้ว",
        isGroup:  false,
        href:     `/Client/po/${po._id}`,
      }));

    // Group billing (billingId populated) — deduped by billing _id
    const seen = new Set<string>();
    const groups: BillingButton[] = billedPOs
      .filter((po) => po.billingId)
      .filter((po) => {
        const bid = po.billingId!._id;
        if (seen.has(bid)) return false;
        seen.add(bid);
        return true;
      })
      .map((po) => {
        const bi       = po.billingId!;
        const otherPOs = bi.poNumbers.filter((pn) => pn !== po.poNumber);
        return {
          key:      bi._id,
          label:    bi.billingNumber,
          sublabel: otherPOs.length > 0 ? `รวมกับ ${otherPOs.join(", ")}` : "ใบวางบิลรวม",
          isGroup:  true,
          href:     `/Client/po/${po._id}`,
        };
      });

    return [...singles, ...groups];
  })();

  // Fetch payment proofs whenever billing buttons change (both group and single-PO)
  useEffect(() => {
    if (billingButtons.length === 0) return;
    fetchPaymentProofs(billingButtons.map((b) => ({ key: b.key, isGroup: b.isGroup })));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billingButtons.map((b) => b.key).join(",")]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-base-200 text-base-content">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-4 md:space-y-5">

        {/* ── User Card ─────────────────────────────────────────── */}
        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body py-5 px-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="avatar placeholder shrink-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent text-primary-content font-bold text-lg flex items-center justify-center">
                    <span>{name[0]?.toUpperCase()}</span>
                  </div>
                </div>
                <div>
                  <h2 className="font-semibold text-base leading-snug">
                    Welcome &ldquo;{name}&rdquo;
                  </h2>
                  <p className="text-sm text-base-content/55 mt-0.5">
                    You are logged in as {email}
                  </p>
                  {uid && (
                    <p className="text-xs text-base-content/35 mt-0.5">
                      Your id is: {uid}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-success font-medium shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                ออนไลน์
              </div>
            </div>
          </div>
        </div>

        {/* ── Main Section ──────────────────────────────────────── */}
        {loading ? (

          <div className="card bg-base-100 border border-base-300 shadow-sm">
            <div className="card-body items-center py-24 gap-3">
              <span className="loading loading-spinner loading-lg text-primary" />
              <p className="text-sm text-base-content/40">กำลังโหลด...</p>
            </div>
          </div>

        ) : latest && meta && currentStep ? (

          /* ── Status Card (มี quotation อยู่) ── */
          <div className="card bg-base-100 border border-base-300 shadow-sm overflow-hidden">
            <div className={`h-1 bg-gradient-to-r ${meta.bar}`} />
            <div className="card-body gap-5 pt-5 px-6 md:px-8">

              {/* File header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-base-200 flex items-center justify-center shrink-0 text-base-content/35">
                    <IconDoc />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs tracking-widest uppercase text-primary/60 font-medium mb-0.5">
                      Quotation Request
                    </p>
                    <p className="font-semibold leading-snug truncate max-w-lg">
                      {latest.filename}
                    </p>
                    <p className="text-xs text-base-content/40 mt-0.5">
                      {new Date(latest.createdAt).toLocaleDateString("th-TH", {
                        year: "numeric", month: "short", day: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                <span className={`badge shrink-0 ${meta.badge}`}>{meta.label}</span>
              </div>

              <div className="divider my-0" />

              <div className="flex flex-col md:flex-row gap-6">

                {/* Left: spotlight + CTA */}
                <div className="flex-1 flex flex-col gap-4">
                  <div
                    onClick={
                      latest.status === "bargaining" || latest.status === "confirmed"
                        ? () => setModalQuotation(latest)
                        : undefined
                    }
                    className={`rounded-2xl border px-5 py-5 flex items-center gap-4 ${meta.spotlight} ${
                      latest.status === "bargaining" || latest.status === "confirmed"
                        ? "cursor-pointer hover:opacity-90 transition-opacity"
                        : ""
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full shrink-0 ${meta.dot} ${isInProgress ? "animate-pulse" : ""}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{currentStep.label}</p>
                      <p className="text-sm text-base-content/50 mt-0.5">{currentStep.sublabel}</p>
                    </div>
                    {isInProgress && <span className="loading loading-dots loading-sm opacity-30" />}
                    {(latest.status === "bargaining" || latest.status === "confirmed") && (
                      <svg className="w-4 h-4 text-base-content/30 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </div>

                  {/* Next step hint */}
                  {latest.status !== "bargaining" && latest.status !== "confirmed" && (
                    STEPS[STATUS_ORDER[latest.status] + 1] ? (
                      <div className="flex items-center gap-3 text-xs text-base-content/30">
                        <div className="flex-1 h-px bg-base-300" />
                        <span>ขั้นถัดไป · {STEPS[STATUS_ORDER[latest.status] + 1].label}</span>
                        <div className="flex-1 h-px bg-base-300" />
                      </div>
                    ) : null
                  )}
                  {latest.status === "bargaining" && (
                    <button
                      onClick={() => router.push("/Client/Bargain")}
                      className="btn btn-accent w-full font-semibold gap-2 shadow-lg shadow-accent/20"
                    >
                      ไปยังหน้าต่อรองราคา
                      <IconArrow />
                    </button>
                  )}
                  {latest.status === "confirmed" && (
                    <div className="flex gap-2">
                      <button
                        onClick={handleDirectPrint}
                        disabled={printReady}
                        className="btn btn-success flex-1 font-semibold gap-2 shadow-lg shadow-success/20"
                      >
                        {printReady ? (
                          <span className="loading loading-spinner loading-sm" />
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                        )}
                        พิมพ์
                      </button>
                      <button
                        onClick={handleDirectDownload}
                        disabled={downloadReady}
                        className="btn btn-outline btn-success flex-1 font-semibold gap-2"
                      >
                        {downloadReady ? (
                          <span className="loading loading-spinner loading-sm" />
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        )}
                        ดาวน์โหลด
                      </button>
                    </div>
                  )}
                </div>

                {/* Right: steps timeline */}
                <div className="md:w-64 shrink-0 flex flex-col gap-0">
                  {STEPS.map((step, i) => {
                    const done    = i <= STATUS_ORDER[latest.status];
                    const current = i === STATUS_ORDER[latest.status];
                    return (
                      <div key={step.key} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors
                            ${done ? "bg-primary text-primary-content" : "bg-base-200 text-base-content/30"}`}>
                            {done ? "✓" : i + 1}
                          </div>
                          {i < STEPS.length - 1 && (
                            <div className={`w-px flex-1 my-1 ${done ? "bg-primary/40" : "bg-base-300"}`} />
                          )}
                        </div>
                        <div className="pb-4 pt-1 min-w-0">
                          <p className={`text-sm font-medium leading-tight ${current ? "text-base-content" : done ? "text-base-content/70" : "text-base-content/30"}`}>
                            {step.label}
                          </p>
                          {current && (
                            <p className="text-xs text-base-content/45 mt-0.5">{step.sublabel}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            </div>
          </div>

        ) : (

          /* ── Hero CTA (ยังไม่มี quotation) ── */
          <div className="card bg-base-100 border border-base-300 shadow-sm overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-primary to-accent" />
            <div className="card-body py-10 px-8 gap-0">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-10">

                {/* Left: text */}
                <div className="flex-1">
                  <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-6">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    Quotation Request System
                  </span>
                  <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.2] mb-4">
                    ส่งเอกสาร<br />
                    เพื่อจัดทำ<span className="text-primary">ใบเสนอราคา</span>
                  </h1>
                  <p className="text-base text-base-content/50 leading-relaxed max-w-md mb-8">
                    อัปโหลดไฟล์รายการสินค้า ทีมงานจะจัดทำใบเสนอราคา
                    และพร้อมต่อรองกับคุณในทุกขั้นตอน
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => router.push("/Client/quotation")}
                      className="btn btn-primary btn-lg gap-2 shadow-lg shadow-primary/20"
                    >
                      เริ่มต้นเลย
                      <IconArrow />
                    </button>
                    <button
                      onClick={() => setLearnMore(true)}
                      className="btn btn-outline btn-lg"
                    >
                      ดูขั้นตอน
                    </button>
                  </div>
                </div>

                {/* Right: step list */}
                <div className="hidden md:flex flex-col gap-3 w-72 shrink-0">
                  {[
                    { label: "อัปโหลดเอกสาร",    sub: "รองรับ PDF สูงสุด 10 MB" },
                    { label: "ระบบประมวลผล AI",   sub: "แปลงข้อมูลอัตโนมัติ" },
                    { label: "ออกใบเสนอราคา",    sub: "ทีมงานจัดทำให้ทันที" },
                    { label: "ต่อรองราคาออนไลน์", sub: "Chat โดยตรงกับทีมงาน" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl bg-base-200 px-4 py-3">
                      <div className="w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold leading-tight">{item.label}</p>
                        <p className="text-xs text-base-content/40 mt-0.5">{item.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          </div>

        )}

        {/* ── PO Section ────────────────────────────────────────── */}
        {poLoading ? (

          <div className="card bg-base-100 border border-base-300 shadow-sm">
            <div className="card-body items-center py-12 gap-3">
              <span className="loading loading-spinner loading-lg text-secondary" />
              <p className="text-sm text-base-content/40">กำลังโหลดใบสั่งซื้อ...</p>
            </div>
          </div>

        ) : poLatest && poMeta && poCurrentStep ? (

          /* ── PO Status Card ── */
          <div className="card bg-base-100 border border-base-300 shadow-sm overflow-hidden">
            <div className={`h-1 bg-linear-to-r ${poMeta.bar}`} />
            <div className="card-body gap-5 pt-5 px-6 md:px-8">

              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-base-200 flex items-center justify-center shrink-0 text-base-content/35">
                    <IconDoc />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs tracking-widest uppercase text-secondary/60 font-medium mb-0.5">
                      Purchase Order
                    </p>
                    <p className="font-semibold leading-snug">{poLatest.poNumber}</p>
                    <p className="text-xs text-base-content/40 mt-0.5 truncate max-w-xs">
                      {poLatest.fileOrigName} · {new Date(poLatest.createdAt).toLocaleDateString("th-TH", {
                        year: "numeric", month: "short", day: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                <span className={`badge shrink-0 ${poMeta.badge}`}>{poMeta.label}</span>
              </div>

              <div className="divider my-0" />

              <div className="flex flex-col md:flex-row gap-6">

                {/* Left: spotlight (non-billed) OR billing list (billed) */}
                <div className="flex-1 flex flex-col gap-4">
                  {poLatest.status === "billed" && billingButtons.length > 0 ? (

                    /* ── Billing list card ── */
                    <div className="rounded-2xl border border-success/30 overflow-hidden shadow-sm">

                      {/* Header */}
                      <div className={`px-5 py-4 flex items-center gap-3 ${poMeta.spotlight}`}>
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${poMeta.dot}`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">วางบิลแล้ว</p>
                          <p className="text-xs text-base-content/50 mt-0.5">
                            {billingButtons.length > 1
                              ? `${billingButtons.length} ใบวางบิล พร้อมดูแล้ว`
                              : "ออกใบวางบิลเรียบร้อยแล้ว"}
                          </p>
                        </div>
                        {billingButtons.length > 1 && (
                          <span className="badge badge-success badge-sm font-bold tabular-nums">
                            {billingButtons.length}
                          </span>
                        )}
                      </div>

                      {/* Billing rows */}
                      <div className="divide-y divide-base-200">
                        {billingButtons.map((btn) => (
                          <button
                            key={btn.key}
                            onClick={() => handleOpenBillingModal(btn)}
                            className="w-full px-5 py-4 flex items-center gap-3 bg-base-100 hover:bg-base-200/60 active:bg-base-200 transition-colors text-left group"
                          >
                            {/* Icon */}
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                              btn.isGroup
                                ? "bg-primary/10 text-primary group-hover:bg-primary/20"
                                : "bg-success/10 text-success group-hover:bg-success/20"
                            }`}>
                              {btn.isGroup ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-sm leading-tight">
                                  {btn.isGroup ? `ใบวางบิล ${btn.label}` : btn.label}
                                </span>
                                {btn.isGroup && (
                                  <span className="badge badge-primary badge-xs">กลุ่ม</span>
                                )}
                                {btn.isGroup && paymentProofs[btn.key] && (
                                  <PaymentStatusBadge
                                    status={paymentProofs[btn.key].status}
                                    size="xs"
                                  />
                                )}
                              </div>
                              <p className="text-xs text-base-content/45 mt-0.5 truncate">
                                {btn.isGroup ? `· ${btn.sublabel}` : btn.sublabel}
                              </p>
                            </div>

                            {/* Arrow */}
                            <svg
                              className="w-4 h-4 text-base-content/25 group-hover:text-base-content/50 group-hover:translate-x-0.5 transition-all shrink-0"
                              fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        ))}
                      </div>

                      {/* ── Payment action section ── */}
                      <div className="p-3 space-y-2 bg-base-200/30 border-t border-base-300">
                        {billingButtons.map((btn) => {
                          const info     = paymentProofs[btn.key];
                          const pStatus  = info?.status ?? "unpaid";
                          // btn.key = billingId (group) or poId (single-PO legacy) — both work now
                          const billingKey   = btn.key;
                          const billingLabel = btn.isGroup ? `ใบวางบิล ${btn.label}` : btn.label;
                          const qs           = !btn.isGroup ? "?t=po" : "";

                          if (pStatus === "pending") {
                            return (
                              <div key={`pay-${btn.key}`} className="rounded-xl border border-warning/30 bg-warning/5 px-4 py-3.5 flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-full bg-warning/15 text-warning flex items-center justify-center shrink-0 animate-pulse">
                                  <IconClock />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm text-warning">รอตรวจสอบการชำระเงิน</p>
                                  <p className="text-xs text-base-content/45 mt-0.5 truncate">
                                    {billingLabel} · ทีมงานกำลังตรวจสอบหลักฐานการโอนเงินของคุณ
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    className="btn btn-sm btn-ghost btn-square indicator"
                                    title="ประวัติการชำระเงิน"
                                    onClick={() => {
                                      setHistoryModal({ key: billingKey, isGroup: btn.isGroup, label: billingLabel });
                                      markReviewSeen(billingKey, info?.lastReviewedAt ?? null);
                                    }}
                                  >
                                    {hasUnseenReview(billingKey) && (
                                      <span className="indicator-item indicator-top indicator-end w-2.5 h-2.5 bg-error rounded-full ring-2 ring-base-100" />
                                    )}
                                    <IconHistory />
                                  </button>
                                  <button
                                    className="btn btn-sm btn-outline btn-warning"
                                    onClick={() => router.push(`/Client/payment/status/${billingKey}${qs}`)}
                                  >
                                    ดูสถานะ
                                  </button>
                                </div>
                              </div>
                            );
                          }

                          if (pStatus === "rejected") {
                            return (
                              <div key={`pay-${btn.key}`} className="rounded-xl border border-error/30 bg-error/5 px-4 py-3.5 flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-full bg-error/15 text-error flex items-center justify-center shrink-0">
                                  <IconXCircle />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm text-error">หลักฐานการชำระเงินถูกปฏิเสธ</p>
                                  <p className="text-xs text-base-content/45 mt-0.5 truncate">
                                    {billingLabel} · กรุณาตรวจสอบและส่งหลักฐานการโอนเงินใหม่อีกครั้ง
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    className="btn btn-sm btn-ghost btn-square indicator"
                                    title="ประวัติการชำระเงิน"
                                    onClick={() => {
                                      setHistoryModal({ key: billingKey, isGroup: btn.isGroup, label: billingLabel });
                                      markReviewSeen(billingKey, info?.lastReviewedAt ?? null);
                                    }}
                                  >
                                    {hasUnseenReview(billingKey) && (
                                      <span className="indicator-item indicator-top indicator-end w-2.5 h-2.5 bg-error rounded-full ring-2 ring-base-100" />
                                    )}
                                    <IconHistory />
                                  </button>
                                  <button
                                    className="btn btn-sm btn-error"
                                    onClick={() => router.push(`/Client/payment/${billingKey}${qs}`)}
                                  >
                                    ส่งหลักฐานใหม่
                                  </button>
                                </div>
                              </div>
                            );
                          }

                          if (pStatus === "partial") {
                            return (
                              <div key={`pay-${btn.key}`} className="rounded-xl border border-info/30 bg-info/5 px-4 py-3.5 flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-full bg-info/15 text-info flex items-center justify-center shrink-0">
                                  <IconBanknote />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm text-info">ชำระเงินบางส่วนแล้ว</p>
                                  <p className="text-xs text-base-content/45 mt-0.5 truncate">
                                    {billingLabel} · ยังเหลืออีก{" "}
                                    {info!.remaining.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    className="btn btn-sm btn-ghost btn-square indicator"
                                    title="ประวัติการชำระเงิน"
                                    onClick={() => {
                                      setHistoryModal({ key: billingKey, isGroup: btn.isGroup, label: billingLabel });
                                      markReviewSeen(billingKey, info?.lastReviewedAt ?? null);
                                    }}
                                  >
                                    {hasUnseenReview(billingKey) && (
                                      <span className="indicator-item indicator-top indicator-end w-2.5 h-2.5 bg-error rounded-full ring-2 ring-base-100" />
                                    )}
                                    <IconHistory />
                                  </button>
                                  <button
                                    className="btn btn-sm btn-info"
                                    onClick={() => router.push(`/Client/payment/${billingKey}${qs}`)}
                                  >
                                    ชำระส่วนที่เหลือ
                                  </button>
                                </div>
                              </div>
                            );
                          }

                          if (pStatus === "approved") {
                            return (
                              <div key={`pay-${btn.key}`} className="rounded-xl border border-success/30 bg-success/5 px-4 py-3.5 flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-full bg-success/15 text-success flex items-center justify-center shrink-0">
                                  <IconCheckCircle />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm text-success">ชำระเงินเรียบร้อยแล้ว</p>
                                  <p className="text-xs text-base-content/45 mt-0.5 truncate">
                                    {billingLabel} · ยืนยันการชำระเงินเรียบร้อย พร้อมดาวน์โหลดใบเสร็จ
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    className="btn btn-sm btn-ghost btn-square indicator"
                                    title="ประวัติการชำระเงิน"
                                    onClick={() => {
                                      setHistoryModal({ key: billingKey, isGroup: btn.isGroup, label: billingLabel });
                                      markReviewSeen(billingKey, info?.lastReviewedAt ?? null);
                                    }}
                                  >
                                    {hasUnseenReview(billingKey) && (
                                      <span className="indicator-item indicator-top indicator-end w-2.5 h-2.5 bg-error rounded-full ring-2 ring-base-100" />
                                    )}
                                    <IconHistory />
                                  </button>
                                  <button
                                    className="btn btn-sm btn-success"
                                    onClick={() => router.push(`/Client/payment/status/${billingKey}${qs}`)}
                                  >
                                    ดูใบเสร็จ
                                  </button>
                                </div>
                              </div>
                            );
                          }

                          // unpaid (default)
                          return (
                            <div key={`pay-${btn.key}`} className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3.5 flex items-center gap-3.5">
                              <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
                                <IconBanknote />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm">ชำระเงิน</p>
                                <p className="text-xs text-base-content/45 mt-0.5 truncate">
                                  {billingLabel} · กรุณาอัปโหลดหลักฐานการโอนเงินเพื่อยืนยันคำสั่งซื้อ
                                </p>
                              </div>
                              <button
                                className="btn btn-sm btn-primary shrink-0"
                                onClick={() => router.push(`/Client/payment/${billingKey}${qs}`)}
                              >
                                ส่งหลักฐานการโอนเงิน
                              </button>
                            </div>
                          );
                        })}
                      </div>

                    </div>

                  ) : (

                    /* ── Normal spotlight (pending / accepted) ── */
                    <>
                      <div className={`rounded-2xl border px-5 py-5 flex items-center gap-4 ${poMeta.spotlight}`}>
                        <span className={`w-3 h-3 rounded-full shrink-0 ${poMeta.dot} ${poIsInProgress ? "animate-pulse" : ""}`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold">{poCurrentStep.label}</p>
                          <p className="text-sm text-base-content/50 mt-0.5">{poCurrentStep.sublabel}</p>
                        </div>
                        {poIsInProgress && <span className="loading loading-dots loading-sm opacity-30" />}
                      </div>
                      {PO_STEPS[PO_STATUS_ORDER[poLatest.status] + 1] && (
                        <div className="flex items-center gap-3 text-xs text-base-content/30">
                          <div className="flex-1 h-px bg-base-300" />
                          <span>ขั้นถัดไป · {PO_STEPS[PO_STATUS_ORDER[poLatest.status] + 1].label}</span>
                          <div className="flex-1 h-px bg-base-300" />
                        </div>
                      )}
                    </>

                  )}
                </div>

                {/* Right: steps timeline */}
                <div className="md:w-64 shrink-0 flex flex-col gap-0">
                  {PO_STEPS.map((step, i) => {
                    const done    = i <= PO_STATUS_ORDER[poLatest.status];
                    const current = i === PO_STATUS_ORDER[poLatest.status];
                    return (
                      <div key={step.key} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors
                            ${done ? "bg-secondary text-secondary-content" : "bg-base-200 text-base-content/30"}`}>
                            {done ? "✓" : i + 1}
                          </div>
                          <div className={`w-px flex-1 my-1 ${done ? "bg-secondary/40" : "bg-base-300"}`} />
                        </div>
                        <div className="pb-4 pt-1 min-w-0">
                          <p className={`text-sm font-medium leading-tight ${current ? "text-base-content" : done ? "text-base-content/70" : "text-base-content/30"}`}>
                            {step.label}
                          </p>
                          {current && (
                            <p className="text-xs text-base-content/45 mt-0.5">{step.sublabel}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {/* Step 4: ชำระเงินแล้ว (derived from payment proof status) */}
                  {(() => {
                    const anyBillingId = billingButtons[0]?.key;
                    const info = anyBillingId ? paymentProofs[anyBillingId] : undefined;
                    const pStatus = info?.status;
                    const paid = pStatus === "approved";
                    return (
                      <div className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors
                            ${paid ? "bg-success text-success-content" : "bg-base-200 text-base-content/30"}`}>
                            {paid ? "✓" : "4"}
                          </div>
                        </div>
                        <div className="pb-4 pt-1 min-w-0">
                          <p className={`text-sm font-medium leading-tight ${paid ? "text-success" : "text-base-content/30"}`}>
                            ชำระเงินแล้ว
                          </p>
                          {paid && (
                            <p className="text-xs text-base-content/45 mt-0.5">ยืนยันการชำระเงินเรียบร้อย</p>
                          )}
                          {pStatus === "pending" && (
                            <p className="text-xs text-warning mt-0.5">รอการตรวจสอบ</p>
                          )}
                          {pStatus === "partial" && (
                            <p className="text-xs text-info mt-0.5">
                              ชำระบางส่วนแล้ว เหลืออีก {info!.remaining.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

              </div>
            </div>
          </div>

        ) : (

          /* ── PO Hero CTA ── */
          <div className="card bg-base-100 border border-base-300 shadow-sm overflow-hidden">
            <div className="h-1 bg-linear-to-r from-secondary to-info" />
            <div className="card-body py-10 px-8 gap-0">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-10">

                {/* Left: text */}
                <div className="flex-1">
                  <span className="inline-flex w-fit items-center gap-2 rounded-full border border-secondary/20 bg-secondary/10 px-3 py-1 text-xs font-medium text-secondary mb-6">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                    Purchase Order System
                  </span>
                  <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.2] mb-4">
                    ส่งรายการสินค้า<br />
                    เพื่อ<span className="text-secondary">สั่งซื้อ</span>
                  </h2>
                  <p className="text-base text-base-content/50 leading-relaxed max-w-md mb-8">
                    อัปโหลดรายการสินค้าที่ต้องการสั่งซื้อ ทีมงานจะจัดของและออกใบวางบิลให้คุณ
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => router.push("/Client/po")}
                      className="btn btn-secondary btn-lg gap-2 shadow-lg shadow-secondary/20"
                    >
                      เริ่มสั่งซื้อ
                      <IconArrow />
                    </button>
                  </div>
                </div>

                {/* Right: step list */}
                <div className="hidden md:flex flex-col gap-3 w-72 shrink-0">
                  {[
                    { label: "อัปโหลดรายการสินค้า",  sub: "รองรับทุกประเภทไฟล์ สูงสุด 20 MB" },
                    { label: "admin ตรวจสอบและจัดของ", sub: "รับเรื่องและจัดเตรียมสินค้า" },
                    { label: "ออกใบกำกับภาษี/ใบส่งของ", sub: "เขียนบนกระดาษพร้อมส่ง" },
                    { label: "รับใบวางบิล",            sub: "ดูและพิมพ์ใบวางบิลออนไลน์" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl bg-base-200 px-4 py-3">
                      <div className="w-6 h-6 rounded-full bg-secondary/15 text-secondary text-xs font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold leading-tight">{item.label}</p>
                        <p className="text-xs text-base-content/40 mt-0.5">{item.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          </div>

        )}

      </div>

      <ChatNotificationBubble />

      {/* ── Billing Modal ─────────────────────────────────────── */}
      {(modalBilling || billingModalLoading) && (
        <dialog className="modal modal-open">
          <div className="modal-box w-11/12 max-w-4xl h-[92vh] p-0 overflow-hidden flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-base-100 border-b border-base-300 shrink-0">
              <div>
                <p className="font-semibold text-sm leading-tight">ใบวางบิล</p>
                {modalBilling && (
                  <p className="text-xs text-base-content/40 mt-0.5">
                    {modalBilling.billingGroupId ?? modalBilling.poNumbers.join(", ")}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleBillingPrint}
                  disabled={!modalBilling || billingPrintReady}
                  className="btn btn-ghost btn-sm gap-1.5 text-xs disabled:opacity-40"
                >
                  {billingPrintReady
                    ? <span className="loading loading-spinner loading-xs" />
                    : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                  }
                  พิมพ์
                </button>
                <button
                  onClick={handleBillingDownload}
                  disabled={!modalBilling || billingDownloadReady}
                  className="btn btn-primary btn-sm gap-1.5 text-xs disabled:opacity-40"
                >
                  {billingDownloadReady
                    ? <><span className="loading loading-spinner loading-xs" />กำลังสร้าง...</>
                    : <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        ดาวน์โหลด PDF
                      </>
                  }
                </button>
                <button
                  onClick={() => { setModalBilling(null); setBillingModalLoading(false); }}
                  className="btn btn-ghost btn-sm btn-circle"
                  aria-label="ปิด"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto bg-base-200 p-4">
              {billingModalLoading ? (
                <div className="flex items-center justify-center h-full gap-3">
                  <span className="loading loading-spinner loading-lg text-primary" />
                </div>
              ) : modalBilling ? (
                <BillingNoteDocument po={modalBilling} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-base-content/30">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm">ไม่พบข้อมูลใบวางบิล</p>
                </div>
              )}
            </div>

          </div>
          <div className="modal-backdrop" onClick={() => { setModalBilling(null); setBillingModalLoading(false); }} />
        </dialog>
      )}

      {/* ── Payment History Modal ─────────────────────────────── */}
      {historyModal && (
        <PaymentHistoryModal
          billingKey={historyModal.key}
          isGroup={historyModal.isGroup}
          label={historyModal.label}
          onClose={() => setHistoryModal(null)}
        />
      )}

      {/* ── Learn More Modal ──────────────────────────────────── */}
      {learnMore && (
        <div className="modal modal-open modal-bottom sm:modal-middle">
          <div className="modal-box max-w-lg overflow-hidden p-0">
            <div className="bg-base-200 px-6 py-5 border-b border-base-300">
              <button
                onClick={() => setLearnMore(false)}
                className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4"
              >✕</button>
              <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1">How it works</p>
              <h3 className="font-bold text-lg">ขั้นตอนการใช้งาน</h3>
              <p className="text-sm text-base-content/50 mt-0.5">ระบบออกใบเสนอราคาทำงานอย่างไร</p>
            </div>
            <div className="px-6 py-6 space-y-0">
              {PROCESS_STEPS.map((s, i) => (
                <div key={s.step} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-9 h-9 rounded-full border-2 border-primary/30 bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                      {s.step}
                    </div>
                    {i < PROCESS_STEPS.length - 1 && (
                      <div className="w-px flex-1 bg-base-300 my-1.5" />
                    )}
                  </div>
                  <div className="pb-6 pt-1.5 min-w-0">
                    <p className="font-semibold text-sm">{s.title}</p>
                    <p className="text-sm text-base-content/50 mt-0.5">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-base-300 px-6 py-4 flex gap-3 justify-end">
              <button onClick={() => setLearnMore(false)} className="btn btn-ghost btn-sm">
                ปิด
              </button>
              <button
                onClick={() => { setLearnMore(false); router.push("/Client/quotation"); }}
                className="btn btn-primary btn-sm gap-2"
              >
                เริ่มต้นเลย
                <IconArrow />
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setLearnMore(false)} />
        </div>
      )}

      {/* ── Print styles + print-only area ─────────────────────── */}
      {(modalQuotation || printReady) && (
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap');
          .rfq-version-bar { display: none !important; }
          @media print {
            @page { margin: 0; size: A4; }
            body * { visibility: hidden !important; }
            #quotation-print-area {
              display: block !important;
              visibility: visible !important;
              position: absolute !important;
              top: 0 !important; left: 0 !important;
              width: 100% !important;
              background: white !important;
              overflow: visible !important;
              z-index: 9999 !important;
            }
            #quotation-print-area * { visibility: visible !important; }
            html, body {
              background: white !important; overflow: visible !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        `}</style>
      )}

      {/* ── Print/Download area (rendered on demand) ── */}
      {(printReady || downloadReady) && rfqForModal && (
        <div
          id="quotation-print-area"
          aria-hidden="true"
          style={
            downloadReady
              ? { position: "fixed", top: 0, left: 0, zIndex: -1, pointerEvents: "none" }
              : { position: "fixed", top: "-9999px", left: "-9999px", pointerEvents: "none" }
          }
        >
          <QuotationDocument rfq={rfqForModal} confirmed={printConfirmed} showHighlights={showHighlights} />
        </div>
      )}

      {/* ── Document Modal ────────────────────────────────────── */}
      {modalQuotation && (
        <>
          <dialog className="modal modal-open">
            <div className="modal-box w-11/12 max-w-4xl h-[92vh] p-0 overflow-hidden flex flex-col">

              {/* Header */}
              <div className="flex flex-col shrink-0 bg-base-100 border-b border-base-300">
                <div className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <p className="font-semibold text-sm leading-tight">ใบเสนอราคา</p>
                    {rfqForModal && (
                      <p className="text-xs text-base-content/40 mt-0.5">{rfqForModal.rfq_number}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handlePrint}
                      disabled={!rfqForModal || printReady}
                      className="btn btn-ghost btn-sm gap-1.5 text-xs disabled:opacity-40"
                    >
                      {printReady
                        ? <span className="loading loading-spinner loading-xs" />
                        : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                      }
                      พิมพ์
                    </button>
                    <button
                      onClick={handleDownloadPdf}
                      disabled={!rfqForModal || downloadReady}
                      className="btn btn-primary btn-sm gap-1.5 text-xs disabled:opacity-40"
                    >
                      {downloadReady ? (
                        <><span className="loading loading-spinner loading-xs" />กำลังสร้าง...</>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          ดาวน์โหลด PDF
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setModalQuotation(null)}
                      className="btn btn-ghost btn-sm btn-circle"
                      aria-label="ปิด"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Highlight toggle — แสดงเฉพาะเมื่อมี change_log */}
                {rfqForModal?.change_log && rfqForModal.change_log.length > 0 && (
                  <label className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer select-none border-t transition-colors ${
                    showHighlights
                      ? "bg-warning/8 border-warning/20"
                      : "bg-base-200/50 border-base-content/8"
                  }`}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      showHighlights ? "bg-warning/20" : "bg-base-content/8"
                    }`}>
                      <svg className={`w-3.5 h-3.5 transition-colors ${showHighlights ? "text-warning" : "text-base-content/30"}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold leading-tight transition-colors ${
                        showHighlights ? "text-warning" : "text-base-content/40"
                      }`}>
                        แสดงการเปลี่ยนแปลง
                      </p>
                      <p className="text-[10px] text-base-content/30 mt-0.5">
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
              </div>

              {/* Document area */}
              <div className="flex-1 overflow-auto bg-base-200 p-4">
                {rfqForModalLoading ? (
                  <div className="flex items-center justify-center h-full gap-3">
                    <span className="loading loading-spinner loading-lg text-primary" />
                  </div>
                ) : rfqForModal ? (
                  <QuotationDocument
                    rfq={rfqForModal}
                    confirmed={modalQuotation.status === "confirmed"}
                    showHighlights={showHighlights}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-base-content/30">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm">ไม่พบข้อมูลเอกสาร</p>
                  </div>
                )}
              </div>

            </div>
            <div className="modal-backdrop" onClick={() => setModalQuotation(null)} />
          </dialog>
        </>
      )}

    </main>
  );
}
