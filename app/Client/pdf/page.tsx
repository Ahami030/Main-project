"use client";

import { useEffect, useState } from "react";

/** โครงสร้างข้อมูล PDF จาก backend */
interface PDFFile {
  _id: string;
  filename: string;
}

export default function MyPDF() {
  const [pdfs, setPdfs] = useState<PDFFile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/pdf/list")
      .then((res) => res.json())
      .then((data: PDFFile[]) => {
        setPdfs(data);

        if (data.length > 0) {
          setSelectedId(data[0]._id); // แสดงอันแรกอัตโนมัติ
        }
      });
  }, []);

  return (
    <div className="p-6 grid grid-cols-4 gap-6 h-screen">
      
      {/* ===== ซ้าย: รายการไฟล์ ===== */}
      <div className="col-span-1 border rounded p-4 overflow-y-auto">
        <h2 className="font-bold mb-3">📄 ไฟล์ของฉัน</h2>

        {pdfs.map((pdf) => (
          <div
            key={pdf._id}
            onClick={() => setSelectedId(pdf._id)}
            className={`p-2 mb-2 cursor-pointer rounded 
              ${
                selectedId === pdf._id
                  ? "bg-blue-200"
                  : "hover:bg-gray-100"
              }
            `}
          >
            {pdf.filename}
          </div>
        ))}
      </div>

      {/* ===== ขวา: แสดง PDF ===== */}
      <div className="col-span-3 border rounded">
        {selectedId ? (
          <iframe
            src={`/api/pdf/view?id=${selectedId}`}
            width="100%"
            height="100%"
            className="rounded"
          />
        ) : (
          <p className="p-10">ไม่มีไฟล์ PDF</p>
        )}
      </div>
    </div>
  );
}
