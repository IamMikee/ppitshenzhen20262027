import { createElement as h } from "react";
import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

const RED = "#7E0C0E";
const NOTCH = 22;

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", backgroundColor: "#ffffff", color: "#111827" },
  brand: { fontSize: 7, letterSpacing: 2, color: RED, fontFamily: "Helvetica-Bold", marginBottom: 14 },
  top: { paddingHorizontal: 26, paddingTop: 24, paddingBottom: 10 },
  head: { flexDirection: "row", marginBottom: 20 },
  cover: { width: 78, height: 78, borderRadius: 8, objectFit: "cover" },
  coverFallback: { width: 78, height: 78, borderRadius: 8, backgroundColor: RED, alignItems: "center", justifyContent: "center" },
  coverFallbackText: { color: "#ffffff", fontFamily: "Helvetica-Bold", fontSize: 14, letterSpacing: 1 },
  headText: { flex: 1, marginLeft: 16, justifyContent: "center" },
  event: { fontSize: 18, fontFamily: "Helvetica-Bold", lineHeight: 1.15, marginBottom: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: "50%", marginBottom: 14, paddingRight: 8 },
  label: { fontSize: 7.5, color: "#9ca3af", marginBottom: 3 },
  value: { fontSize: 10.5, lineHeight: 1.3 },
  tear: { height: NOTCH, justifyContent: "center", position: "relative" },
  tearLine: { marginHorizontal: NOTCH, borderTopWidth: 1.2, borderTopColor: "#9ca3af", borderTopStyle: "dashed" },
  notch: { position: "absolute", top: 0, width: NOTCH, height: NOTCH, borderRadius: NOTCH / 2, backgroundColor: RED },
  bottom: { alignItems: "center", paddingTop: 18, paddingHorizontal: 26 },
  qr: { width: 190, height: 190 },
  code: { fontSize: 10, fontFamily: "Helvetica-Bold", letterSpacing: 0.5, marginTop: 12 },
  notes: { fontSize: 7.5, color: "#6b7280", textAlign: "center", lineHeight: 1.5, marginTop: 14 },
});

function Field({ label, value }) {
  return h(View, { style: styles.cell }, h(Text, { style: styles.label }, label), h(Text, { style: styles.value }, value || "-"));
}

function TicketDocument({ ticket, event, qrDataUrl, cover }) {
  return h(
    Document,
    { title: `${event.eventName} ticket ${ticket.code}`, author: "PPIT Shenzhen" },
    h(
      Page,
      { size: [340, 575], style: styles.page },
      h(
        View,
        { style: styles.top },
        h(Text, { style: styles.brand }, "PPIT SHENZHEN · E-TICKET"),
        h(
          View,
          { style: styles.head },
          cover
            ? h(Image, { style: styles.cover, src: cover })
            : h(View, { style: styles.coverFallback }, h(Text, { style: styles.coverFallbackText }, "PPIT")),
          h(
            View,
            { style: styles.headText },
            h(Text, { style: styles.event }, event.eventName),
            h(Text, { style: styles.label }, "Attendee"),
            h(Text, { style: styles.value }, ticket.name)
          )
        ),
        h(
          View,
          { style: styles.grid },
          h(Field, { label: "Date", value: event.date }),
          h(Field, { label: "Time", value: event.time }),
          h(Field, { label: "Admit", value: "1 person" }),
          h(Field, { label: "Venue", value: event.venue })
        )
      ),
      h(
        View,
        { style: styles.tear },
        h(View, { style: styles.tearLine }),
        h(View, { style: [styles.notch, { left: -NOTCH / 2 }] }),
        h(View, { style: [styles.notch, { right: -NOTCH / 2 }] })
      ),
      h(
        View,
        { style: styles.bottom },
        h(Image, { style: styles.qr, src: qrDataUrl }),
        h(Text, { style: styles.code }, `TICKET CODE - ${ticket.code}`),
        h(Text, { style: styles.notes }, "Show this QR at the entrance. Valid for one entry only."),
        event.notes ? h(Text, { style: [styles.notes, { marginTop: 2 }] }, event.notes) : null
      )
    )
  );
}

export function renderTicketPdf({ ticket, event, qrDataUrl, cover }) {
  return renderToBuffer(h(TicketDocument, { ticket, event, qrDataUrl, cover }));
}
