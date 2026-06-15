"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  type AddressValue,
  EMPTY_ADDRESS,
  PROVINCES,
  amphoesOf,
  districtsOf,
  zipcodesOf,
  formatAddress,
  suggest,
  amphoeLabel,
  districtLabel,
} from "@/lib/thaiAddress";

type Tab = "province" | "amphoe" | "district" | "zipcode";

const TABS: { key: Tab; label: string }[] = [
  { key: "province", label: "จังหวัด" },
  { key: "amphoe",   label: "เขต/อำเภอ" },
  { key: "district", label: "แขวง/ตำบล" },
  { key: "zipcode",  label: "รหัสไปรษณีย์" },
];

interface PanelPos {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
  maxH: number;
}

export default function ThaiAddressField({
  value,
  onChange,
  placeholder = "จังหวัด, เขต/อำเภอ, แขวง/ตำบล, รหัสไปรษณีย์",
}: {
  value: AddressValue;
  onChange: (v: AddressValue) => void;
  placeholder?: string;
}) {
  const wrapRef  = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState("");
  const [tab, setTab]     = useState<Tab>("province");
  const [sel, setSel]     = useState<AddressValue>(value);
  const [pos, setPos]     = useState<PanelPos | null>(null);
  const [themeAttr, setThemeAttr] = useState<string | null>(null);

  const searching = query.trim() !== "";
  const display   = formatAddress(value);

  // ── Position the floating panel (flips up when there's no room below) ───────
  const computePos = () => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const spaceBelow = vh - r.bottom;
    const spaceAbove = r.top;
    const desired = 360;
    const up = spaceBelow < Math.min(desired, 280) && spaceAbove > spaceBelow;
    const maxH = Math.max(200, Math.min(desired, (up ? spaceAbove : spaceBelow) - 16));
    setPos({
      left: r.left,
      width: r.width,
      top: up ? undefined : r.bottom + 4,
      bottom: up ? vh - r.top + 4 : undefined,
      maxH,
    });
  };

  useEffect(() => {
    if (!open) { setPos(null); return; }
    setThemeAttr(wrapRef.current?.closest("[data-theme]")?.getAttribute("data-theme") ?? null);
    computePos();
    const handler = () => computePos();
    window.addEventListener("resize", handler);
    window.addEventListener("scroll", handler, true);
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Close on outside click (account for the portalled panel)
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!wrapRef.current?.contains(t) && !panelRef.current?.contains(t)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onDown);
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); setQuery(""); } };
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const openPicker = () => {
    setSel(value.province ? value : { ...EMPTY_ADDRESS });
    setTab("province");
    setQuery("");
    setOpen(true);
  };

  const finalize = (v: AddressValue) => {
    onChange(v);
    setSel(v);
    setQuery("");
    setOpen(false);
  };

  const clearAll = () => {
    onChange({ ...EMPTY_ADDRESS });
    setSel({ ...EMPTY_ADDRESS });
    setQuery("");
    setTab("province");
  };

  // ── Browse selections ──────────────────────────────────────────────────────
  const pickProvince = (province: string) => { setSel({ province, amphoe: "", district: "", zipcode: "" }); setTab("amphoe"); };
  const pickAmphoe = (amphoe: string) => { setSel((s) => ({ ...s, amphoe, district: "", zipcode: "" })); setTab("district"); };
  const pickDistrict = (district: string) => {
    // Always advance to the postal-code step so the user confirms/chooses the
    // correct zip — some ตำบล map to more than one รหัสไปรษณีย์.
    setSel((s) => ({ ...s, district, zipcode: "" }));
    setTab("zipcode");
  };
  const pickZip = (zipcode: string) => finalize({ ...sel, zipcode });

  // ── Apply a free-text suggestion (advances to the next missing level) ───────
  const applySuggestion = (s: ReturnType<typeof suggest>[number]) => {
    if (s.level === "full") {
      finalize({ province: s.province, amphoe: s.amphoe!, district: s.district!, zipcode: s.zipcode! });
      return;
    }
    if (s.level === "amphoe") {
      setSel({ province: s.province, amphoe: s.amphoe!, district: "", zipcode: "" });
      setQuery(""); setTab("district");
      return;
    }
    setSel({ province: s.province, amphoe: "", district: "", zipcode: "" });
    setQuery(""); setTab("amphoe");
  };

  const tabEnabled = (k: Tab) =>
    k === "province" ||
    (k === "amphoe" && !!sel.province) ||
    (k === "district" && !!sel.amphoe) ||
    (k === "zipcode" && !!sel.district);

  const browseItems = (): { key: string; label: string; active: boolean; onClick: () => void }[] => {
    if (tab === "province")
      return PROVINCES.map((p) => ({ key: p, label: p, active: sel.province === p, onClick: () => pickProvince(p) }));
    if (tab === "amphoe")
      return amphoesOf(sel.province).map((a) => ({ key: a, label: a, active: sel.amphoe === a, onClick: () => pickAmphoe(a) }));
    if (tab === "district")
      return districtsOf(sel.province, sel.amphoe).map((d) => ({ key: d, label: d, active: sel.district === d, onClick: () => pickDistrict(d) }));
    return zipcodesOf(sel.province, sel.amphoe, sel.district).map((z) => ({ key: z, label: z, active: sel.zipcode === z, onClick: () => pickZip(z) }));
  };

  const suggestions = searching ? suggest(query) : [];

  const crumbs: { label: string; tab: Tab }[] = [];
  if (sel.province) crumbs.push({ label: sel.province, tab: "province" });
  if (sel.amphoe)   crumbs.push({ label: `${amphoeLabel(sel.province)}${sel.amphoe}`, tab: "amphoe" });
  if (sel.district) crumbs.push({ label: `${districtLabel(sel.province)}${sel.district}`, tab: "district" });

  const panel = open && pos && (
    <div
      ref={panelRef}
      data-theme={themeAttr ?? undefined}
      style={{ position: "fixed", left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, zIndex: 60 }}
      className="rounded-box border border-base-300 bg-base-100 shadow-2xl overflow-hidden flex flex-col text-base-content"
    >
      {searching ? (
        <ul className="overflow-y-auto py-1" style={{ maxHeight: pos.maxH }}>
          {suggestions.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-base-content/40">ไม่พบที่อยู่ที่ค้นหา</li>
          ) : (
            suggestions.map((s, i) => (
              <li key={`${s.level}-${s.label}-${i}`}>
                <button
                  type="button"
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-base-200 transition-colors flex items-center gap-2"
                  onClick={() => applySuggestion(s)}
                >
                  <span className="grow">{s.label}</span>
                  {s.level !== "full" && (
                    <span className="badge badge-ghost badge-sm shrink-0 text-base-content/40">เลือกต่อ</span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : (
        <>
          {crumbs.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap px-3 pt-2 pb-1 text-xs shrink-0">
              {crumbs.map((c, i) => (
                <span key={c.tab} className="flex items-center gap-1">
                  {i > 0 && <span className="text-base-content/30">›</span>}
                  <button type="button" className="text-primary hover:underline" onClick={() => setTab(c.tab)}>
                    {c.label}
                  </button>
                </span>
              ))}
            </div>
          )}
          <div role="tablist" className="flex border-b border-base-300 shrink-0">
            {TABS.map((t) => {
              const enabled = tabEnabled(t.key);
              return (
                <button
                  key={t.key}
                  role="tab"
                  type="button"
                  disabled={!enabled}
                  onClick={() => enabled && setTab(t.key)}
                  className={`flex-1 px-2 py-2 text-xs font-medium border-b-2 -mb-px transition-colors
                    ${tab === t.key ? "border-primary text-primary" : "border-transparent text-base-content/50"}
                    ${enabled ? "hover:text-primary" : "opacity-40 cursor-not-allowed"}`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          <ul className="overflow-y-auto py-1 flex-1" style={{ maxHeight: pos.maxH - 44 }}>
            {browseItems().length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-base-content/40">— ไม่มีข้อมูล —</li>
            ) : (
              browseItems().map((it) => (
                <li key={it.key}>
                  <button
                    type="button"
                    className={`w-full text-left px-4 py-2 text-sm transition-colors hover:bg-base-200
                      ${it.active ? "bg-primary/10 text-primary font-medium" : ""}`}
                    onClick={it.onClick}
                  >
                    {it.label}
                  </button>
                </li>
              ))
            )}
          </ul>
        </>
      )}
    </div>
  );

  return (
    <div ref={wrapRef} className="relative w-full">
      <label className="input input-bordered rounded-xl w-full flex items-center gap-2 cursor-text">
        <svg className="w-4 h-4 text-base-content/40 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <input
          type="text"
          className="grow"
          placeholder={placeholder}
          value={open ? query : display}
          onFocus={openPicker}
          onChange={(e) => { if (!open) setOpen(true); setQuery(e.target.value); }}
        />
        {(display || query) && (
          <button
            type="button"
            className="shrink-0 text-base-content/40 hover:text-base-content"
            onClick={(e) => { e.preventDefault(); if (open && query) setQuery(""); else clearAll(); }}
            aria-label="ล้าง"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" strokeWidth={2} />
              <path strokeLinecap="round" strokeWidth={2} d="M15 9l-6 6m0-6l6 6" />
            </svg>
          </button>
        )}
      </label>

      {typeof document !== "undefined" && panel && createPortal(panel, document.body)}
    </div>
  );
}
