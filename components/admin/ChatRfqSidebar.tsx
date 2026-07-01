'use client';

export type RfqDoc = {
  _id: string;
  rfq_number: string;
  document_type?: string;
  rfq_date?: string;
  due_date?: string;
  buyer_company_name: string;
  vendor_company_name?: string;
  line_items: Array<{ quantity: number; unit_price: number; description?: string }>;
};

const calcTotal = (rfq: RfqDoc) =>
  (rfq.line_items || []).reduce((s, li) => s + (Number(li.quantity) || 0) * (Number(li.unit_price) || 0), 0);

const fmtPrice = (n: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

const fmtDate = (str?: string) => {
  if (!str) return '—';
  const d = new Date(str);
  return isNaN(d.getTime()) ? str : d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
};

interface Props {
  rfq: RfqDoc | null | undefined;
  onNavigate?: () => void;
  className?: string;
}

export default function ChatRfqSidebar({ rfq, onNavigate, className }: Props) {
  return (
    <div className={`w-64 shrink-0 flex flex-col bg-base-100 overflow-y-auto ${className ?? ''}`}>

      {/* RFQ header */}
      <div className="px-4 pt-4 pb-3 border-b border-base-200">
        <p className="text-[10px] text-base-content/40 font-semibold uppercase tracking-wider mb-1">
          RFQ Details
        </p>
        {rfq === undefined ? (
          <div className="flex flex-col gap-2 mt-2">
            <div className="skeleton h-4 w-32 rounded" />
            <div className="skeleton h-3 w-24 rounded" />
          </div>
        ) : rfq === null ? (
          <div className="flex flex-col items-center gap-2 py-4 text-base-content/25">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-xs text-center">ไม่พบ RFQ ที่เชื่อมกับผู้ใช้นี้</p>
          </div>
        ) : (
          <div>
            <p className="text-base font-bold text-primary leading-tight">
              {rfq.rfq_number || '—'}
            </p>
            {rfq.document_type && (
              <p className="text-[11px] text-base-content/40 mt-0.5">{rfq.document_type}</p>
            )}
          </div>
        )}
      </div>

      {/* RFQ fields */}
      {rfq && rfq !== null && (
        <div className="flex-1 px-4 py-3 flex flex-col gap-3">

          {/* Buyer */}
          <div>
            <p className="text-[10px] text-base-content/35 font-semibold uppercase tracking-wider mb-0.5">Buyer</p>
            <p className="text-xs font-medium text-base-content/80">
              {rfq.buyer_company_name || '—'}
            </p>
          </div>

          {/* Vendor */}
          {rfq.vendor_company_name && (
            <div>
              <p className="text-[10px] text-base-content/35 font-semibold uppercase tracking-wider mb-0.5">Vendor</p>
              <p className="text-xs font-medium text-base-content/80">{rfq.vendor_company_name}</p>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-base-content/35 font-semibold uppercase tracking-wider mb-0.5">วันที่</p>
              <p className="text-xs text-base-content/70">{fmtDate(rfq.rfq_date)}</p>
            </div>
            <div>
              <p className="text-[10px] text-base-content/35 font-semibold uppercase tracking-wider mb-0.5">Due date</p>
              <p className="text-xs text-base-content/70">{fmtDate(rfq.due_date)}</p>
            </div>
          </div>

          {/* Items & Total */}
          <div className="bg-base-200/60 rounded-xl px-3 py-2.5 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-base-content/50">จำนวนรายการ</span>
              <span className="text-xs font-semibold text-base-content">
                {rfq.line_items?.length || 0} รายการ
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-base-content/50">ราคารวม</span>
              <span className="text-sm font-bold text-success">
                {fmtPrice(calcTotal(rfq))}
              </span>
            </div>
          </div>

          {/* Line items preview */}
          {rfq.line_items?.length > 0 && (
            <div>
              <p className="text-[10px] text-base-content/35 font-semibold uppercase tracking-wider mb-1.5">รายการสินค้า</p>
              <div className="flex flex-col gap-1">
                {rfq.line_items.slice(0, 4).map((li, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-base-content/60 truncate flex-1">
                      {li.description || `รายการ ${i + 1}`}
                    </span>
                    <span className="text-base-content/40 shrink-0">
                      ×{li.quantity}
                    </span>
                  </div>
                ))}
                {rfq.line_items.length > 4 && (
                  <p className="text-[10px] text-base-content/30 mt-0.5">
                    +{rfq.line_items.length - 4} รายการ
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Go to Edit button */}
      <div className="px-4 py-4 border-t border-base-200 shrink-0">
        {rfq && rfq !== null ? (
          <a
            href={`/Admin/edit/${rfq._id}`}
            className="btn btn-primary w-full rounded-xl gap-2"
            onClick={onNavigate}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Go to Edit
          </a>
        ) : (
          <button disabled className="btn btn-disabled w-full rounded-xl">
            ไม่พบ RFQ
          </button>
        )}
      </div>
    </div>
  );
}
