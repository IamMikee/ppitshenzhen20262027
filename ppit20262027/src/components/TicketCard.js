"use client";

import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { ArrowLeft, AlertCircle, CheckCircle, Clock, RefreshCw } from "lucide-react";
import { auth } from "../lib/firebase";
import { coverThumbUrl } from "../lib/tickets/cover";

async function authedFetch(url, options = {}) {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(url, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Request failed");
  }
  return res;
}

const requestTickets = async (formId, resendCode = null) =>
  (
    await authedFetch("/api/tickets/mine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ formId, resendCode }),
    })
  ).json();

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-[11px] text-gray-400 mb-0.5">{label}</dt>
      <dd className="text-sm text-gray-900 leading-snug">{value || "-"}</dd>
    </div>
  );
}

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

/* One issued ticket: the pass itself, its PDF download and its email status. */
function TicketPass({ ticket, event, cover, label, error, downloading, resending, resendDisabled, onDownload, onResend }) {
  return (
    <div>
      <div className="bg-white rounded-2xl shadow-2xl">
        <div className="px-6 pt-6 pb-2">
          <p className="text-[10px] font-bold tracking-[0.2em] text-[#7E0C0E] mb-4">PPIT SHENZHEN · E-TICKET{label}</p>
          <div className="flex items-center gap-4 mb-6">
            {cover ? (
              <img src={cover} alt="" className="w-20 h-20 rounded-lg object-cover flex-shrink-0 shadow-sm" />
            ) : (
              <div className="w-20 h-20 rounded-lg bg-[#7E0C0E] flex-shrink-0 flex items-center justify-center text-white font-bold tracking-wider">
                PPIT
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-gray-900 leading-tight mb-2 break-words">{event.eventName}</h2>
              <p className="text-[11px] text-gray-400">Attendee</p>
              <p className="text-sm text-gray-900 break-words">{ticket.name}</p>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4 pb-4">
            <Field label="Date" value={event.date} />
            <Field label="Time" value={event.time} />
            <Field label="Admit" value="1 person" />
            <Field label="Venue" value={event.venue} />
          </dl>
        </div>

        {/* Tear line with notches cut out of the card edges */}
        <div className="relative h-6 flex items-center" aria-hidden="true">
          <span className="absolute -left-3 w-6 h-6 rounded-full bg-[#7E0C0E]" />
          <div className="mx-5 w-full border-t-2 border-dashed border-gray-300" />
          <span className="absolute -right-3 w-6 h-6 rounded-full bg-[#7E0C0E]" />
        </div>

        <div className="px-6 pt-5 pb-6 flex flex-col items-center">
          <QRCode value={ticket.qrPayload} size={200} level="M" />
          <p className="mt-4 text-sm font-semibold text-gray-900 tracking-wide">
            TICKET CODE - <span className="font-mono">{ticket.code}</span>
          </p>
          {ticket.checkedIn ? (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-green-600">
              <CheckCircle size={14} /> Checked in
            </p>
          ) : (
            <p className="mt-2 text-xs text-gray-500 text-center">Show this QR at the entrance. Valid for one entry only.</p>
          )}
        </div>
      </div>

      <button
        onClick={onDownload}
        disabled={downloading}
        className="mt-6 block mx-auto text-white font-semibold underline underline-offset-4 hover:opacity-80 disabled:opacity-50"
      >
        {downloading ? "Preparing PDF..." : "Download this ticket"}
      </button>

      <div className="mt-5 text-center text-xs text-white/70 leading-relaxed">
        {ticket.emailStatus === "sent" ? (
          <p>
            A copy was emailed to <span className="text-white">{ticket.email}</span>. Check your spam folder if you
            can&apos;t find it.
          </p>
        ) : ticket.emailStatus === "pending" ? (
          <p>A copy is on its way to <span className="text-white">{ticket.email}</span>.</p>
        ) : (
          <p className="text-amber-200">We couldn&apos;t email this ticket yet. Download or screenshot it instead.</p>
        )}
        {ticket.emailError && <p className="text-amber-200 mt-1">{ticket.emailError}</p>}
        {error && <p className="text-amber-200 mt-1">{error}</p>}
        {ticket.emailStatus !== "pending" && (
          <button
            onClick={onResend}
            disabled={resendDisabled}
            className="mt-2 inline-flex items-center gap-1.5 font-semibold text-white hover:underline disabled:opacity-50"
          >
            <RefreshCw size={12} className={resending ? "animate-spin" : ""} /> Resend email
          </button>
        )}
      </div>
    </div>
  );
}

/*
  Shows the logged-in user's tickets for a ticketed form (one per approved response on
  multi-response forms), or that they haven't been issued yet.
*/
export default function TicketCard({ formId, heading, onBack, onSubmitAnother }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  // Code of the ticket being resent / downloaded, and where the last download error belongs
  const [resending, setResending] = useState(null);
  const [downloading, setDownloading] = useState(null);
  const [downloadError, setDownloadError] = useState({ code: null, message: "" });

  const load = async (resendCode = null) => {
    setBusy(true);
    setResending(resendCode);
    setError("");
    try {
      setData(await requestTickets(formId, resendCode));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      setResending(null);
    }
  };

  const download = async (code) => {
    setDownloading(code);
    setDownloadError({ code: null, message: "" });
    try {
      const params = new URLSearchParams({ formId, code });
      const blob = await (await authedFetch(`/api/tickets/pdf?${params}`)).blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ticket-${code}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      setDownloadError({ code, message: err.message });
    } finally {
      setDownloading(null);
    }
  };

  const submitAnotherButton = onSubmitAnother && (
    <button
      onClick={onSubmitAnother}
      className="mt-6 block mx-auto px-6 py-2.5 bg-white text-[#7E0C0E] rounded-lg font-semibold text-sm shadow-md hover:bg-gray-100 transition-all duration-200"
    >
      Submit another response
    </button>
  );

  useEffect(() => {
    load();
  }, [formId]);

  const event = data?.event;
  const cover = coverThumbUrl(event?.coverImage, 240);
  const tickets = data?.tickets || [];

  return (
    <div className="min-h-screen bg-[#7E0C0E] px-4 pt-24 pb-12 font-montserrat">
      <div className="max-w-sm mx-auto">
        <button onClick={onBack} className="flex items-center gap-3 text-white mb-6 hover:opacity-80">
          <ArrowLeft size={20} />
          <span className="font-medium">{tickets.length > 1 ? `My Tickets (${tickets.length})` : "My Ticket"}</span>
        </button>

        {data && data.status !== "issued" && (
          <>
            <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
              {data.status === "pending" ? (
                <>
                  <Clock size={40} className="text-[#7E0C0E] mx-auto mb-3" />
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    {data.awaiting > 1 ? `${data.awaiting} registrations received` : "Registration received"}
                  </h2>
                  <p className="text-gray-600 text-sm mb-1">
                    The committee is reviewing registrations for {event?.eventName || heading}.
                  </p>
                  <p className="text-gray-400 text-sm">
                    Once approved, {data.awaiting > 1 ? "your tickets" : "your ticket"} will be emailed to you and shown on this page.
                  </p>
                </>
              ) : (
                <>
                  <AlertCircle size={40} className="text-gray-400 mx-auto mb-3" />
                  <h2 className="text-xl font-bold text-gray-900 mb-2">No ticket for this event</h2>
                  <p className="text-gray-600 text-sm">
                    Unfortunately we couldn&apos;t offer you a ticket for {event?.eventName || heading}. If you think
                    this is a mistake, please contact PPIT Shenzhen.
                  </p>
                </>
              )}
            </div>
            {submitAnotherButton}
          </>
        )}

        {!data && (
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            {busy ? (
              <>
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-[#7E0C0E] border-t-transparent"></div>
                <p className="mt-3 text-gray-500 text-sm">Preparing your ticket for {heading}...</p>
              </>
            ) : (
              <>
                <AlertCircle size={40} className="text-red-500 mx-auto mb-3" />
                <p className="text-gray-700 mb-1">Your response was saved, but we could not load your ticket.</p>
                <p className="text-gray-400 text-sm mb-5">{error}</p>
                <button
                  onClick={() => load()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7E0C0E] text-white rounded-lg hover:bg-[#9E1A1C]"
                >
                  <RefreshCw size={16} /> Try again
                </button>
              </>
            )}
          </div>
        )}

        {data?.status === "issued" && (
          <>
            <div className="space-y-10">
              {tickets.map((ticket, i) => (
                <TicketPass
                  key={ticket.code}
                  ticket={ticket}
                  event={event}
                  cover={cover}
                  label={tickets.length > 1 ? ` · ${i + 1} OF ${tickets.length}` : ""}
                  error={downloadError.code === ticket.code ? downloadError.message : ""}
                  downloading={downloading === ticket.code}
                  resending={resending === ticket.code}
                  resendDisabled={busy}
                  onDownload={() => download(ticket.code)}
                  onResend={() => load(ticket.code)}
                />
              ))}
            </div>

            {(data.awaiting > 0 || data.declined > 0) && (
              <div className="mt-8 rounded-xl border border-white/30 px-4 py-3 text-center text-xs text-white/80 leading-relaxed">
                {data.awaiting > 0 && (
                  <p className="flex items-center justify-center gap-1.5">
                    <Clock size={12} /> {plural(data.awaiting, "more registration")} still being reviewed. New tickets
                    will show up here.
                  </p>
                )}
                {data.declined > 0 && (
                  <p className={data.awaiting > 0 ? "mt-1" : ""}>
                    {plural(data.declined, "registration")} couldn&apos;t be offered a ticket.
                  </p>
                )}
              </div>
            )}

            {error && <p className="mt-4 text-center text-xs text-amber-200">{error}</p>}

            {submitAnotherButton}
          </>
        )}
      </div>
    </div>
  );
}
