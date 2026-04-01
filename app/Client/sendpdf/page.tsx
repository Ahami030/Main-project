"use client";

import { useState } from "react";

export default function UploadPDF() {
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<string>("");

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
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
      <h1 className="text-2xl font-bold mb-4">
        ทดลองอัปโหลด PDF
      </h1>

      <form onSubmit={handleSubmit}>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFile(e.target.files?.[0] ?? null)
          }
        />

        <br />
        <br />

        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          type="submit"
        >
          Upload
        </button>
      </form>

      {msg && <p className="mt-4">{msg}</p>}
    </div>
  );
}
