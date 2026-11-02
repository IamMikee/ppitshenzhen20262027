import { NextResponse } from "next/server";
import { adminDb, requireAdmin, HttpError } from "@/lib/tickets/server";

/*
  POST { formId, responseId, declined }   (admin)
  Marks a response as declined (no ticket when tickets are issued) or undoes that.
  Only possible before that person has a ticket.
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

    const holder = await db.collection("ticketHolders").doc(`${formId}_${response.submittedBy}`).get();
    if (holder.exists) throw new HttpError(409, "This person already has a ticket.");

    await responseRef.update({ ticketDeclined: declined });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[tickets/review]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
