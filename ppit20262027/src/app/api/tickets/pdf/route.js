import { NextResponse } from "next/server";
import { adminDb, requireUser, HttpError } from "@/lib/tickets/server";
import { eventFromForm, buildTicketFiles } from "@/lib/tickets/assets";

export const maxDuration = 30;

/* GET ?formId=... -> the logged-in user's ticket PDF for that form. */
export async function GET(req) {
  try {
    const authUser = await requireUser(req);
    const formId = new URL(req.url).searchParams.get("formId");
    if (!formId) throw new HttpError(400, "Missing formId");

    const db = adminDb();
    const holder = await db.collection("ticketHolders").doc(`${formId}_${authUser.uid}`).get();
    if (!holder.exists) throw new HttpError(404, "No ticket found.");

    const [ticketSnap, formSnap] = await Promise.all([
      db.collection("tickets").doc(holder.data().code).get(),
      db.collection("forms").doc(formId).get(),
    ]);
    const ticket = ticketSnap.data();
    const { pdf } = await buildTicketFiles(ticket, eventFromForm(formSnap.data() || {}));

    return new Response(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="ticket-${ticket.code}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[tickets/pdf]", err);
    return NextResponse.json({ error: "Could not create the PDF." }, { status: 500 });
  }
}
