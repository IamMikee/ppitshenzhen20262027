import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb, requireAdmin, HttpError, normalizeTicketCode, verifyTicketQrPayload } from "@/lib/tickets/server";

const fail = (err, label) => {
  if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
  console.error(`[tickets/check-in ${label}]`, err);
  return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
};

const millis = (ts) => ts?.toMillis?.() || null;

/*
  GET            -> ticketed forms with issued / checked-in counts, for the check-in page.
  GET ?formId=.. -> every ticket for that form (attendee list / CSV).
*/
export async function GET(req) {
  try {
    await requireAdmin(req);
    const db = adminDb();

    const formId = new URL(req.url).searchParams.get("formId");
    if (formId) {
      const snap = await db.collection("tickets").where("formId", "==", formId).get();
      const attendees = snap.docs
        .map((d) => {
          const t = d.data();
          return {
            code: t.code,
            uid: t.uid,
            name: t.name,
            email: t.email,
            registeredAt: millis(t.createdAt),
            checkedIn: t.checkedIn === true,
            checkedInAt: millis(t.checkedInAt),
            checkedInBy: t.checkedInBy || "",
            emailStatus: t.emailStatus || "",
          };
        })
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      return NextResponse.json({ attendees });
    }

    const forms = await db.collection("forms").where("ticket.enabled", "==", true).get();
    const tickets = db.collection("tickets");

    const result = await Promise.all(
      forms.docs.map(async (f) => {
        const [issued, checkedIn] = await Promise.all([
          tickets.where("formId", "==", f.id).count().get(),
          tickets.where("formId", "==", f.id).where("checkedIn", "==", true).count().get(),
        ]);
        return {
          id: f.id,
          title: f.data().ticket.eventName || f.data().title,
          issued: issued.data().count,
          checkedIn: checkedIn.data().count,
        };
      })
    );
    return NextResponse.json({ forms: result });
  } catch (err) {
    return fail(err, "GET");
  }
}

/*
  POST { formId, qr? | code?, undo? }
  Status: "ok" | "already" | "invalid" | "not_found" | "wrong_event" | "undone"
*/
export async function POST(req) {
  try {
    const staff = await requireAdmin(req);
    const { formId, qr, code: typedCode, undo = false } = await req.json();
    if (!formId) throw new HttpError(400, "Pick an event first.");

    const code = qr ? verifyTicketQrPayload(qr) : normalizeTicketCode(typedCode);
    if (!code) return NextResponse.json({ status: "invalid" });

    const db = adminDb();
    const ref = db.collection("tickets").doc(code);

    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return { status: "not_found", code };
      const t = snap.data();
      const ticket = {
        code,
        name: t.name,
        email: t.email,
        checkedInAt: t.checkedInAt?.toMillis?.() || null,
        checkedInBy: t.checkedInBy,
      };
      if (t.formId !== formId) return { status: "wrong_event", ticket };

      // Keeps the "attended" badge on the forms list in sync with check-in
      const userRef = db.collection("users").doc(t.uid);

      if (undo) {
        tx.update(ref, { checkedIn: false, checkedInAt: null, checkedInBy: null });
        tx.set(userRef, { attendedForms: FieldValue.arrayRemove(formId) }, { merge: true });
        return { status: "undone", ticket: { ...ticket, checkedInAt: null, checkedInBy: null } };
      }
      if (t.checkedIn) return { status: "already", ticket };

      tx.update(ref, { checkedIn: true, checkedInAt: FieldValue.serverTimestamp(), checkedInBy: staff.email || staff.uid });
      tx.set(userRef, { attendedForms: FieldValue.arrayUnion(formId) }, { merge: true });
      return { status: "ok", ticket: { ...ticket, checkedInAt: Date.now(), checkedInBy: staff.email || staff.uid } };
    });

    return NextResponse.json(result);
  } catch (err) {
    return fail(err, "POST");
  }
}
