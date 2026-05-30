"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type UploadStatus = "idle" | "uploading" | "success" | "error";

export default function NewPOPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string>("");
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setFileError("");
    if (f.size > 20 * 1024 * 1024) {
      setFileError("ไฟล์ต้องมีขนาดไม่เกิน 20MB");
      return;
    }
    setFile(f);
    if (f.type.startsWith("image/") || f.type === "application/pdf") {
      setPreviewUrl(URL.createObjectURL(f));
    } else {
      setPreviewUrl(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setStatus("uploading");
    setErrorMsg("");

    try {
      // 1) Upload file
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/po/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) {
        const d = await uploadRes.json();
        throw new Error(d.message ?? "Upload failed");
      }
      const { filePath, originalName, mimeType } = await uploadRes.json();

      // 2) Create PO record
      const poRes = await fetch("/api/po", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath, fileOrigName: originalName, fileMimeType: mimeType }),
      });
      if (!poRes.ok) {
        const d = await poRes.json();
        throw new Error(d.message ?? "Failed to create PO");
      }

      setStatus("success");
      setTimeout(() => router.push("/Client/po"), 1200);
    } catch (err: unknown) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "เกิดข้อผิดพลาด กรุณาลองใหม่");
    }
  };

  if (!session) return null;

  return (
    <div className="min-h-screen bg-base-200 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">สร้างใบสั่งซื้อ (PO)</h1>
          <p className="text-base-content/60 mt-1">อัปโหลดไฟล์รายการสินค้าที่ต้องการสั่งซื้อ</p>
        </div>

        <div className="card bg-base-100 shadow-sm">
          <div className="card-body gap-4">

            {/* Drop zone */}
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                file ? "border-primary bg-primary/5" : "border-base-300 hover:border-primary/50"
              }`}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="font-semibold text-primary">{file.name}</p>
                  <p className="text-xs text-base-content/50">{(file.size / 1024).toFixed(1)} KB — คลิกเพื่อเปลี่ยนไฟล์</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-base-content/50">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="font-medium">ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์</p>
                  <p className="text-xs">รองรับทุกประเภทไฟล์ (PDF, รูปภาพ, Word ฯลฯ) ขนาดไม่เกิน 20MB</p>
                </div>
              )}
            </div>

            {fileError && <p className="text-error text-sm">{fileError}</p>}

            {/* Preview */}
            {previewUrl && file && (
              <div className="rounded-lg overflow-hidden border border-base-300">
                {file.type === "application/pdf" ? (
                  <iframe src={previewUrl} className="w-full h-64" title="preview" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="preview" className="w-full max-h-64 object-contain bg-base-200" />
                )}
              </div>
            )}

            {/* Status alerts */}
            {status === "success" && (
              <div className="alert alert-success">
                <span>ส่งใบสั่งซื้อสำเร็จ! กำลังกลับไปหน้ารายการ...</span>
              </div>
            )}
            {status === "error" && (
              <div className="alert alert-error">
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <button className="btn btn-ghost" onClick={() => router.push("/Client/po")}>ยกเลิก</button>
              <button
                className="btn btn-primary"
                disabled={!file || status === "uploading" || status === "success"}
                onClick={handleSubmit}
              >
                {status === "uploading" && <span className="loading loading-spinner loading-sm" />}
                {status === "uploading" ? "กำลังส่ง..." : "ส่งใบสั่งซื้อ"}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
