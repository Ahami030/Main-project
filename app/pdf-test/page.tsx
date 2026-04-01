"use client";

export default function PdfPreviewPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      
      <h1 className="text-2xl font-bold mb-4">
        แสดงตัวอย่าง PDF
      </h1>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <iframe
          src="/pdf/test.pdf"
          className="w-full h-[80vh]"
        />
      </div>

    </div>
  );
}
