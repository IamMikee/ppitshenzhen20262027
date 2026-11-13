import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  adminDb,
  requireUser,
  HttpError,
  ticketQrPayload,
  holderRef,
  holderCodes,
  responseHasTicket,
} from "@/lib/tickets/server";
import { eventFromForm, buildTicketFiles } from "@/lib/tickets/assets";
import { sendTicketEmail } from "@/lib/tickets/email";

export const maxDuration = 30;

const RESEND_COOLDOWN_MS = 2 * 60 * 1000;

/* Emails one ticket again, returning its new emailStatus and a message for the user if it didn't go out. */
async function resendTicket(ref, ticket, event) {
  // "pending" means the admin's batch is still emailing it, so don't send a second copy.
  const lastSent = ticket.emailSentAt?.toMillis?.() || 0;
  const canResend = ticket.emailStatus !== "pending" && Date.now() - lastSent > RESEND_COOLDOWN_MS;
  if (!canResend || !ticket.email) {
    return {
      emailStatus: ticket.emailStatus,
      emailError: "Your ticket was emailed a moment ago. Please wait a couple of minutes before resending.",
    };
  }
  try {
    const { qrPng, pdf } = await buildTicketFiles(ticket, event);
    await sendTicketEmail({ to: ticket.email, ticket, event, qrPng, pdf });
    await ref.update({ emailStatus: "sent", emailSentAt: FieldValue.serverTimestamp(), emailError: null });
    return { emailStatus: "sent", emailError: null };
  } catch (err) {
    console.error("[tickets/mine] email failed", ticket.code, err);
    await ref.update({ emailStatus: "failed", emailError: String(err.message || err).slice(0, 300) });
    return { emailStatus: "failed", emailError: "We could not email your ticket. Save the QR on this page, or try resending." };
  }
}

/*
  POST { formId, resendCode? }
  The logged-in user's tickets for a ticketed form, one per approved response (in submission order).
  Tickets are issued by admins in one go (see /api/tickets/issue), so responses made since then are
  counted in `awaiting` (or `declined`). Status is "issued" once they hold any ticket, else "pending" / "declined".
*/
export async function POST(req) {
  try {
    const authUser = await requireUser(req);
    const { formId, resendCode = null } = await req.json();
    if (!formId || typeof formId !== "string") throw new HttpError(400, "Missing formId");

    const db = adminDb();
    const formSnap = await db.collection("forms").doc(formId).get();
    const form = formSnap.data();
    if (!form?.ticket?.enabled) throw new HttpError(404, "This form does not issue tickets.");
    const event = eventFromForm(form);

    const [holder, responses] = await Promise.all([
      holderRef(db, formId, authUser.uid).get(),
      db.collection("forms").doc(formId).collection("responses").where("submittedBy", "==", authUser.uid).get(),
    ]);
    const codes = holderCodes(holder.data());
    if (!codes.length && responses.empty) throw new HttpError(404, "We could not find your registration for this form.");
    if (resendCode && !codes.includes(resendCode)) throw new HttpError(404, "No ticket found.");

    const ticketSnaps = codes.length ? await db.getAll(...codes.map((c) => db.collection("tickets").doc(c))) : [];
    const tickets = await Promise.all(
      ticketSnaps
        .filter((snap) => snap.exists)
        .map(async (snap) => {
          const ticket = snap.data();
          const email =
            ticket.code === resendCode
              ? await resendTicket(snap.ref, ticket, event)
              : { emailStatus: ticket.emailStatus, emailError: null };
          return {
            code: ticket.code,
            qrPayload: ticketQrPayload(ticket.code),
            name: ticket.name,
            email: ticket.email,
            ...email,
            checkedIn: ticket.checkedIn,
          };
        })
    );

    const ticketedResponses = new Set(ticketSnaps.map((snap) => snap.get("responseId")));
    let awaiting = 0;
    let declined = 0;
    for (const r of responses.docs) {
      if (responseHasTicket(form, r.id, ticketedResponses, codes.length > 0)) continue;
      // Only tell people they were declined once the committee has actually sent tickets out.
      if (r.data().ticketDeclined === true && form.ticketsIssuedAt) declined++;
      else awaiting++;
    }

    const status = tickets.length ? "issued" : !awaiting && declined ? "declined" : "pending";
    return NextResponse.json({ status, tickets, awaiting, declined, event });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[tickets/mine]", err);
    return NextResponse.json({ error: "Something went wrong loading your ticket." }, { status: 500 });
  }
}
