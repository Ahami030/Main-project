"use client";
import React, { JSX, useEffect, useRef, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
type Quote = {
    id: string;
    author: string;
    text: string;
    tag?: string;
};

export default function Page(): JSX.Element {
    const { data: session, status } = useSession();

    // Best-effort session id: NextAuth shape varies by adapter — try common fields
    const sessionId =
        (session as any)?.id ??
        (session as any)?.sessionId ??
        (session as any)?.user?.id ??
        "n/a";

    const [author, setAuthor] = useState("");
    const [text, setText] = useState("");
    const [tag, setTag] = useState("inspiration");
    const [quotes, setQuotes] = useState<Quote[]>([]);

    const newId = () =>
        typeof crypto !== "undefined" && "randomUUID" in crypto
            ? (crypto as any).randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const addQuote = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!text.trim()) return;
        const q: Quote = {
            id: newId(),
            author: author.trim() || "Anonymous",
            text: text.trim(),
            tag,
        };
        setQuotes((s) => [q, ...s]);
        setAuthor("");
        setText("");
        setTag("inspiration");
    };

    const removeQuote = (id: string) =>
        setQuotes((s) => s.filter((q) => q.id !== id));

    //function dragDropHandler
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isDragging, setIsDragging] = useState(false);
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);

    // ===============================
    // Handle PDF only
    // ===============================
    const handlePdfFile = (file: File) => {
        const isPdf =
            file.type === "application/pdf" ||
            file.name.toLowerCase().endsWith(".pdf");

        if (!isPdf) {
            setFileError("รองรับเฉพาะไฟล์ PDF เท่านั้น");
            return;
        }

        // optional: limit size (10MB)
        if (file.size > 10 * 1024 * 1024) {
            setFileError("ไฟล์ต้องมีขนาดไม่เกิน 10MB");
            return;
        }

        setFileError(null);

        // cleanup old preview
        if (pdfPreviewUrl) {
            URL.revokeObjectURL(pdfPreviewUrl);
        }

        const previewUrl = URL.createObjectURL(file);

        setPdfFile(file);
        setPdfPreviewUrl(previewUrl);
    };

    // ===============================
    // Drag & Drop
    // ===============================
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files?.[0];
        if (file) handlePdfFile(file);
    };

    // ===============================
    // Cleanup memory
    // ===============================
    useEffect(() => {
        return () => {
            if (pdfPreviewUrl) {
                URL.revokeObjectURL(pdfPreviewUrl);
            }
        };
    }, [pdfPreviewUrl]);

    const resetPdf = () => {
        if (pdfPreviewUrl) {
            URL.revokeObjectURL(pdfPreviewUrl);
        }

        setPdfFile(null);
        setPdfPreviewUrl(null);
        setFileError(null);

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <main className="min-h-screen bg-base-200 p-6">
            <div className="max-w-6xl mx-auto">


                <section className="card bg-base-100 shadow-md mb-6 w-full">
                    <div className="card-body space-y-3">
                        {/* ================= USER INFO ================= */}
                        <div className=" flex md:flex-row md:justify-between md:items-center gap-4 flex-col">
                            <header className="">
                                <h1 className="text-3xl font-bold">Quotation</h1>
                                <p className="text-sm text-base-content/70">
                                    Create and preview quotes (Tailwind + DaisyUI)
                                </p>
                            </header>
                            <div className="pr-10">
                                <h2 className="text-lg font-semibold">Logged in</h2>
                                <p className="text-sm opacity-70">{session?.user?.email}</p>
                                <p className="text-xs opacity-50 mt-1">
                                    User ID: {(session?.user as { id?: string })?.id ?? "User"}
                                </p>
                            </div>
                            
                        </div>
                        <div className="divider my-0"></div>

                        {/* ================= PDF AREA ================= */}
                        <div className="space-y-3">
                            {!pdfPreviewUrl ? (
                                // ================= UPLOAD MODE =================
                                <>
                                    <h3 className="text-lg font-semibold">Upload PDF</h3>
                                    <p className="text-sm opacity-70">
                                        รองรับเฉพาะไฟล์ PDF ขนาดไม่เกิน 10MB
                                    </p>

                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            setIsDragging(true);
                                        }}
                                        onDragLeave={() => setIsDragging(false)}
                                        onDrop={handleDrop}
                                        className={`
      flex flex-col             // <-- เพิ่มบรรทัดนี้
      items-center justify-center h-100
      border-2 border-dashed rounded-lg cursor-pointer
      transition text-center p-6
      ${isDragging
                                                ? "border-primary bg-base-200"
                                                : "border-base-300 bg-base-100"
                                            }
  `}
                                    >
                                        <div className="text-4xl mb-3">📄
                                            <p className="text-sm font-medium ">Drag & Drop PDF</p>
                                            <p className="text-xs opacity-60 mt-1">
                                                หรือคลิกเพื่อเลือกไฟล์
                                            </p>
                                        </div>

                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="application/pdf"
                                            hidden
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) handlePdfFile(file);
                                            }}
                                        />
                                    </div>

                                    {fileError && (
                                        <div className="alert alert-error py-2 text-sm">
                                            {fileError}
                                        </div>
                                    )}
                                </>
                            ) : (
                                // ================= PREVIEW MODE =================
                                <div className="relative">
                                    <div className="absolute bottom-5 right-10 z-10">
                                        <button
                                            onClick={resetPdf}
                                            className="btn btn-sm btn-outline"
                                        >
                                            เปลี่ยนไฟล์
                                        </button>
                                    </div>

                                    <div className="border rounded-lg overflow-hidden h-[600px]">
                                        <iframe
                                            src={pdfPreviewUrl}
                                            className="w-full h-full"
                                            title="PDF Preview"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                        {pdfPreviewUrl && (
                            <div className="absolute bottom-3 left-3 z-10">
                                <button onClick={resetPdf} className="btn btn-sm btn-outline">
                                    เปลี่ยนไฟล์
                                </button>
                            </div>
                        )}

                        <div className="divider my-0"></div>

                        {/* ================= QUOTE FORM ================= */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Create Quote</h3>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <input
                                    value={author}
                                    onChange={(e) => setAuthor(e.target.value)}
                                    placeholder="Author"
                                    className="input input-bordered w-full"
                                />

                                <select
                                    value={tag}
                                    onChange={(e) => setTag(e.target.value)}
                                    className="select select-bordered w-full"
                                >
                                    <option value="inspiration">Inspiration</option>
                                    <option value="humor">Humor</option>
                                    <option value="life">Life</option>
                                </select>
                            </div>

                            <textarea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="Write the quote..."
                                className="textarea textarea-bordered w-full h-28"
                            />

                            <div className="flex justify-between items-center text-sm">
                                <span className="opacity-70">{quotes.length} saved</span>

                                <div className="space-x-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAuthor("");
                                            setText("");
                                            setTag("inspiration");
                                        }}
                                        className="btn btn-ghost btn-sm"
                                    >
                                        Reset
                                    </button>

                                    <button type="submit" className="btn btn-primary btn-sm">
                                        Add Quote
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="space-y-4">
                    {quotes.length === 0 ? (
                        <div className="alert alert-info shadow-lg">
                            <div>
                                <span>No quotes yet — add one above.</span>
                            </div>
                        </div>
                    ) : (
                        quotes.map((q) => (
                            <article key={q.id} className="card bg-base-100 shadow-sm">
                                <div className="card-body">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-semibold text-lg">{q.author}</h3>
                                            <div className="text-sm text-base-content/70">
                                                {q.tag}
                                            </div>
                                        </div>
                                        <div className="space-x-2">
                                            <button
                                                onClick={() => removeQuote(q.id)}
                                                className="btn btn-ghost btn-sm"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>

                                    <p className="mt-3 text-base-content/90">“{q.text}”</p>
                                </div>
                            </article>
                        ))
                    )}
                </section>
            </div>
        </main>
    );
}
