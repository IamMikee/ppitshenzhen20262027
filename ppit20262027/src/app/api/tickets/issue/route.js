import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  adminDb,
  requireAdmin,
  HttpError,
  generateTicketCode,
  holderRef,
  holderCodes,
  responseHasTicket,
} from "@/lib/tickets/server";
import { eventFromForm, buildTicketFiles, fetchCover } from "@/lib/tickets/assets";
import { sendTicketEmail, createBulkTransport } from "@/lib/tickets/email";

export const maxDuration = 300;

// Gmail flags bursts as spam, so emails go out in small, spaced batches (same pacing as /api/emails/send).
// Max emails per call (Gmail's limit is ~100, so never above 80). 40 x ~4.5s is about 3 minutes.
const TICKETS_PER_BATCH = 40;
const DELAY_BETWEEN_INDIVIDUAL = 3000;
// Returned to the page, which waits this long before asking for the next batch.
const DELAY_BETWEEN_BATCHES = 10000;
// Stop starting new emails after this so the request finishes well inside maxDuration.
const EMAIL_BUDGET_MS = 180 * 1000;
// One write per ticket plus one per holder; Firestore batches cap at 500 writes.
const WRITES_PER_COMMIT = 200;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const stripHtml = (s) => String(s || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();

// Prefer the name typed into the form ("Name", "Full Name", "Nama Lengkap"...), else the account name.
function pickName(questions, answers, userDoc, email) {
  const nameQuestion = (questions || []).find(
    (q) => q.type === "text" && /^(full\s*)?(name|nama)\b/i.test(stripHtml(q.label))
  );
  const fromForm = nameQuestion && typeof answers?.[nameQuestion.id] === "string" ? answers[nameQuestion.id].trim() : "";
  return (fromForm || userDoc?.name || email || "Guest").slice(0, 80);
}

const submittedMillis = (r) => r.data().submittedAt?.toMillis?.() || 0;

/* Creates a ticket for every response that isn't declined and isn't covered by a ticket yet. */
async function issueMissingTickets(db, formId, form) {
  const [responses, holders, tickets] = await Promise.all([
    db.collection("forms").doc(formId).collection("responses").get(),
    db.collection("ticketHolders").where("formId", "==", formId).get(),
    db.collection("tickets").where("formId", "==", formId).select("responseId").get(),
  ]);

  const ticketedResponses = new Set(tickets.docs.map((d) => d.get("responseId")));
  const holderByUid = new Map(holders.docs.map((d) => [d.data().uid, d]));
  // uid -> that user's responses getting a ticket this run, oldest first so codes stay in submission order
  const todo = new Map();
  for (const r of [...responses.docs].sort((a, b) => submittedMillis(a) - submittedMillis(b))) {
    const { submittedBy: uid, ticketDeclined } = r.data();
    if (!uid || ticketDeclined) continue;
    const userHasTicket = holderCodes(holderByUid.get(uid)?.data()).length > 0 || todo.has(uid);
    if (responseHasTicket(form, r.id, ticketedResponses, userHasTicket)) continue;
    todo.set(uid, [...(todo.get(uid) || []), r]);
  }
  if (!todo.size) return 0;

  const uids = [...todo.keys()];
  const users = await db.getAll(...uids.map((uid) => db.collection("users").doc(uid)));
  const userByUid = new Map(uids.map((uid, i) => [uid, users[i].data()]));

  // A user's tickets and holder update go in the same commit, one write per ticket plus one for the holder.
  const commits = [[]];
  let writes = 0;
  for (const uid of uids) {
    const size = todo.get(uid).length + 1;
    if (writes + size > WRITES_PER_COMMIT && commits.at(-1).length) {
      commits.push([]);
      writes = 0;
    }
    commits.at(-1).push(uid);
    writes += size;
  }

  let issued = 0;
  for (const group of commits) {
    const batch = db.batch();
    for (const uid of group) {
      const userDoc = userByUid.get(uid);
      const codes = todo.get(uid).map((r) => {
        const { answers, userEmail } = r.data();
        const email = userEmail || userDoc?.email || "";
        const code = generateTicketCode();
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
        return code;
      });

      // Both writes fail the whole batch if another run touched this holder first, so a double click can't double-issue.
      const holder = holderByUid.get(uid);
      if (holder) {
        batch.update(
          holder.ref,
          { codes: [...holderCodes(holder.data()), ...codes], code: FieldValue.delete() },
          { lastUpdateTime: holder.updateTime }
        );
      } else {
        batch.create(holderRef(db, formId, uid), { codes, formId, uid });
      }
      issued += codes.length;
    }
    await batch.commit();
  }
  return issued;
}

/*
  POST { formId, retryFailed? }   (admin)
  Issues tickets to everyone not declined, then emails up to TICKETS_PER_BATCH pending tickets,
  spaced out to stay under Gmail's limits. The page waits `waitMs` and calls again while
  `remaining` > 0.
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
    const transport = createBulkTransport();

    try {
      for (const [i, doc] of pending.docs.slice(0, TICKETS_PER_BATCH).entries()) {
        if (Date.now() - started > EMAIL_BUDGET_MS) break;
        if (i > 0) await sleep(DELAY_BETWEEN_INDIVIDUAL);
        const ticket = doc.data();
        try {
          if (!ticket.email) throw new Error("No email address");
          const { qrPng, pdf } = await buildTicketFiles(ticket, event, cover);
          await sendTicketEmail({ to: ticket.email, ticket, event, qrPng, pdf, transport });
          await doc.ref.update({ emailStatus: "sent", emailSentAt: FieldValue.serverTimestamp(), emailError: null });
          sent++;
        } catch (err) {
          console.error("[tickets/issue] email failed", ticket.code, err);
          await doc.ref.update({ emailStatus: "failed", emailError: String(err.message || err).slice(0, 300) });
          failed++;
        }
      }
    } finally {
      transport.close();
    }

    const remaining = pending.size - sent - failed;
    return NextResponse.json({ issued, sent, failed, remaining, waitMs: remaining > 0 ? DELAY_BETWEEN_BATCHES : 0 });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[tickets/issue]", err);
    return NextResponse.json({ error: "Something went wrong issuing tickets." }, { status: 500 });
  }
}
