// Thai address dataset + cascade/search helpers.
// Data source: `thai-address-database` (compact dictionary db.json) which we
// expand once into a flat list and index for province → อำเภอ → ตำบล → zip.

import rawDb from "thai-address-database/database/db.json";

export interface AddressEntry {
  province: string;
  amphoe: string;   // เขต/อำเภอ
  district: string; // แขวง/ตำบล
  zipcode: string;
}

export type AddressValue = {
  province: string;
  amphoe: string;
  district: string;
  zipcode: string;
};

export const EMPTY_ADDRESS: AddressValue = { province: "", amphoe: "", district: "", zipcode: "" };

// ── Expand the compact dictionary DB into flat entries ─────────────────────────
function expand(data: {
  data: unknown[];
  lookup?: string;
  words?: string;
}): AddressEntry[] {
  const useLookup = !!(data.lookup && data.words);
  const lookup = data.lookup ? data.lookup.split("|") : [];
  const words = data.words ? data.words.split("|") : [];

  const repl = (m: string) => {
    const ch = m.charCodeAt(0);
    return words[ch < 97 ? ch - 65 : 26 + ch - 97] ?? m;
  };
  const t = (text: unknown): string => {
    if (!useLookup) return String(text);
    let s = typeof text === "number" ? lookup[text] : (text as string);
    s = String(s ?? "");
    return s.replace(/[A-Za-z]/g, repl);
  };

  const out: AddressEntry[] = [];
  for (const province of data.data as never[]) {
    const provName = (province as never[])[0];
    for (const amphoe of (province as never[])[1] as never[]) {
      const ampName = (amphoe as never[])[0];
      for (const district of (amphoe as never[])[1] as never[]) {
        const distName = (district as never[])[0];
        const zips = (district as never[])[1] as unknown;
        const zipArr = Array.isArray(zips) ? zips : [zips];
        for (const zip of zipArr) {
          out.push({
            province: t(provName),
            amphoe: t(ampName),
            district: t(distName),
            zipcode: String(zip),
          });
        }
      }
    }
  }
  return out;
}

export const ADDRESS_DB: AddressEntry[] = expand(rawDb as never);

// ── Index for fast cascading lookups ───────────────────────────────────────────
// province -> amphoe -> district -> Set<zip>
const tree = new Map<string, Map<string, Map<string, Set<string>>>>();
for (const e of ADDRESS_DB) {
  let aMap = tree.get(e.province);
  if (!aMap) { aMap = new Map(); tree.set(e.province, aMap); }
  let dMap = aMap.get(e.amphoe);
  if (!dMap) { dMap = new Map(); aMap.set(e.amphoe, dMap); }
  let zSet = dMap.get(e.district);
  if (!zSet) { zSet = new Set(); dMap.set(e.district, zSet); }
  zSet.add(e.zipcode);
}

const thSort = (a: string, b: string) => a.localeCompare(b, "th");

export const PROVINCES: string[] = Array.from(tree.keys()).sort(thSort);

export function amphoesOf(province: string): string[] {
  return Array.from(tree.get(province)?.keys() ?? []).sort(thSort);
}
export function districtsOf(province: string, amphoe: string): string[] {
  return Array.from(tree.get(province)?.get(amphoe)?.keys() ?? []).sort(thSort);
}
export function zipcodesOf(province: string, amphoe: string, district: string): string[] {
  return Array.from(tree.get(province)?.get(amphoe)?.get(district) ?? []).sort();
}

// ── Bangkok uses แขวง/เขต, the rest use ตำบล/อำเภอ ─────────────────────────────
const isBangkok = (province: string) => province === "กรุงเทพมหานคร";
export const districtLabel = (province: string) => (isBangkok(province) ? "แขวง" : "ตำบล");
export const amphoeLabel  = (province: string) => (isBangkok(province) ? "เขต" : "อำเภอ");
export const provinceLabel = (province: string) => (isBangkok(province) ? "" : "จังหวัด");

