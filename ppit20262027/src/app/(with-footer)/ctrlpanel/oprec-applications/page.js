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

export default function AdminApplications() {
  const [applications, setApplications] = useState([]);
  const [filteredApplications, setFilteredApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filterType, setFilterType] = useState(null);
  const [selectedDivision, setSelectedDivision] = useState("");
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
  }, [applications, filterType, selectedDivision]);

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
    if (filterType && selectedDivision) {
      filtered = filtered.filter((app) => {
        const choice = filterType === 'firstChoice' ? app.firstChoice : app.secondChoice;
        return choice === selectedDivision;
      });
    }
    setFilteredApplications(filtered);
  };

  const exportEmails = async () => {
    setExporting(true);
    try {
      const dataToExport = filteredApplications.length > 0 ? filteredApplications : applications;
      const emails = [];
      dataToExport.forEach((app) => {
        if (app.email) emails.push(app.email);
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

  // ─── PUSH ALL CHANGES ──────────────────────────────────────
  // This reads stageStatus from each application and updates currentStage accordingly
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

        // Check if rejected
        if (Object.values(status).includes('rejected')) {
          newStage = 4;
        } else if (status[3] === 'completed') {
          newStage = 3;
        } else if (status[2] === 'completed') {
          newStage = 2;
        } else if (status[1] === 'completed') {
          newStage = 1;
        } else {
          newStage = 0;
        }

        // Only update if stage has changed
        if (app.currentStage !== newStage) {
          const appRef = doc(db, "applications", app.uid);
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
    const styles = {
      completed: "bg-green-100 text-green-700",
      pending: "bg-amber-100 text-amber-700",
      locked: "bg-gray-100 text-gray-500",
      rejected: "bg-red-100 text-red-700"
    };
    const labels = {
      completed: "✅ Completed",
      pending: "📋 Pending",
      locked: "🔒 Locked",
      rejected: "❌ Rejected"
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.locked}`}>
        {labels[status] || status}
      </span>
    );
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
          <h3 className="text-sm font-medium text-gray-700 mb-3">Filter by Division</h3>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex gap-2">
              <button
                onClick={() => { setFilterType('firstChoice'); setSelectedDivision(''); }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filterType === 'firstChoice' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                First Choice
              </button>
              <button
                onClick={() => { setFilterType('secondChoice'); setSelectedDivision(''); }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filterType === 'secondChoice' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                Second Choice
              </button>
              {filterType && (
                <button
                  onClick={() => { setFilterType(null); setSelectedDivision(''); }}
                  className="px-4 py-2 rounded-md text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                >
                  ✕ Clear
                </button>
              )}
            </div>
            {filterType && (
              <select
                value={selectedDivision}
                onChange={(e) => setSelectedDivision(e.target.value)}
                className="border text-gray-500 border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">Select Division</option>
                {DIVISIONS.map((div) => (
                  <option key={div.code} value={div.name}>{div.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-red-50 to-amber-50">
                <tr>
                  <th className="min-w-[180px] max-w-[200px] px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="min-w-[140px] max-w-[160px] px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">First Choice</th>
                  <th className="min-w-[140px] max-w-[160px] px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Second Choice</th>
                  <th className="min-w-[140px] max-w-[160px] px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stage</th>
                  <th className="min-w-[200px] max-w-[240px] px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="min-w-[100px] max-w-[120px] px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredApplications.map((app) => (
                  <tr key={app.uid} className="hover:bg-gray-50 transition-colors">
                    <td className="min-w-[180px] max-w-[200px] px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 truncate">{app.name || "-"}</td>
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
                    </td>
                    <td className="min-w-[200px] max-w-[240px] px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-1 flex-wrap items-center">
                        {Object.entries(app.stageStatus || {}).map(([key, value]) => (
                          <span key={key} className="mr-1 whitespace-nowrap">{getStatusBadge(value)}</span>
                        ))}
                      </div>
                    </td>
                    <td className="min-w-[100px] max-w-[120px] px-6 py-4 whitespace-nowrap text-sm">
                      <Link href={`/ctrlpanel/oprec-applications/${app.uid}`} className="text-red-600 hover:text-red-800 font-medium whitespace-nowrap">
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