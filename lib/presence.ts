// "Who's on this RFQ right now" — a claim, held until the staff member leaves the edit page.
// While the tab is visible the page re-confirms every PRESENCE_HEARTBEAT_MS (cheap: the page
// polls chat anyway, so the function is warm). When the tab is hidden it sends one "away"
// signal and then nothing at all — hidden tabs are what burned CPU (every call a cold start).
// Leaving the page (or closing the tab) drops the claim.
// The TTLs only clean up after a crash / sleep / lost connection; checking them costs no request.
// Warning only: nobody is ever blocked from editing.

export const PRESENCE_HEARTBEAT_MS = 30 * 1000;
export const PRESENCE_TTL_MS = 5 * 60 * 1000;            // visible page that went silent
export const PRESENCE_AWAY_TTL_MS = 2 * 60 * 60 * 1000;  // switched to another tab/app

export type Editor = { id: string; name: string; at: string | Date; away?: boolean };

const ttlOf = (e: Pick<Editor, "away">) => (e.away ? PRESENCE_AWAY_TTL_MS : PRESENCE_TTL_MS);

export const activeEditors = (editors: Editor[] | undefined, now = Date.now()) =>
  (editors ?? []).filter((e) => now - new Date(e.at).getTime() < ttlOf(e));
