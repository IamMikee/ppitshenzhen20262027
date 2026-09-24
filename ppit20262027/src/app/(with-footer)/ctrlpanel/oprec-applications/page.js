"use client";
import { useState, useEffect } from "react";
import { auth, db } from "../../../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, doc, updateDoc, getDoc, writeBatch } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";

const DIVISIONS = [
  { name: "Dana Usaha", code: "DU" },
  { name: "Departemen Olahraga", code: "DO" },
  { name: "Hubungan Masyarakat", code: "HM" },
  { name: "Informasi Teknologi", code: "IT" },
  { name: "Media Kreatif", code: "MK" },
  { name: "Perkembangan Karir & Akademik", code: "PKA" },
  { name: "Sosial Budaya", code: "SB" },
];

const STAGES = [
  { index: 0, label: "Form", emoji: "📝" },
  { index: 1, label: "Written Test", emoji: "✍️" },
  { index: 2, label: "Interview", emoji: "🎤" },
  { index: 3, label: "Accepted", emoji: "🎉" },
  { index: 4, label: "Rejected", emoji: "❌" },
];

const universityChecks = {
  cuhksz: (name) => {
    const lower = name.toLowerCase();
    return /^(the|c)/.test(lower) || /chinese/.test(lower) || /cuhk/.test(lower);
  },
  hitsz: (name) => {
    const lower = name.toLowerCase();
    return /^h/.test(lower) || /hitsz/.test(lower) || /harbin/.test(lower);
  },
  sustech: (name) => {
    const lower = name.toLowerCase();
    return /sustech/.test(lower) || /southern/.test(lower);
  },
  tsinghua: (name) => {
    const lower = name.toLowerCase();
    return /tsinghua/.test(lower) || /qinghua/.test(lower) || /清华/.test(lower);
  },
  shenda: (name) => {
    const lower = name.toLowerCase();
    if (/^(the|t|c)/.test(lower) || /chinese/.test(lower) || /cuhk/.test(lower)) return false;
    if (/^h/.test(lower) || /hitsz/.test(lower) || /harbin/.test(lower)) return false;
    if (/sustech/.test(lower) || /southern/.test(lower)) return false;
    if (/tsinghua/.test(lower) || /qinghua/.test(lower)) return false;
    return /shenzhen/.test(lower) || /szu/.test(lower) || /shenda/.test(lower);
  }
};

const UNIVERSITY_FILTERS = [
  { label: "CUHKSZ", value: "cuhksz", check: universityChecks.cuhksz },
  { label: "HITSZ", value: "hitsz", check: universityChecks.hitsz },
  { label: "SUSTech", value: "sustech", check: universityChecks.sustech },
  { label: "Tsinghua", value: "tsinghua", check: universityChecks.tsinghua },
  { label: "Shenda (SZU)", value: "shenda", check: universityChecks.shenda },
  {
    label: "Others",
    value: "others",
    check: (name) => {
      return !Object.values(universityChecks).some(check => check(name));
    }
  },
];

// ─── INTERVIEW SLOT CONFIG ──────────────────────────────────
const INTERVIEW_DAYS = [
  { venueId: 'utown', venueLabel: 'UTOWN', dayId: '2026-09-19', dayLabel: 'Sat, 19 Sep 2026' },
  { venueId: 'utown', venueLabel: 'UTOWN', dayId: '2026-09-20', dayLabel: 'Sun, 20 Sep 2026' },
  { venueId: 'cuhksz', venueLabel: 'CUHKSZ', dayId: '2026-09-21', dayLabel: 'Mon, 21 Sep 2026' },
  { venueId: 'cuhksz', venueLabel: 'CUHKSZ', dayId: '2026-09-22', dayLabel: 'Tue, 22 Sep 2026' },
];

const INTERVIEW_HOURS = [16, 17, 19, 20, 21];

const buildSlotId = (venueId, dayId, hour) =>
  `${venueId}_${dayId.replace(/-/g, "")}_${String(hour).padStart(2, "0")}00`;

