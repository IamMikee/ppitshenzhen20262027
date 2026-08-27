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
  const [filterType, setFilterType] = useState(null); // 'firstChoice' or 'secondChoice'
  const [selectedDivision, setSelectedDivision] = useState("");
  const [exporting, setExporting] = useState(false);
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
      // Use filtered applications if filter is active, otherwise all applications
      const dataToExport = filteredApplications.length > 0 ? filteredApplications : applications;
      const emails = [];

      dataToExport.forEach((app) => {
        if (app.email) {
          emails.push(app.email);
        }
      });

      if (emails.length === 0) {
        alert("No emails found to export.");
        setExporting(false);
        return;
      }

      // Create CSV content
      const csvContent = emails.join('\n');

      // Create and download the file
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
                <>
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                  Exporting...
                </>
              ) : (
                <>
                  📧 Export Emails
                </>
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
                onClick={() => {
                  setFilterType('firstChoice');
                  setSelectedDivision('');
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filterType === 'firstChoice'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
              >
                First Choice
              </button>
              <button
                onClick={() => {
                  setFilterType('secondChoice');
                  setSelectedDivision('');
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filterType === 'secondChoice'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
              >
                Second Choice
              </button>
              {filterType && (
                <button
                  onClick={() => {
                    setFilterType(null);
                    setSelectedDivision('');
                  }}
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
                  <option key={div.code} value={div.name}>
                    {div.name}
                  </option>
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
                  {/* Comment out Applicant ID when you want to hide it */}
                  {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Applicant ID
                  </th> */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    First Choice
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Second Choice
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Stage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredApplications.map((app) => (
                  <tr key={app.uid} className="hover:bg-gray-50 transition-colors">
                    {/* Comment out this entire <td> to hide Applicant ID */}
                    {/* <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {app.candidateId || app.uid.substring(0, 8)}
                    </td> */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {app.name || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {app.firstChoice || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {app.secondChoice || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${app.currentStage === 0 ? 'bg-amber-100 text-amber-700' :
                        app.currentStage === 1 ? 'bg-blue-100 text-blue-700' :
                          app.currentStage === 2 ? 'bg-purple-100 text-purple-700' :
                            app.currentStage === 3 ? 'bg-green-100 text-green-700' :
                              'bg-red-100 text-red-700'
                        }`}>
                        {STAGES.find(s => s.index === app.currentStage)?.label || `Stage ${app.currentStage + 1}`}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-1 flex-wrap">
                        {Object.entries(app.stageStatus || {}).map(([key, value]) => (
                          <span key={key} className="mr-1">
                            {getStatusBadge(value)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        href={`/ctrlpanel/oprec-applications/${app.uid}`}
                        className="text-red-600 hover:text-red-800 font-medium"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Timeline Update Section */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Update All Applicants Stage</h3>
          <p className="text-sm text-gray-500 mb-6">
            Click on a stage to move ALL eligible applicants (excluding rejected ones) to that stage.
          </p>

          <div className="relative py-4">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-300 transform -translate-y-1/2" style={{ left: '40px', right: '40px' }}></div>

            <div className="relative flex justify-between items-center px-4">
              {STAGES.filter(stage => stage.index !== 4).map((stage, index, filteredArray) => (
                <div key={stage.index} className="flex flex-col items-center flex-1">
                  <button
                    onClick={() => updateAllStages(stage.index)}
                    className={`
              w-14 h-14 rounded-full flex items-center justify-center text-2xl 
              transition-all duration-200 transform hover:scale-110
              shadow-lg relative z-10
              ${stage.index === 3
                        ? 'bg-green-500 hover:bg-green-600 text-white'
                        : 'bg-gradient-to-br from-red-400 to-amber-400 hover:from-red-500 hover:to-amber-500 text-white'
                      }
            `}
                    title={`Move to ${stage.label}`}
                  >
                    {stage.emoji}
                  </button>
                  <span className="mt-2 text-xs font-medium text-gray-600 text-center">
                    {stage.label}
                  </span>
                  {index < filteredArray.length - 1 && (
                    <div className="absolute top-1/2 h-0.5 bg-gray-300 -translate-y-1/2 pointer-events-none"
                      style={{
                        left: `${(index + 1) * (100 / filteredArray.length) - (100 / (filteredArray.length * 2))}%`,
                        right: `${(filteredArray.length - index - 2) * (100 / filteredArray.length) + (100 / (filteredArray.length * 2))}%`,
                        width: `${100 / filteredArray.length}%`
                      }}>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 text-xs text-gray-400 text-center">
            * This will update all applicants currently displayed in the table (filtered view)
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