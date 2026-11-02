import crypto from "crypto";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp, getApps, cert } from "firebase-admin/app";

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

export const adminDb = () => getFirestore();

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/* Verifies the Firebase ID token sent as "Authorization: Bearer <token>". */
export async function requireUser(req) {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) throw new HttpError(401, "Please log in again.");
  try {
    return await getAuth().verifyIdToken(header.slice(7));
  } catch {
    throw new HttpError(401, "Your session expired. Please log in again.");
  }
}

/* Same admin flag the control panel uses, but checked on the server. */
export async function requireAdmin(req) {
  const user = await requireUser(req);
  const snap = await adminDb().collection("users").doc(user.uid).get();
  if (snap.data()?.admin !== true) throw new HttpError(403, "Admins only.");
  return user;
}

/* =========================
   TICKET CODES + QR SIGNING
========================= */

// No 0/O, 1/I/L so codes can be read out and typed at the door.
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function generateTicketCode(length = 8) {
  const bytes = crypto.randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i++) code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return code;
}

export function normalizeTicketCode(input) {
  return String(input || "").toUpperCase().replace(/[^0-9A-Z]/g, "");
}

function signingKey() {
  const secret = process.env.TICKET_SECRET || process.env.FIREBASE_PRIVATE_KEY;
  if (!secret) throw new Error("TICKET_SECRET (or FIREBASE_PRIVATE_KEY) is not set");
  return secret;
}

function sign(code) {
  return crypto.createHmac("sha256", signingKey()).update(`ticket:${code}`).digest("base64url").slice(0, 16);
}

// What goes inside the QR. The signature means only this server can mint a valid QR.
export function ticketQrPayload(code) {
  return `PPITSZ.${code}.${sign(code)}`;
}

/* Returns the ticket code from a scanned QR, or null if it is not a genuine ticket. */
export function verifyTicketQrPayload(text) {
  const match = /^PPITSZ\.([0-9A-Z]+)\.([A-Za-z0-9_-]+)$/.exec(String(text || "").trim());
  if (!match) return null;
  const [, code, sig] = match;
  const expected = sign(code);
  if (sig.length !== expected.length) return null;
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)) ? code : null;
}
