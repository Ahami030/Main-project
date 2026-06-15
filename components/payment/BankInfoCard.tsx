import React from "react";

const BANK_ACCOUNTS = [
  {
    bankName:      "ธนาคารกสิกรไทย (KBank)",
    accountNumber: "xxx-x-xxxxx-x",
    accountName:   "หจก.แพร่สงวนพาณิชย์",
    branch:        "สาขาแพร่",
    color:         "#138f2d",
  },
  {
    bankName:      "ธนาคารกรุงไทย (KTB)",
    accountNumber: "xxx-x-xxxxx-x",
    accountName:   "หจก.แพร่สงวนพาณิชย์",
    branch:        "สาขาแพร่",
    color:         "#1a56db",
  },
];

export default function BankInfoCard() {
  return (
    <div className="card bg-base-200 shadow-sm">
      <div className="card-body p-4">
        <h3 className="card-title text-base mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          บัญชีธนาคารสำหรับโอนเงิน
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {BANK_ACCOUNTS.map((acc) => (
            <div
              key={acc.bankName}
              className="rounded-lg border border-base-300 bg-base-100 p-3"
              style={{ borderLeft: `4px solid ${acc.color}` }}
            >
              <p className="text-xs text-base-content/50 mb-1">{acc.bankName}</p>
              <p className="text-lg font-bold font-mono tracking-wider">{acc.accountNumber}</p>
              <p className="text-sm font-medium mt-1">{acc.accountName}</p>
              <p className="text-xs text-base-content/60">{acc.branch}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-base-content/50 mt-2">
          * กรุณาโอนเงินและอัปโหลดหลักฐานการโอนพร้อมระบุเลขอ้างอิงจากธนาคาร
        </p>
      </div>
    </div>
  );
}
