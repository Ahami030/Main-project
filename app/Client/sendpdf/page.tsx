"use client";

import { useState } from "react";

export default function UploadPDF() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [msg, setMsg] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);

    // สร้าง Object URL เพื่อ preview PDF
    if (selected) {
      const url = URL.createObjectURL(selected);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/pdf", {
      method: "POST",
      body: formData,
    });

    const data: { message: string } = await res.json();
    setMsg(data.message);
  };

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold mb-4">ทดลองอัปโหลด PDF</h1>

      <form onSubmit={handleSubmit}>
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
        />

        {/* แสดงชื่อไฟล์ */}
        {file && (
          <p className="mt-2 text-sm text-gray-600">
            ไฟล์ที่เลือก: <span className="font-medium">{file.name}</span>
          </p>
        )}

        <br />

        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          type="submit"
          disabled={!file}
        >
          Upload
        </button>
      </form>

      {/* Preview PDF */}
      {previewUrl && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">ตัวอย่างไฟล์ PDF</h2>
          <iframe
            src={previewUrl}
            className="w-full border rounded"
            style={{ height: "600px" }}
            title="PDF Preview"
          />
        </div>
      )}

      {msg && <p className="mt-4 text-green-600">{msg}</p>}
    </div>
  );
}