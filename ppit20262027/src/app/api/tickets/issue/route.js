import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb, requireUser, HttpError, generateTicketCode, ticketQrPayload } from "@/lib/tickets/server";
import { eventFromForm, buildTicketFiles } from "@/lib/tickets/assets";
import { sendTicketEmail } from "@/lib/tickets/email";

export const maxDuration = 30;

const RESEND_COOLDOWN_MS = 2 * 60 * 1000;

const stripHtml = (s) => String(s || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();

// Prefer the name typed into the form ("Name", "Full Name", "Nama Lengkap"...), else the account name.
function pickName(questions, answers, userDoc, authUser) {
  const nameQuestion = (questions || []).find(
    (q) => q.type === "text" && /^(full\s*)?(name|nama)\b/i.test(stripHtml(q.label))
  );
  const fromForm = nameQuestion && typeof answers?.[nameQuestion.id] === "string" ? answers[nameQuestion.id].trim() : "";
  return (fromForm || userDoc?.name || authUser.name || authUser.email || "Guest").slice(0, 80);
}

/*
  POST { formId, resend? }
  Creates (once) the ticket for the logged-in user's response to a ticketed form,
  emails it, and returns what the success screen needs to show the QR.
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

    const responses = await db
      .collection("forms").doc(formId).collection("responses")
      .where("submittedBy", "==", authUser.uid)
      .limit(1)
      .get();
    if (responses.empty) throw new HttpError(404, "We could not find your registration for this form.");
    const response = responses.docs[0];

    const userDoc = (await db.collection("users").doc(authUser.uid).get()).data();
    const holderRef = db.collection("ticketHolders").doc(`${formId}_${authUser.uid}`);

    // One ticket per user per form, even if the request is sent twice at once.
    const { code, created } = await db.runTransaction(async (tx) => {
      const holder = await tx.get(holderRef);
      if (holder.exists) return { code: holder.data().code, created: false };

      let newCode;
      for (let i = 0; i < 5 && !newCode; i++) {
        const candidate = generateTicketCode();
        if (!(await tx.get(db.collection("tickets").doc(candidate))).exists) newCode = candidate;
      }
      if (!newCode) throw new Error("Could not allocate a ticket code");

      tx.create(db.collection("tickets").doc(newCode), {
        code: newCode,
        formId,
        responseId: response.id,
        uid: authUser.uid,
        email: authUser.email || "",
        name: pickName(form.questions, response.data().answers, userDoc, authUser),
        createdAt: FieldValue.serverTimestamp(),
        checkedIn: false,
        checkedInAt: null,
        checkedInBy: null,
        emailStatus: "pending",
        emailSentAt: null,
      });
      tx.create(holderRef, { code: newCode, formId, uid: authUser.uid });
      return { code: newCode, created: true };
    });

    const ticketRef = db.collection("tickets").doc(code);
    const ticket = (await ticketRef.get()).data();
    const event = eventFromForm(form);
    const qrPayload = ticketQrPayload(code);

    const lastSent = ticket.emailSentAt?.toMillis?.() || 0;
    const shouldEmail =
      created ||
      ticket.emailStatus === "failed" ||
      (resend && Date.now() - lastSent > RESEND_COOLDOWN_MS);

    let emailStatus = ticket.emailStatus;
    let emailError = null;
    if (shouldEmail && ticket.email) {
      try {
        const { qrPng, pdf } = await buildTicketFiles(ticket, event);
        await sendTicketEmail({ to: ticket.email, ticket, event, qrPng, pdf });
        emailStatus = "sent";
        await ticketRef.update({ emailStatus, emailSentAt: FieldValue.serverTimestamp(), emailError: null });
      } catch (err) {
        console.error("[tickets/issue] email failed", code, err);
        emailStatus = "failed";
        emailError = "We could not email your ticket. Save the QR on this page, or try resending.";
        await ticketRef.update({ emailStatus, emailError: String(err.message || err).slice(0, 300) });
      }
    } else if (resend && !shouldEmail) {
      emailError = "Your ticket was emailed a moment ago. Please wait a couple of minutes before resending.";
    }

    return NextResponse.json({
      code,
      qrPayload,
      name: ticket.name,
      email: ticket.email,
      emailStatus,
      emailError,
      checkedIn: ticket.checkedIn,
      event,
    });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[tickets/issue]", err);
    return NextResponse.json({ error: "Something went wrong issuing your ticket." }, { status: 500 });
  }
}
