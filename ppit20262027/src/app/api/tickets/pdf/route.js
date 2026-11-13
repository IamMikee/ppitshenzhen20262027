import { NextResponse } from "next/server";
import { adminDb, requireUser, HttpError, normalizeTicketCode } from "@/lib/tickets/server";
import { eventFromForm, buildTicketFiles } from "@/lib/tickets/assets";

export const maxDuration = 30;

/* GET ?formId=...&code=... -> the PDF of one of the logged-in user's tickets for that form. */
export async function GET(req) {
  try {
    const authUser = await requireUser(req);
    const params = new URL(req.url).searchParams;
    const formId = params.get("formId");
    const code = normalizeTicketCode(params.get("code"));
    if (!formId || !code) throw new HttpError(400, "Missing formId or code");

    const db = adminDb();
    const [ticketSnap, formSnap] = await Promise.all([
      db.collection("tickets").doc(code).get(),
      db.collection("forms").doc(formId).get(),
    ]);
    const ticket = ticketSnap.data();
    if (ticket?.uid !== authUser.uid || ticket.formId !== formId) throw new HttpError(404, "No ticket found.");
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
