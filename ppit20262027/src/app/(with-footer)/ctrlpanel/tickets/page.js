"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";
import { Camera, CameraOff, Download, RefreshCw, Undo2 } from "lucide-react";
import { auth } from "../../../../lib/firebase";

async function api(method, body, query = "") {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(`/api/tickets/check-in${query}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

const RESULT_STYLES = {
  ok: { box: "bg-green-600", title: "Checked in" },
  undone: { box: "bg-gray-600", title: "Check-in undone" },
  already: { box: "bg-amber-500", title: "Already checked in" },
  wrong_event: { box: "bg-red-600", title: "Ticket for a different event" },
  not_found: { box: "bg-red-600", title: "Ticket not found" },
  invalid: { box: "bg-red-600", title: "Not a valid ticket QR" },
  error: { box: "bg-red-600", title: "Error" },
};

const formatTime = (ms) =>
  ms ? new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

const formatDateTime = (ms) => (ms ? new Date(ms).toLocaleString("en-GB") : "");

function downloadCsv(title, attendees) {
  const header = ["Name", "Email", "Ticket code", "Registered at", "Checked in", "Checked in at", "Checked in by", "Email status"];
  const rows = attendees.map((a) => [
    a.name,
    a.email,
    a.code,
    formatDateTime(a.registeredAt),
    a.checkedIn ? "Yes" : "No",
    formatDateTime(a.checkedInAt),
    a.checkedInBy,
    a.emailStatus,
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
  // BOM so Excel opens names with accents correctly
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/[^\w-]+/g, "_")}_attendees_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

const FILTERS = [
  ["all", "All"],
  ["in", "Checked in"],
  ["out", "Not yet"],
];

function beep(ok) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.frequency.value = ok ? 880 : 220;
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (ok ? 0.12 : 0.4));
  } catch {}
}

export default function TicketCheckInPage() {
  const [forms, setForms] = useState([]);
  const [formId, setFormId] = useState("");
  const [loadError, setLoadError] = useState("");
  const [result, setResult] = useState(null);
  const [typedCode, setTypedCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [attendees, setAttendees] = useState(null);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const lastScanRef = useRef({ text: "", at: 0 });
  const busyRef = useRef(false);

  const loadForms = useCallback(async () => {
    try {
      const data = await api("GET");
      setForms(data.forms);
      setFormId((current) => current || data.forms[0]?.id || "");
      setLoadError("");
    } catch (err) {
      setLoadError(err.message);
    }
  }, []);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => u && loadForms());
    return () => unsub();
  }, [loadForms]);

  const loadAttendees = async () => {
    if (!formId) return;
    setListLoading(true);
    setListError("");
    try {
      const data = await api("GET", null, `?formId=${encodeURIComponent(formId)}`);
      setAttendees(data.attendees);
      // Keep the counter in step with the list we just fetched
      setForms((prev) =>
        prev.map((f) =>
          f.id === formId
            ? { ...f, issued: data.attendees.length, checkedIn: data.attendees.filter((a) => a.checkedIn).length }
            : f
        )
      );
      return data.attendees;
    } catch (err) {
      setListError(err.message);
    } finally {
      setListLoading(false);
    }
  };

  const submit = useCallback(
    async (payload) => {
      if (!formId || busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      try {
        const data = await api("POST", { formId, ...payload });
        setResult(data);
        beep(data.status === "ok");
        if (data.status === "ok" || data.status === "undone") {
          setForms((prev) =>
            prev.map((f) => (f.id === formId ? { ...f, checkedIn: f.checkedIn + (data.status === "ok" ? 1 : -1) } : f))
          );
          setAttendees((prev) =>
            prev?.map((a) =>
              a.code === data.ticket.code
                ? { ...a, checkedIn: data.status === "ok", checkedInAt: data.ticket.checkedInAt, checkedInBy: data.ticket.checkedInBy || "" }
                : a
            )
          );
        }
      } catch (err) {
        setResult({ status: "error", message: err.message });
        beep(false);
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [formId]
  );

  const stopCamera = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setScanning(false);
  };

  const startCamera = async () => {
    setCameraError("");
    try {
      const reader = new BrowserQRCodeReader();
      controlsRef.current = await reader.decodeFromConstraints(
        { video: { facingMode: "environment" } },
        videoRef.current,
        (res) => {
          if (!res) return;
          const text = res.getText();
          const now = Date.now();
          // Ignore the same QR held in front of the camera for a few seconds
          if (text === lastScanRef.current.text && now - lastScanRef.current.at < 4000) return;
          lastScanRef.current = { text, at: now };
          submitRef.current({ qr: text });
        }
      );
      setScanning(true);
    } catch (err) {
      setCameraError(`Could not open the camera: ${err.message}`);
    }
  };

  // The camera callback is created once, so it reads the latest submit (and formId) through a ref.
  const submitRef = useRef(submit);
  useEffect(() => {
    submitRef.current = submit;
  }, [submit]);

  useEffect(() => () => controlsRef.current?.stop(), []);

  const current = forms.find((f) => f.id === formId);
  const style = result && RESULT_STYLES[result.status];
  const needle = search.trim().toLowerCase();
  const shown = (attendees || []).filter(
    (a) =>
      (filter === "all" || (filter === "in") === a.checkedIn) &&
      (!needle || [a.name, a.email, a.code].some((v) => v?.toLowerCase().includes(needle)))
  );

  return (
    <div className="font-montserrat text-white max-w-xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-semibold">Ticket Check-in</h1>
        <button onClick={loadForms} className="text-gray-400 hover:text-white" title="Refresh counts">
          <RefreshCw size={18} />
        </button>
      </div>

      {loadError && <p className="bg-red-900/40 border border-red-700 rounded-lg p-3 mb-4 text-sm">{loadError}</p>}

      {forms.length === 0 && !loadError ? (
        <p className="text-gray-400">No ticketed forms yet. Turn on &quot;E-Ticket&quot; in a form&apos;s builder.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <select
              value={formId}
              onChange={(e) => {
                setFormId(e.target.value);
                setResult(null);
                setAttendees(null);
              }}
              className="flex-1 min-w-0 bg-[#1e1e1e] border border-gray-700 rounded-lg px-3 py-2"
            >
              {forms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.title}
                </option>
              ))}
            </select>
            {current && (
              <span className="text-sm text-gray-300">
                <b className="text-white text-lg">{current.checkedIn}</b> / {current.issued} checked in
              </span>
            )}
          </div>

          <div className="relative bg-black rounded-xl overflow-hidden mb-4" style={{ aspectRatio: "1" }}>
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
            {!scanning && (
              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  onClick={startCamera}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-purple-600 rounded-lg hover:bg-purple-700"
                >
                  <Camera size={18} /> Start scanning
                </button>
              </div>
            )}
            {busy && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
              </div>
            )}
          </div>
          {cameraError && <p className="text-red-400 text-sm mb-4">{cameraError}</p>}
          {scanning && (
            <button onClick={stopCamera} className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-4">
              <CameraOff size={16} /> Stop camera
            </button>
          )}

          {result && style && (
            <div className={`${style.box} rounded-xl p-5 mb-6`}>
              <p className="text-2xl font-bold">{style.title}</p>
              {result.ticket && (
                <>
                  <p className="text-xl mt-2">{result.ticket.name}</p>
                  <p className="text-sm opacity-90 font-mono">
                    {result.ticket.code} · {result.ticket.email}
                  </p>
                  {result.status === "already" && (
                    <p className="text-sm mt-2">
                      at {formatTime(result.ticket.checkedInAt)} by {result.ticket.checkedInBy}
                    </p>
                  )}
                  {result.status === "ok" && (
                    <button
                      onClick={() => submit({ code: result.ticket.code, undo: true })}
                      className="mt-3 inline-flex items-center gap-1.5 text-sm underline opacity-90"
                    >
                      <Undo2 size={14} /> Undo
                    </button>
                  )}
                </>
              )}
              {result.status === "not_found" && <p className="font-mono mt-1">{result.code}</p>}
              {result.message && <p className="text-sm mt-1">{result.message}</p>}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (typedCode.trim()) submit({ code: typedCode });
              setTypedCode("");
            }}
            className="flex gap-2"
          >
            <input
              value={typedCode}
              onChange={(e) => setTypedCode(e.target.value.toUpperCase())}
              placeholder="Or type ticket code"
              className="flex-1 min-w-0 bg-[#1e1e1e] border border-gray-700 rounded-lg px-3 py-2 font-mono tracking-widest uppercase"
            />
            <button type="submit" disabled={busy} className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50">
              Check in
            </button>
          </form>

          {/* Attendee list */}
          <div className="mt-10 border-t border-gray-700 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-xl font-semibold">Attendees</h2>
              <div className="flex gap-2">
                <button
                  onClick={loadAttendees}
                  disabled={listLoading || !formId}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-[#1e1e1e] border border-gray-700 rounded-lg hover:bg-gray-700 disabled:opacity-50"
                >
                  <RefreshCw size={14} className={listLoading ? "animate-spin" : ""} />
                  {attendees ? "Refresh" : "Show list"}
                </button>
                <button
                  onClick={async () => {
                    const list = await loadAttendees();
                    if (list) downloadCsv(current?.title || "event", list);
                  }}
                  disabled={listLoading || !formId}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  <Download size={14} /> Download CSV
                </button>
              </div>
            </div>

            {listError && <p className="text-red-400 text-sm mb-3">{listError}</p>}

            {attendees && (
              <>
                <div className="flex flex-wrap gap-2 mb-3">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name, email or code"
                    className="flex-1 min-w-0 bg-[#1e1e1e] border border-gray-700 rounded-lg px-3 py-2 text-sm"
                  />
                  <div className="flex rounded-lg border border-gray-700 overflow-hidden text-sm">
                    {FILTERS.map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => setFilter(key)}
                        className={`px-3 py-2 ${filter === key ? "bg-purple-600" : "bg-[#1e1e1e] hover:bg-gray-700"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-gray-400 mb-2">
                  Showing {shown.length} of {attendees.length}
                </p>
                <div className="overflow-x-auto rounded-lg border border-gray-700">
                  <table className="w-full text-sm">
                    <thead className="bg-[#1e1e1e] text-gray-400 text-left">
                      <tr>
                        <th className="px-3 py-2 font-medium">Name</th>
                        <th className="px-3 py-2 font-medium">Code</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shown.map((a) => (
                        <tr key={a.code} className="border-t border-gray-800">
                          <td className="px-3 py-2">
                            <div>{a.name}</div>
                            <div className="text-xs text-gray-500 break-all">{a.email}</div>
                          </td>
                          <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{a.code}</td>
                          <td className="px-3 py-2 text-xs whitespace-nowrap">
                            {a.checkedIn ? (
                              <span className="text-green-400">✓ {formatTime(a.checkedInAt)}</span>
                            ) : (
                              <span className="text-gray-500">Not yet</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {shown.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-3 py-6 text-center text-gray-500">
                            No one matches.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
