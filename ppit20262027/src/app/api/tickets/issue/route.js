import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb, requireAdmin, HttpError, generateTicketCode } from "@/lib/tickets/server";
import { eventFromForm, buildTicketFiles, fetchCover } from "@/lib/tickets/assets";
import { sendTicketEmail } from "@/lib/tickets/email";

export const maxDuration = 60;

// Stop starting new emails after this so the request finishes well inside maxDuration.
const EMAIL_BUDGET_MS = 40 * 1000;
// Two writes per ticket (ticket + holder); Firestore batches cap at 500 writes.
const TICKETS_PER_BATCH = 200;

const stripHtml = (s) => String(s || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();

// Prefer the name typed into the form ("Name", "Full Name", "Nama Lengkap"...), else the account name.
function pickName(questions, answers, userDoc, email) {
  const nameQuestion = (questions || []).find(
    (q) => q.type === "text" && /^(full\s*)?(name|nama)\b/i.test(stripHtml(q.label))
  );
  const fromForm = nameQuestion && typeof answers?.[nameQuestion.id] === "string" ? answers[nameQuestion.id].trim() : "";
  return (fromForm || userDoc?.name || email || "Guest").slice(0, 80);
}

/* Creates a ticket for every response that isn't declined and doesn't have one yet. */
async function issueMissingTickets(db, formId, form) {
  const [responses, holders] = await Promise.all([
    db.collection("forms").doc(formId).collection("responses").get(),
    db.collection("ticketHolders").where("formId", "==", formId).get(),
  ]);

  const hasTicket = new Set(holders.docs.map((d) => d.data().uid));
  const todo = [];
  for (const r of responses.docs) {
    const { submittedBy, ticketDeclined } = r.data();
    if (!submittedBy || ticketDeclined || hasTicket.has(submittedBy)) continue;
    hasTicket.add(submittedBy); // one ticket per user, even with duplicate responses
    todo.push(r);
  }
  if (!todo.length) return 0;

  const users = await db.getAll(...todo.map((r) => db.collection("users").doc(r.data().submittedBy)));

  for (let i = 0; i < todo.length; i += TICKETS_PER_BATCH) {
    const batch = db.batch();
    todo.slice(i, i + TICKETS_PER_BATCH).forEach((r, j) => {
      const { submittedBy: uid, answers, userEmail } = r.data();
      const userDoc = users[i + j].data();
      const email = userEmail || userDoc?.email || "";
      const code = generateTicketCode();
      // create() fails the whole batch if the holder already exists, so a double click can't double-issue.
      batch.create(db.collection("tickets").doc(code), {
        code,
        formId,
        responseId: r.id,
        uid,
        email,
        name: pickName(form.questions, answers, userDoc, email),
        createdAt: FieldValue.serverTimestamp(),
        checkedIn: false,
        checkedInAt: null,
        checkedInBy: null,
        emailStatus: "pending",
        emailSentAt: null,
      });
      batch.create(db.collection("ticketHolders").doc(`${formId}_${uid}`), { code, formId, uid });
    });
    await batch.commit();
  }
  return todo.length;
}

/*
  POST { formId, retryFailed? }   (admin)
  Issues tickets to everyone not declined, then emails pending tickets until the time budget
  runs out. The page calls again while `remaining` > 0.
*/
export async function POST(req) {
  try {
    await requireAdmin(req);
    const { formId, retryFailed = false } = await req.json();
    if (!formId || typeof formId !== "string") throw new HttpError(400, "Missing formId");

    const db = adminDb();
    const formRef = db.collection("forms").doc(formId);
    const form = (await formRef.get()).data();
    if (!form?.ticket?.enabled) throw new HttpError(404, "This form does not issue tickets.");

    const issued = await issueMissingTickets(db, formId, form);
    // Kept outside `ticket` so saving the form builder can't wipe it.
    if (!form.ticketsIssuedAt) await formRef.update({ ticketsIssuedAt: FieldValue.serverTimestamp() });

    const tickets = db.collection("tickets").where("formId", "==", formId);
    if (retryFailed) {
      const failedSnap = await tickets.where("emailStatus", "==", "failed").get();
      if (!failedSnap.empty) {
        const batch = db.batch();
        failedSnap.docs.forEach((d) => batch.update(d.ref, { emailStatus: "pending" }));
        await batch.commit();
      }
    }

    const pending = await tickets.where("emailStatus", "==", "pending").get();
    const event = eventFromForm(form);
    const cover = pending.empty ? null : await fetchCover(event.coverImage);
    const started = Date.now();
    let sent = 0;
    let failed = 0;

    for (const doc of pending.docs) {
      if (Date.now() - started > EMAIL_BUDGET_MS) break;
      const ticket = doc.data();
      try {
        if (!ticket.email) throw new Error("No email address");
        const { qrPng, pdf } = await buildTicketFiles(ticket, event, cover);
        await sendTicketEmail({ to: ticket.email, ticket, event, qrPng, pdf });
        await doc.ref.update({ emailStatus: "sent", emailSentAt: FieldValue.serverTimestamp(), emailError: null });
        sent++;
      } catch (err) {
        console.error("[tickets/issue] email failed", ticket.code, err);
        await doc.ref.update({ emailStatus: "failed", emailError: String(err.message || err).slice(0, 300) });
        failed++;
      }
    }

    return NextResponse.json({ issued, sent, failed, remaining: pending.size - sent - failed });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[tickets/issue]", err);
    return NextResponse.json({ error: "Something went wrong issuing tickets." }, { status: 500 });
  }
}
