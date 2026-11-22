// "Who's on this RFQ right now" — the edit page heartbeats every PRESENCE_HEARTBEAT_MS;
// an entry not refreshed within PRESENCE_TTL_MS is a closed/crashed tab and is ignored.
// Warning only: nobody is ever blocked from editing.

export const PRESENCE_HEARTBEAT_MS = 30 * 1000;
export const PRESENCE_TTL_MS = 60 * 1000;

export type Editor = { id: string; name: string; at: string | Date };

export const activeEditors = (editors: Editor[] | undefined, now = Date.now()) =>
  (editors ?? []).filter((e) => now - new Date(e.at).getTime() < PRESENCE_TTL_MS);
