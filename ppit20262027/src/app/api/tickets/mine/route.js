import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb, requireUser, HttpError, ticketQrPayload } from "@/lib/tickets/server";
import { eventFromForm, buildTicketFiles } from "@/lib/tickets/assets";
import { sendTicketEmail } from "@/lib/tickets/email";

export const maxDuration = 30;

const RESEND_COOLDOWN_MS = 2 * 60 * 1000;

/*
  POST { formId, resend? }
  The logged-in user's ticket for a ticketed form. Tickets are issued by admins in one go
  (see /api/tickets/issue), so until then this reports status "pending" (or "declined").
*/
export async function POST(req) {
  try {
    const authUser = await requireUser(req);
    const { formId, resend = false } = await req.json();
    if (!formId || typeof formId !== "string") throw new HttpError(400, "Missing formId");

    const db = adminDb();
    const formSnap = await db.collection("forms").doc(formId).get();
    const form = formSnap.data();
    if (!form?.ticket?.enabled) throw new HttpError(404, "This form does not issue tickets.");
    const event = eventFromForm(form);

    const holder = await db.collection("ticketHolders").doc(`${formId}_${authUser.uid}`).get();
    if (!holder.exists) {
      const responses = await db
        .collection("forms").doc(formId).collection("responses")
        .where("submittedBy", "==", authUser.uid)
        .limit(1)
        .get();
      if (responses.empty) throw new HttpError(404, "We could not find your registration for this form.");
      // Only tell people they were declined once the committee has actually sent tickets out.
      const declined = responses.docs[0].data().ticketDeclined === true && !!form.ticketsIssuedAt;
      return NextResponse.json({ status: declined ? "declined" : "pending", event });
    }

    const code = holder.data().code;
    const ticketRef = db.collection("tickets").doc(code);
    const ticket = (await ticketRef.get()).data();

    // "pending" means the admin's batch is still emailing it, so don't send a second copy.
    const lastSent = ticket.emailSentAt?.toMillis?.() || 0;
    const canResend = ticket.emailStatus !== "pending" && Date.now() - lastSent > RESEND_COOLDOWN_MS;

    let emailStatus = ticket.emailStatus;
    let emailError = null;
    if (resend && canResend && ticket.email) {
      try {
        const { qrPng, pdf } = await buildTicketFiles(ticket, event);
        await sendTicketEmail({ to: ticket.email, ticket, event, qrPng, pdf });
        emailStatus = "sent";
        await ticketRef.update({ emailStatus, emailSentAt: FieldValue.serverTimestamp(), emailError: null });
      } catch (err) {
        console.error("[tickets/mine] email failed", code, err);
        emailStatus = "failed";
        emailError = "We could not email your ticket. Save the QR on this page, or try resending.";
        await ticketRef.update({ emailStatus, emailError: String(err.message || err).slice(0, 300) });
      }
    } else if (resend) {
      emailError = "Your ticket was emailed a moment ago. Please wait a couple of minutes before resending.";
    }

    return NextResponse.json({
      status: "issued",
      code,
      qrPayload: ticketQrPayload(code),
      name: ticket.name,
      email: ticket.email,
      emailStatus,
      emailError,
      checkedIn: ticket.checkedIn,
      event,
    });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[tickets/mine]", err);
    return NextResponse.json({ error: "Something went wrong loading your ticket." }, { status: 500 });
  }
}