const formatHour = (h) => `${String(h).padStart(2, "0")}:00`;

const STAGE_STATUS_FILTERS = [
  { label: "Form", value: "0", stageIndex: 0 },
  { label: "Written Test", value: "1", stageIndex: 1 },
  { label: "Interview", value: "2", stageIndex: 2 },
  { label: "Accepted", value: "3", stageIndex: 3 },
];

// Returns 'completed' | 'pending' | 'locked' | 'rejected' | 'unknown'
// Handles invalid input and capitalization issues; in case they come head capitalized
const normalizeStatus = (raw) => {
  if (!raw) return "unknown";
  return String(raw).toLowerCase();
};

export default function AdminApplications() {
  const [applications, setApplications] = useState([]);
  const [filteredApplications, setFilteredApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filterType, setFilterType] = useState(null);
  const [selectedDivision, setSelectedDivision] = useState("");
  const [selectedUniversity, setSelectedUniversity] = useState("");
  const [testFilter, setTestFilter] = useState("");
  const [interviewDayKey, setInterviewDayKey] = useState("");
  const [interviewHour, setInterviewHour] = useState("");
  const [interviewManualOnly, setInterviewManualOnly] = useState(false);
  const [stageStatusFilter, setStageStatusFilter] = useState("");
  const [acceptedAsFilter, setAcceptedAsFilter] = useState("");
  const [exporting, setExporting] = useState(false);
  const [pushing, setPushing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const userRef = doc(db, "users", u.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().admin === true) {
          setIsAdmin(true);
          await fetchApplications();
        } else {
          router.push("/");
        }
      } else {
        router.push("/login");
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [
    applications,
    filterType,
    selectedDivision,
    selectedUniversity,
    testFilter,
    interviewDayKey,
    interviewHour,
    interviewManualOnly,
    stageStatusFilter,
    acceptedAsFilter,
  ]);

  const fetchApplications = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "applications"));
      const apps = [];
      querySnapshot.forEach((doc) => {
        apps.push({ id: doc.id, ...doc.data() });
      });
      setApplications(apps);
      setFilteredApplications(apps);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching applications:", error);
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...applications];

    // Division filter
    if (filterType && selectedDivision) {
      filtered = filtered.filter((app) => {
        const choice = filterType === 'firstChoice' ? app.firstChoice : app.secondChoice;
        return choice === selectedDivision;
      });
    }

    // University filter
    if (selectedUniversity) {
      const filter = UNIVERSITY_FILTERS.find(f => f.value === selectedUniversity);
      if (filter) {
        filtered = filtered.filter((app) => {
          const uniName = app.university || "";
          return filter.check(uniName);
        });
      }
    }

    // Test submission filter
    if (testFilter === "submitted") {
      filtered = filtered.filter((app) => !!app.testUrl);
    } else if (testFilter === "not_submitted") {
      filtered = filtered.filter((app) => !app.testUrl);
    }

    // Interview slot filter
    if (interviewManualOnly) {
      filtered = filtered.filter(
        (app) => app.interview?.dayId && !app.interview?.slotId
      ); // Only have dayId but not slotId
    } else if (interviewHour) {
      if (interviewHour === "none") {
        filtered = filtered.filter((app) => !app.interview?.slotId && !app.interview?.dayId && app.currentStage !== 4);
      } else if (interviewHour === "any" && interviewDayKey) {
        const [venueId, dayId] = interviewDayKey.split("|");
        const dayPrefix = `${venueId}_${dayId.replace(/-/g, "")}_`;
        filtered = filtered.filter((app) => {
          const slotId = app.interview?.slotId;
          return slotId && slotId.startsWith(dayPrefix);
        });
      } else if (interviewDayKey && interviewHour !== "any") {
        const [venueId, dayId] = interviewDayKey.split("|");
        const targetSlot = buildSlotId(venueId, dayId, Number(interviewHour));
        filtered = filtered.filter((app) => app.interview?.slotId === targetSlot);
      }
    } else if (interviewDayKey) {
      const [venueId, dayId] = interviewDayKey.split("|");
      const dayPrefix = `${venueId}_${dayId.replace(/-/g, "")}_`;
      filtered = filtered.filter((app) => {
        const slotId = app.interview?.slotId;
        return slotId && slotId.startsWith(dayPrefix);
      });
    }

    // Stage status filter: match stageStatus == "completed"
    if (stageStatusFilter !== "") {
      const idx = Number(stageStatusFilter);
      filtered = filtered.filter((app) => {
        const status = app.stageStatus || {};

        if (app.currentStage === 4) return false;

        if (normalizeStatus(status[idx]) !== "completed") return false;

        if (idx === 3) return true;

        const next = status[idx + 1];
        if (next === undefined || next === null) return false;

        return normalizeStatus(next) === "pending";
      });
    }

    // AcceptedAs filter
    if (acceptedAsFilter) {
      filtered = filtered.filter((app) => app.acceptedAs === acceptedAsFilter && app.currentStage !== 4);
    }

    setFilteredApplications(filtered);
  };

  const exportEmails = async () => {
    setExporting(true);
    try {
      const dataToExport = filteredApplications.length > 0 ? filteredApplications : applications;
      const emails = [];
      dataToExport.forEach((app) => {
        if (app.email && app.currentStage != 4) emails.push(app.email);
      });
      if (emails.length === 0) {
        alert("No emails found to export.");
        setExporting(false);
        return;
      }
      const csvContent = emails.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `candidate_emails_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      alert(`✅ Exported ${emails.length} emails successfully!`);
    } catch (error) {
      console.error("Error exporting emails:", error);
      alert("Failed to export emails. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const pushAllChanges = async () => {
    const confirmed = window.confirm(
      `⚠️ PUSH ALL CHANGES\n\nThis will apply ALL pending stage changes to ALL applicants.\n\n• Applicants with 'rejected' in stageStatus → currentStage = 4\n• Applicants with stage 3 'completed' → currentStage = 3\n• Applicants with stage 2 'completed' → currentStage = 2\n• Applicants with stage 1 'completed' → currentStage = 1\n• All others remain at currentStage 0\n\nThis action CANNOT be undone. Are you sure?`
    );

    if (!confirmed) return;

    setPushing(true);
    try {
      const batch = writeBatch(db);
      let updatedCount = 0;

      applications.forEach((app) => {
        const status = app.stageStatus || {};
        let newStage = 0;

        if (Object.values(status).some(s => normalizeStatus(s) === 'rejected')) {
          newStage = 4;
        } else if (normalizeStatus(status[3]) === 'completed') {
          newStage = 3;
        } else if (normalizeStatus(status[2]) === 'completed') {
          newStage = 2;
        } else if (normalizeStatus(status[1]) === 'completed') {
          newStage = 1;
        } else {
          newStage = 0;
        }

        if (app.currentStage !== newStage) {
          const appRef = doc(db, "applications", app.id);
          batch.update(appRef, {
            currentStage: newStage,
            updatedAt: new Date().toISOString()
          });
          updatedCount++;
        }
      });

      await batch.commit();
      await fetchApplications();
      alert(`✅ Successfully pushed changes to ${updatedCount} applicants!`);
    } catch (error) {
      console.error("Error pushing changes:", error);
      alert("Failed to push changes. Please try again.");
    } finally {
      setPushing(false);
    }
  };

  const getStatusBadge = (status) => {
    const norm = normalizeStatus(status);
    const styles = {
      completed: "bg-green-100 text-green-700",
      pending: "bg-amber-100 text-amber-700",
      locked: "bg-gray-100 text-gray-500",
      rejected: "bg-red-100 text-red-700",
      unknown: "bg-gray-100 text-gray-400",
    };
    const labels = {
      completed: "✅ Completed",
      pending: "📋 Pending",
      locked: "🔒 Locked",
      rejected: "❌ Rejected",
      unknown: "—",
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[norm] || styles.unknown}`}>
        {labels[norm] || status}
      </span>
    );
  };

  // UNSAVED CHANGES DETECTION
  // Compares stageStatus (admin draft) against currentStage (what user sees).
  const hasUnsavedChanges = (app) => {
    const status = app.stageStatus || {};
    let derived = 0;

    if (Object.values(status).some(s => normalizeStatus(s) === 'rejected')) {
      derived = 4;
    } else if (normalizeStatus(status[3]) === 'completed') {
      derived = 3;
    } else if (normalizeStatus(status[2]) === 'completed') {
      derived = 2;
    } else if (normalizeStatus(status[1]) === 'completed') {
      derived = 1;
    }

    return derived !== (app.currentStage ?? 0);
  };

  // INTERVIEW CELL
  const renderInterviewCell = (app) => {
    const iv = app.interview;

    // Prefer slotId when present (self-booked)
    if (iv?.slotId) {
      return (
        <span className="text-purple-700 font-medium">
          {iv.dayLabel?.split(",")[0] || iv.dayId}
          {' · '}
          {iv.hourLabel}
        </span>
      );
    }

    // Manually-edited entries have no slotId but do have dayId (checks for both)
    if (iv?.manuallyEdited && iv?.dayId) {
      return (
        <span className="text-purple-700 font-medium">
          {iv.dayLabel?.split(",")[0] || iv.dayId}
          {iv.hourLabel ? ` · ${iv.hourLabel}` : ""}
          <span className="text-xs text-amber-600 ml-1 italic">(manual)</span>
        </span>
      );
    }

    return <span className="text-gray-400 italic">Not booked</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-200">Loading applications...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen py-12 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <h1 className="text-3xl font-bold font-montserrat text-gray-200">
            Application Management
          </h1>
          <div className="flex items-center gap-4">
            <button
              onClick={exportEmails}
              disabled={exporting || filteredApplications.length === 0}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              {exporting ? (
                <><span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span> Exporting...</>
              ) : (
                <>📧 Export Emails</>
              )}
            </button>
            <span className="text-sm text-gray-300">
              Total: {filteredApplications.length} applications
            </span>
          </div>
        </div>

        {/* Filter Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Filter Options</h3>
          <div className="flex flex-wrap gap-6 items-start">
            {/* Division Filter */}
            <div className="flex-1 min-w-[200px]">
              <p className="text-xs text-gray-500 font-medium mb-1">Division</p>
              <div className="flex flex-wrap gap-2 items-center">
                <button
                  onClick={() => { setFilterType('firstChoice'); setSelectedDivision(''); }}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filterType === 'firstChoice' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  First Choice
                </button>
                <button
                  onClick={() => { setFilterType('secondChoice'); setSelectedDivision(''); }}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filterType === 'secondChoice' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  Second Choice
                </button>
                {filterType && (
                  <button
                    onClick={() => { setFilterType(null); setSelectedDivision(''); }}
                    className="px-3 py-1.5 rounded-md text-xs font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                  >
                    ✕ Clear
                  </button>
                )}
                {filterType && (
                  <select
                    value={selectedDivision}
                    onChange={(e) => setSelectedDivision(e.target.value)}
                    className="border text-gray-500 border-gray-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Select Division</option>
                    {DIVISIONS.map((div) => (
                      <option key={div.code} value={div.name}>{div.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* University Filter */}
            <div className="flex-1 min-w-[150px] max-w-[160px]">
              <p className="text-xs text-gray-500 font-medium mb-1">University</p>
              <div className="flex flex-wrap gap-2 items-center">
                <select
                  value={selectedUniversity}
                  onChange={(e) => setSelectedUniversity(e.target.value)}
                  className="border text-gray-500 border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">All Universities</option>
                  {UNIVERSITY_FILTERS.map((uf) => (
                    <option key={uf.value} value={uf.value}>{uf.label}</option>
                  ))}
                </select>
                {selectedUniversity && (
                  <button
                    onClick={() => setSelectedUniversity('')}
                    className="px-3 py-1.5 rounded-md text-xs font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                  >
                    ✕ Clear
                  </button>
                )}
              </div>
            </div>

            {/* Test Submission Filter */}
            <div className="flex-1 min-w-[150px] max-w-[160px]">
              <p className="text-xs text-gray-500 font-medium mb-1">Test Submission</p>
              <div className="flex flex-wrap gap-2 items-center">
                <select
                  value={testFilter}
                  onChange={(e) => setTestFilter(e.target.value)}
                  className="border text-gray-500 border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">All</option>
                  <option value="submitted">✅ Submitted</option>
                  <option value="not_submitted">⏳ Not Submitted</option>
                </select>
                {testFilter && (
                  <button
                    onClick={() => setTestFilter('')}
                    className="px-3 py-1.5 rounded-md text-xs font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                  >
                    ✕ Clear
                  </button>
                )}
              </div>
            </div>

            {/* Stage Status Filter */}
            <div className="flex-1 min-w-[150px] max-w-[160px]">
              <p className="text-xs text-gray-500 font-medium mb-1">Stage Status (Completed)</p>
              <div className="flex flex-wrap gap-2 items-center">
                <select
                  value={stageStatusFilter}
                  onChange={(e) => setStageStatusFilter(e.target.value)}
                  className="border text-gray-500 border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">All</option>
                  {STAGE_STATUS_FILTERS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                {stageStatusFilter && (
                  <button
                    onClick={() => setStageStatusFilter("")}
                    className="px-3 py-1.5 rounded-md text-xs font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                  >
                    ✕ Clear
                  </button>
                )}
              </div>
            </div>

            {/* Interview Slot Filter */}
            <div className="flex-1 min-w-[220px] max-w-[230px]">
              <p className="text-xs text-gray-500 font-medium mb-1">Interview Slot</p>
              <div className="flex flex-wrap gap-2 items-center">
                <select
                  value={interviewDayKey}
                  onChange={(e) => {
                    setInterviewDayKey(e.target.value);
                    setInterviewHour("");
                    setInterviewManualOnly(false);
                  }}
                  className="border text-gray-500 border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">All Days</option>
                  {INTERVIEW_DAYS.map((d) => (
                    <option key={`${d.venueId}|${d.dayId}`} value={`${d.venueId}|${d.dayId}`}>
                      {d.venueLabel} · {d.dayLabel}
                    </option>
                  ))}
                </select>

                <select
                  value={interviewHour}
                  onChange={(e) => {
                    setInterviewHour(e.target.value);
                    setInterviewManualOnly(false);
                  }}
                  disabled={!interviewDayKey}
                  className="border text-gray-500 border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {interviewDayKey ? "All Hours" : "Pick a day first"}
                  </option>
                  <option value="any">Any Hour</option>
                  {INTERVIEW_HOURS.map((h) => (
                    <option key={h} value={h}>
                      {formatHour(h)} – {formatHour(h + 1)}
                    </option>
                  ))}
                </select>

                {(interviewDayKey || interviewHour || interviewManualOnly) && (
                  <button
                    onClick={() => {
                      setInterviewDayKey("");
                      setInterviewHour("");
                      setInterviewManualOnly(false);
                    }}
                    className="px-3 py-1.5 rounded-md text-xs font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                  >
                    ✕ Clear
                  </button>
                )}
              </div>

              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => {
                    setInterviewDayKey("");
                    setInterviewHour("none");
                    setInterviewManualOnly(false);
                  }}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${interviewHour === "none"
                    ? "bg-red-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                >
                  Not Booked
                </button>

                <button
                  onClick={() => {
                    setInterviewDayKey("");
                    setInterviewHour("");
                    setInterviewManualOnly(true);
                  }}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${interviewManualOnly
                    ? "bg-red-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                >
                  Manually Booked
                </button>
              </div>
            </div>
          </div>

          {/* Accepted As Filter */}
          <div className="flex-1 min-w-[180px]">
            <p className="text-xs text-gray-500 font-medium mb-1">Accepted As</p>
            <div className="flex flex-wrap gap-2 items-center">
              <select
                value={acceptedAsFilter}
                onChange={(e) => setAcceptedAsFilter(e.target.value)}
                className="border text-gray-500 border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">All Divisions</option>
                {DIVISIONS.map((div) => (
                  <option key={div.code} value={div.name}>{div.name}</option>
                ))}
              </select>
              {acceptedAsFilter && (
                <button
                  onClick={() => setAcceptedAsFilter("")}
                  className="px-3 py-1.5 rounded-md text-xs font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                >
                  ✕ Clear
                </button>
              )}
            </div>
          </div>

          {/* Active filters display */}
          {(filterType || selectedUniversity || testFilter || interviewDayKey || interviewHour || interviewManualOnly || stageStatusFilter || acceptedAsFilter) && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
              <span className="text-xs text-gray-500">Active filters:</span>
              {filterType && selectedDivision && (
                <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded-full text-xs">
                  {filterType === 'firstChoice' ? '1st' : '2nd'}: {selectedDivision}
                </span>
              )}
              {selectedUniversity && (
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">
                  Uni: {UNIVERSITY_FILTERS.find(f => f.value === selectedUniversity)?.label}
                </span>
              )}
              {testFilter && (
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs">
                  Test: {testFilter === 'submitted' ? 'Submitted' : 'Not Submitted'}
                </span>
              )}
              {stageStatusFilter && (
                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-xs">
                  Stage: {STAGE_STATUS_FILTERS.find(s => s.value === stageStatusFilter)?.label} Completed
                </span>
              )}
              {interviewHour === "none" && (
                <span className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded-full text-xs">
                  Interview: Not Booked
                </span>
              )}
              {interviewDayKey && interviewHour && interviewHour !== "none" && (
                <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs">
                  Interview: {INTERVIEW_DAYS.find(d => `${d.venueId}|${d.dayId}` === interviewDayKey)?.venueLabel}
                  {' · '}
                  {INTERVIEW_DAYS.find(d => `${d.venueId}|${d.dayId}` === interviewDayKey)?.dayLabel}
                  {interviewHour !== "any" && ` · ${formatHour(Number(interviewHour))}`}
                </span>
              )}
              {interviewDayKey && !interviewHour && (
                <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs">
                  Interview: {INTERVIEW_DAYS.find(d => `${d.venueId}|${d.dayId}` === interviewDayKey)?.venueLabel}
                  {' · '}
                  {INTERVIEW_DAYS.find(d => `${d.venueId}|${d.dayId}` === interviewDayKey)?.dayLabel}
                </span>
              )}
              {interviewManualOnly && (
                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-xs">
                  Interview: Manually Booked
                </span>
              )}
              {acceptedAsFilter && (
                <span className="px-2 py-0.5 bg-teal-50 text-teal-700 rounded-full text-xs">
                  Accepted: {acceptedAsFilter}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-red-50 to-amber-50">
                <tr>
                  <th className="min-w-[180px] max-w-[200px] px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="min-w-[180px] max-w-[200px] px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applicant ID</th>
                  <th className="min-w-[180px] max-w-[220px] px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">University</th>
                  <th className="min-w-[140px] max-w-[160px] px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">First Choice</th>
                  <th className="min-w-[140px] max-w-[160px] px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Second Choice</th>
                  <th className="min-w-[140px] max-w-[160px] px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stage</th>
                  <th className="min-w-[160px] max-w-[180px] px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interview</th>
                  <th className="min-w-[140px] max-w-[160px] px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Accepted As</th>
                  <th className="min-w-[200px] max-w-[240px] px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="min-w-[100px] max-w-[120px] px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredApplications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                    <td className="min-w-[180px] max-w-[200px] px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 truncate">{app.name || "-"}</td>
                    <td className="min-w-[180px] max-w-[200px] px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 truncate">{app.candidateId || "-"}</td>
                    <td className="min-w-[180px] max-w-[220px] px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate">{app.university || "-"}</td>
                    <td className="min-w-[140px] max-w-[160px] px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate">{app.firstChoice || "-"}</td>
                    <td className="min-w-[140px] max-w-[160px] px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate">{app.secondChoice || "-"}</td>
                    <td className="min-w-[140px] max-w-[160px] px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-semibold inline-block whitespace-nowrap ${app.currentStage === 0 ? 'bg-amber-100 text-amber-700' :
                        app.currentStage === 1 ? 'bg-blue-100 text-blue-700' :
                          app.currentStage === 2 ? 'bg-purple-100 text-purple-700' :
                            app.currentStage === 3 ? 'bg-green-100 text-green-700' :
                              'bg-red-100 text-red-700'
                        }`}>
                        {STAGES.find(s => s.index === app.currentStage)?.label || `Stage ${app.currentStage + 1}`}
                      </span>
                      {hasUnsavedChanges(app) && (
                        <div className="mt-1 text-[10px] text-amber-600 italic leading-tight whitespace-normal">
                          ⚠️ Unsaved stage changes
                        </div>
                      )}
                    </td>
                    <td className="min-w-[160px] max-w-[180px] px-6 py-4 whitespace-nowrap text-sm">
                      {renderInterviewCell(app)}
                    </td>
                    <td className="min-w-[140px] max-w-[160px] px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate">
                      {app.acceptedAs ? (
                        <span className="text-teal-700 font-medium">{app.acceptedAs}</span>
                      ) : (
                        <span className="text-gray-400 italic">—</span>
                      )}
                    </td>
                    <td className="min-w-[200px] max-w-[240px] px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-1 flex-wrap items-center">
                        {Object.entries(app.stageStatus || {}).map(([key, value]) => (
                          <span key={key} className="mr-1 whitespace-nowrap">{getStatusBadge(value)}</span>
                        ))}
                      </div>
                    </td>
                    <td className="min-w-[100px] max-w-[120px] px-6 py-4 whitespace-nowrap text-sm">
                      <Link href={`/ctrlpanel/oprec-applications/${app.id}`} className="text-red-600 hover:text-red-800 font-medium whitespace-nowrap">
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── PUSH ALL CHANGES BUTTON ─── */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="mb-4">
              <span className="text-4xl">📤</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Push All Changes</h3>
            <p className="text-sm text-gray-500 max-w-2xl mb-4">
              This will apply ALL pending stage changes to ALL applicants based on their <strong>stageStatus</strong>.
              <br />
              <span className="text-xs text-gray-400">
                Applicants with 'rejected' → currentStage = 4 &nbsp;|&nbsp;
                Stage 3 'completed' → currentStage = 3 &nbsp;|&nbsp;
                Stage 2 'completed' → currentStage = 2 &nbsp;|&nbsp;
                Stage 1 'completed' → currentStage = 1 &nbsp;|&nbsp;
                Default → currentStage = 0
              </span>
            </p>
            <button
              onClick={pushAllChanges}
              disabled={pushing || applications.length === 0}
              className="px-8 py-3 bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-700 hover:to-amber-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold rounded-lg text-lg transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-3"
            >
              {pushing ? (
                <><span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span> Pushing Changes...</>
              ) : (
                <>🚀 Push All Changes</>
              )}
            </button>
            <p className="text-xs text-gray-400 mt-3">
              {pushing ? 'Applying changes to all applicants...' : `Ready to push changes to ${applications.length} applicants`}
            </p>
          </div>
        </div>

        {filteredApplications.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl shadow-lg mt-6">
            <p className="text-gray-500 font-montserrat">No applications found.</p>
          </div>
        )}
      </div>
    </div>
  );
}