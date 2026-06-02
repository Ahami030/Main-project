import React from "react";

type PaymentStatus = "pending" | "approved" | "rejected" | "unpaid" | "partial" | "paid";

interface Props {
  status: PaymentStatus;
  size?: "xs" | "sm" | "md";
}

const STATUS_MAP: Record<PaymentStatus, { label: string; className: string }> = {
  unpaid:   { label: "ยังไม่ชำระ",   className: "badge-warning" },
  partial:  { label: "รอตรวจสอบ",    className: "badge-info" },
  pending:  { label: "รอตรวจสอบ",    className: "badge-warning" },
  approved: { label: "ชำระแล้ว",     className: "badge-success" },
  paid:     { label: "ชำระแล้ว",     className: "badge-success" },
  rejected: { label: "ถูกปฏิเสธ",    className: "badge-error" },
};

export default function PaymentStatusBadge({ status, size = "sm" }: Props) {
  const { label, className } = STATUS_MAP[status] ?? { label: status, className: "badge-ghost" };
  return (
    <span className={`badge badge-${size} ${className} font-medium`}>
      {label}
    </span>
  );
}
