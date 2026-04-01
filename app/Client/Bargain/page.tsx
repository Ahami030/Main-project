"use client";
import React from "react";

export default function Page() {
    return (
        // เต็มจอจริง
        <div className="h-screen w-screen bg-base-200">

            {/* layout */}
            <div className="flex flex-col md:flex-row h-full">

                {/* MAIN CONTENT (2/3) */}
                <div className="md:basis-2/3 h-full bg-base-100">

                    <iframe
                        src="/pdf/test.pdf"
                        className="w-full h-full"
                        title="PDF Preview"
                    />
                </div>

                {/* SIDEBAR (1/3) */}
                <aside className="md:basis-1/3 bg-base-100 border-l border-base-300 p-4 overflow-y-auto">
                    <h2 className="font-semibold mb-3">Sidebar</h2>

                    <p className="text-base-content/70 mb-2">
                        ข้อมูลประกอบ PDF
                    </p>

                    <button className="btn btn-primary w-full mb-2">
                        Download PDF
                    </button>

                    <button className="btn btn-outline w-full">
                        Print
                    </button>
                </aside>

            </div>
        </div>
    );
}
