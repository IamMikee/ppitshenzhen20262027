import nodemailer from "nodemailer";
import { coverThumbUrl } from "./cover.js";

const RED = "#7E0C0E";
const FONT = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const escapeHtml = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

let transporter;
function getTransporter() {
  transporter ??= nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
  return transporter;
}

const field = (label, value) => `
  <td width="50%" valign="top" style="padding:0 8px 16px 0">
    <div style="font-size:11px;color:#9ca3af;margin-bottom:3px">${label}</div>
    <div style="font-size:14px;color:#111827;line-height:1.35">${escapeHtml(value) || "-"}</div>
  </td>`;

function ticketHtml({ ticket, event }) {
  const cover = coverThumbUrl(event.coverImage, 160);
  const coverCell = cover
    ? `<img src="${escapeHtml(cover)}" width="78" height="78" alt="" style="display:block;width:78px;height:78px;border-radius:8px;object-fit:cover">`
    : `<div style="width:78px;height:78px;border-radius:8px;background:${RED};color:#fff;font-weight:700;font-size:15px;line-height:78px;text-align:center;letter-spacing:1px">PPIT</div>`;

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${RED};font-family:${FONT}">
  <tr><td align="center" style="padding:28px 12px">
    <p style="margin:0 0 16px;color:#fff;font-size:15px;max-width:360px">Hi ${escapeHtml(ticket.name)}, you're registered! Here's your ticket.</p>

    <table role="presentation" width="360" cellpadding="0" cellspacing="0" style="width:360px;max-width:100%;background:#fff;border-radius:14px">
      <tr><td style="padding:24px 24px 8px">
        <div style="font-size:10px;letter-spacing:2px;font-weight:700;color:${RED};margin-bottom:16px">PPIT SHENZHEN · E-TICKET</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
          <tr>
            <td width="78" valign="middle">${coverCell}</td>
            <td valign="middle" style="padding-left:16px">
              <div style="font-size:20px;font-weight:700;color:#111827;line-height:1.2;margin-bottom:8px">${escapeHtml(event.eventName)}</div>
              <div style="font-size:11px;color:#9ca3af;margin-bottom:2px">Attendee</div>
              <div style="font-size:14px;color:#111827">${escapeHtml(ticket.name)}</div>
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>${field("Date", event.date)}${field("Time", event.time)}</tr>
          <tr>${field("Admit", "1 person")}${field("Venue", event.venue)}</tr>
        </table>
      </td></tr>

      <tr><td>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="12" height="24" style="background:${RED};border-radius:0 12px 12px 0;font-size:0">&nbsp;</td>
            <td style="padding:0 10px"><div style="border-top:2px dashed #d1d5db;height:0;font-size:0;line-height:0">&nbsp;</div></td>
            <td width="12" height="24" style="background:${RED};border-radius:12px 0 0 12px;font-size:0">&nbsp;</td>
          </tr>
        </table>
      </td></tr>

      <tr><td align="center" style="padding:20px 24px 24px">
        <img src="cid:ticket-qr" alt="Ticket QR code" width="200" height="200" style="display:block;width:200px;height:200px">
        <div style="font-size:13px;font-weight:700;color:#111827;margin-top:12px;letter-spacing:.5px">TICKET CODE - ${ticket.code}</div>
        <div style="font-size:11px;color:#6b7280;margin-top:10px;line-height:1.5">Show this QR at the entrance. Valid for one entry only.${event.notes ? `<br>${escapeHtml(event.notes)}` : ""}</div>
      </td></tr>
    </table>

    <p style="margin:16px 0 0;color:#ffffffcc;font-size:12px;line-height:1.5;max-width:360px">
      Your ticket is also attached as a PDF. Lost this email? Open the registration form again while logged in to see your ticket.
    </p>
  </td></tr>
</table>`;
}

export async function sendTicketEmail({ to, ticket, event, qrPng, pdf }) {
  const text = `Hi ${ticket.name},

You're registered for ${event.eventName}.
${event.date ? `Date: ${event.date}\n` : ""}${event.time ? `Time: ${event.time}\n` : ""}${event.venue ? `Venue: ${event.venue}\n` : ""}
Ticket code: ${ticket.code}
Show the QR in the attached PDF at the entrance. Valid for one entry only.`;

  await getTransporter().sendMail({
    from: `"PPIT Shenzhen" <${process.env.GMAIL_USER}>`,
    to,
    subject: `Your ticket: ${event.eventName} (${ticket.code})`,
    html: ticketHtml({ ticket, event }),
    text,
    attachments: [
      { filename: "ticket-qr.png", content: qrPng, cid: "ticket-qr" },
      { filename: `ticket-${ticket.code}.pdf`, content: pdf, contentType: "application/pdf" },
    ],
  });
}

// Exported for previewing the design without sending.
export { ticketHtml };
