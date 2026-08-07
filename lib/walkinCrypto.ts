import crypto from "crypto";

// Reversible encryption for walk-in passwords so front-desk staff can look them up
// later. NOT plaintext: AES-256-GCM with a key derived from NEXTAUTH_SECRET, so a
// database dump alone doesn't reveal passwords. Caveat: rotating NEXTAUTH_SECRET
// makes stored passwords unreadable — staff then just uses the reset button.
const key = () =>
  crypto.createHash("sha256").update(`walkin:${process.env.NEXTAUTH_SECRET ?? ""}`).digest();

export function encryptPassword(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}.${cipher.getAuthTag().toString("hex")}.${enc.toString("hex")}`;
}

export function decryptPassword(stored: string): string | null {
  try {
    const [ivHex, tagHex, encHex] = stored.split(".");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    return Buffer.concat([decipher.update(Buffer.from(encHex, "hex")), decipher.final()]).toString("utf8");
  } catch {
    return null; // secret rotated or corrupt record
  }
}
