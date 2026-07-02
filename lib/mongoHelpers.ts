import mongoose from "mongoose";

export function clearDevModel(name: string): void {
  if (process.env.NODE_ENV === "development" && mongoose.models[name]) {
    delete mongoose.models[name];
  }
}

// Document number: PREFIX-<last 6 hex of the doc's own ObjectId>-<YYMMDD>, e.g. PAY-9F3A2C-260702.
// The slug is the tail of the record's real _id (pass the returned _id to create), so the number
// identifies the exact document. Generated locally — no DB round-trip, no duplicate-number race
// (the old find-last+1 could hand two concurrent requests the same number). The number fields'
// unique indexes remain the final guard.
export function generateDocumentNumber(prefix: string): { _id: mongoose.Types.ObjectId; number: string } {
  const _id = new mongoose.Types.ObjectId();
  const now = new Date();
  const date =
    String(now.getFullYear()).slice(-2) +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0");
  return { _id, number: `${prefix}-${_id.toHexString().slice(-6).toUpperCase()}-${date}` };
}
