import QRCode from "qrcode";
import { ticketQrPayload } from "./server.js";
import { renderTicketPdf } from "./pdf.js";
import { coverThumbUrl } from "./cover.js";

/* Ticket settings saved by the form builder, with fallbacks for older forms. */
export function eventFromForm(form) {
  const t = form.ticket || {};
  return {
    eventName: t.eventName || form.title || "PPIT Shenzhen Event",
    date: t.date || "",
    time: t.time || "",
    venue: t.venue || "",
    notes: t.notes || "",
    coverImage: form.coverImage || "",
  };
}

export async function fetchCover(url) {
  if (!url) return null;
  try {
    const res = await fetch(coverThumbUrl(url, 300), { signal: AbortSignal.timeout(8000) });
    const type = res.headers.get("content-type") || "";
    if (!res.ok || !/image\/(jpeg|png)/.test(type)) return null;
    return { data: Buffer.from(await res.arrayBuffer()), format: type.includes("png") ? "png" : "jpg" };
  } catch {
    return null;
  }
}

// Pass `cover` (from fetchCover) when building many tickets so it is downloaded once.
export async function buildTicketFiles(ticket, event, cover) {
  const qrPng = await QRCode.toBuffer(ticketQrPayload(ticket.code), { errorCorrectionLevel: "M", margin: 1, width: 600 });
  const pdf = await renderTicketPdf({
    ticket,
    event,
    qrDataUrl: `data:image/png;base64,${qrPng.toString("base64")}`,
    cover: cover === undefined ? await fetchCover(event.coverImage) : cover,
  });
  return { qrPng, pdf };
}