export function formatAddress(v: AddressValue): string {
  if (!v.province) return "";
  const parts: string[] = [];
  if (v.district) parts.push(`${districtLabel(v.province)}${v.district}`);
  if (v.amphoe)   parts.push(`${amphoeLabel(v.province)}${v.amphoe}`);
  parts.push(`${provinceLabel(v.province)}${v.province}`);
  if (v.zipcode)  parts.push(v.zipcode);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export function isComplete(v: AddressValue): boolean {
  return !!(v.province && v.amphoe && v.district && v.zipcode);
}

// ── Free-text suggestions (mixed granularity, like Shopee) ─────────────────────
export type SuggestionLevel = "province" | "amphoe" | "full";

export interface Suggestion {
  level: SuggestionLevel;
  province: string;
  amphoe?: string;
  district?: string;
  zipcode?: string;
  label: string;
}

const LABEL_NOISE = /จังหวัด|อำเภอ|เขต|ตำบล|แขวง|รหัสไปรษณีย์|จ\.|อ\.|ต\./g;

export function suggest(query: string, max = 24): Suggestion[] {
  const cleaned = query.replace(LABEL_NOISE, " ");
  const tokens = cleaned.toLowerCase().split(/[\s,]+/).filter(Boolean);
  if (tokens.length === 0) return [];
  const first = tokens[0];

  const matchAll = (hay: string) => {
    const h = hay.toLowerCase();
    return tokens.every((t) => h.includes(t));
  };
  // Lower = more relevant: name starts with the query → 0, otherwise by how
  // early the query appears (so closer matches rank above incidental ones).
  const score = (name: string) => {
    const n = name.toLowerCase();
    if (n.startsWith(first)) return 0;
    const idx = n.indexOf(first);
    return idx < 0 ? 999 : idx + 1;
  };

  type Scored = Suggestion & { _s: number };
  const provinceHits: Scored[] = [];
  const amphoeHits: Scored[] = [];
  const fullHits: Scored[] = [];
  const seenP = new Set<string>();
  const seenA = new Set<string>();
  const seenF = new Set<string>();

  for (const e of ADDRESS_DB) {
    // Province-level
    if (!seenP.has(e.province) && matchAll(e.province)) {
      seenP.add(e.province);
      provinceHits.push({
        level: "province", province: e.province, _s: score(e.province),
        label: `${provinceLabel(e.province)}${e.province}`,
      });
    }
    // Amphoe-level (match in อำเภอ or จังหวัด)
    const aKey = `${e.province}|${e.amphoe}`;
    if (!seenA.has(aKey) && matchAll(`${e.amphoe} ${e.province}`)) {
      seenA.add(aKey);
      amphoeHits.push({
        level: "amphoe", province: e.province, amphoe: e.amphoe, _s: score(e.amphoe),
        label: `${amphoeLabel(e.province)}${e.amphoe}, ${provinceLabel(e.province)}${e.province}`,
      });
    }
    // Full (ตำบล/รหัสไปรษณีย์)
    const fKey = `${e.province}|${e.amphoe}|${e.district}|${e.zipcode}`;
    if (!seenF.has(fKey) && matchAll(`${e.district} ${e.amphoe} ${e.province} ${e.zipcode}`)) {
      seenF.add(fKey);
      // score by district first, then zipcode (so a zip-typed query still ranks)
      const s = Math.min(score(e.district), score(e.zipcode));
      fullHits.push({
        level: "full", province: e.province, amphoe: e.amphoe, district: e.district, zipcode: e.zipcode, _s: s,
        label: `${e.zipcode}, ${districtLabel(e.province)}${e.district}, ${amphoeLabel(e.province)}${e.amphoe}, ${provinceLabel(e.province)}${e.province}`,
      });
    }
  }

  const byScore = (a: Scored, b: Scored) => a._s - b._s || a.label.localeCompare(b.label, "th");
  provinceHits.sort(byScore);
  amphoeHits.sort(byScore);
  fullHits.sort(byScore);

  // Broad → specific: จังหวัด first, then อำเภอ, then ตำบล/ไปรษณีย์
  const ordered = [
    ...provinceHits.slice(0, 6),
    ...amphoeHits.slice(0, 8),
    ...fullHits.slice(0, 14),
  ];
  return ordered.slice(0, max).map(({ _s, ...rest }) => { void _s; return rest; });
}

// ── Parse a stored free-text address back into { line, value } for prefilling ──
export function parseAddress(full: string): { line: string; value: AddressValue } {
  if (!full?.trim()) return { line: "", value: { ...EMPTY_ADDRESS } };

  const zip = full.match(/(\d{5})/)?.[1] ?? "";
  let best: AddressEntry | null = null;

  const candidates = zip
    ? ADDRESS_DB.filter((e) => e.zipcode === zip)
    : ADDRESS_DB;

  for (const e of candidates) {
    if (full.includes(e.province) && full.includes(e.amphoe) && full.includes(e.district)) {
      best = e;
      break;
    }
  }
  // Fallback: province + amphoe only
  if (!best && zip) {
    for (const e of candidates) {
      if (full.includes(e.province) && full.includes(e.amphoe)) { best = e; break; }
    }
  }

  if (!best) return { line: full.trim(), value: { ...EMPTY_ADDRESS } };

  const value: AddressValue = {
    province: best.province,
    amphoe: best.amphoe,
    district: best.district,
    zipcode: best.zipcode,
  };

  // Strip the geo parts + labels from the free text to recover the detail line
  let line = full;
  for (const piece of [
    `${districtLabel(value.province)}${value.district}`,
    `${amphoeLabel(value.province)}${value.amphoe}`,
    `${provinceLabel(value.province)}${value.province}`,
    value.district, value.amphoe, value.province, value.zipcode,
  ]) {
    if (piece) line = line.split(piece).join(" ");
  }
  line = line.replace(LABEL_NOISE, " ").replace(/[,\s]+/g, " ").trim();

  return { line, value };
}
