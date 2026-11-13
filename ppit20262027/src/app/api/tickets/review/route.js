import { NextResponse } from "next/server";
import { adminDb, requireAdmin, HttpError, holderRef, holderCodes, responseHasTicket } from "@/lib/tickets/server";

/*
  POST { formId, responseId, declined }   (admin)
  Marks a response as declined (no ticket when tickets are issued) or undoes that.
  Only possible before that response has a ticket.
*/
export async function POST(req) {
  try {
    await requireAdmin(req);
    const { formId, responseId, declined } = await req.json();
    if (!formId || !responseId || typeof declined !== "boolean") throw new HttpError(400, "Missing formId, responseId or declined");

    const db = adminDb();
    const responseRef = db.collection("forms").doc(formId).collection("responses").doc(responseId);
    const response = (await responseRef.get()).data();
    if (!response) throw new HttpError(404, "Response not found.");

    const [form, holder, ticketsFromResponse] = await Promise.all([
      db.collection("forms").doc(formId).get(),
      holderRef(db, formId, response.submittedBy).get(),
      db.collection("tickets").where("formId", "==", formId).where("responseId", "==", responseId).limit(1).get(),
    ]);
    const ticketed = new Set(ticketsFromResponse.empty ? [] : [responseId]);
    if (responseHasTicket(form.data() || {}, responseId, ticketed, holderCodes(holder.data()).length > 0)) {
      throw new HttpError(409, "This response already has a ticket.");
    }

    await responseRef.update({ ticketDeclined: declined });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[tickets/review]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
