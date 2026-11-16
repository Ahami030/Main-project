"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

// Landing page — replaces the create-next-app boilerplate. Mobile-first,
// mastercard editorial style to match the Admin/Client dashboards.
export default function Home() {
  const { data: session, status } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const dashboardHref = role === "admin" || role === "employee" ? "/Admin" : "/Client";

  return (
    <div className="font-mc relative min-h-[calc(100dvh-4rem)] bg-base-200 text-base-content overflow-hidden">

      {/* Decorative orbital rings */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-[30rem] -right-[18rem] w-[58rem] h-[58rem] rounded-full border border-accent/15" />
        <div className="absolute -top-[22rem] -right-[10rem] w-[42rem] h-[42rem] rounded-full border border-accent/10" />
        <div className="absolute -bottom-[34rem] -left-[20rem] w-[58rem] h-[58rem] rounded-full border border-secondary/12" />
      </div>

      <main className="relative max-w-5xl mx-auto px-4 md:px-8 py-14 md:py-24 flex flex-col gap-12">

        {/* Hero */}
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-base-content/55 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            Quotation Request System
          </p>
          <h1 className="text-4xl md:text-6xl font-medium tracking-mc leading-[1.05]">
            ขอใบเสนอราคา<span className="text-accent">ง่ายๆ</span>
            <br />ในที่เดียว
          </h1>
          <p className="text-base md:text-lg text-base-content/55 mt-5 leading-relaxed">
            อัปโหลดเอกสาร RFQ แล้วให้ระบบอ่านและจัดรายการให้อัตโนมัติ
            ต่อรองราคากับทีมงานผ่านแชท ติดตามใบสั่งซื้อ ใบวางบิล
            และการชำระเงินได้ครบจบในระบบเดียว
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            {status === "loading" ? (
              <span className="loading loading-spinner loading-md text-primary" />
            ) : session ? (
              <Link href={dashboardHref} className="btn btn-primary rounded-full px-8 w-full sm:w-auto">
                ไปที่ Dashboard
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ) : (
              <>
                <Link href="/Login" className="btn btn-primary rounded-full px-8 w-full sm:w-auto">
                  เข้าสู่ระบบ
                </Link>
                <Link href="/register" className="btn btn-outline rounded-full px-8 w-full sm:w-auto">
                  สมัครสมาชิก
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              title: "อัปโหลดแล้วจบ",
              desc: "ส่งไฟล์ PDF ระบบ AI อ่านและสกัดรายการสินค้าให้อัตโนมัติ",
              icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              ),
            },
            {
              title: "ต่อรองผ่านแชท",
              desc: "คุยกับทีมงานโดยตรง ส่งรูป ส่งไฟล์ ต่อรองราคาแบบเรียลไทม์",
              icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              ),
            },
            {
              title: "ครบวงจร",
              desc: "ใบสั่งซื้อ ใบวางบิล และหลักฐานการชำระเงิน ติดตามได้ทุกขั้น",
              icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              ),
            },
          ].map((f) => (
            <div key={f.title} className="card bg-base-100 border border-base-300/70 rounded-[2rem] shadow-mc-sm">
              <div className="card-body p-6">
                <div className="w-11 h-11 rounded-full bg-accent/10 text-accent flex items-center justify-center mb-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{f.icon}</svg>
                </div>
                <h2 className="font-medium text-lg tracking-mc">{f.title}</h2>
                <p className="text-sm text-base-content/50 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
