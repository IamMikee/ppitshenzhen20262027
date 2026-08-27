"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { auth, db } from "../../../../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import Link from "next/link";

export default function ApplicationDetail() {
  const router = useRouter();
  const params = useParams();
  const uid = params.uid;

  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const userRef = doc(db, "users", u.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().admin === true) {
          setIsAdmin(true);
          await fetchApplication();
        } else {
          router.push("/");
        }
      } else {
        router.push("/login");
      }
    });
    return () => unsub();
  }, [uid]);

  const fetchApplication = async () => {
    try {
      const appRef = doc(db, "applications", uid);
      const appSnap = await getDoc(appRef);
      if (appSnap.exists()) {
        setApplication({ id: appSnap.id, ...appSnap.data() });
      } else {
        setApplication(null);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching application:", error);
      setLoading(false);
    }
  };

  const handleReject = async () => {
    const currentStage = application.currentStage;
    const stageLabel = getStageLabel(currentStage);

    const confirmed = window.confirm(
      `Are you sure you want to REJECT ${application.name} at "${stageLabel}" stage?\n\nThis will mark the current stage as rejected while keeping previous stages as completed.\n\nThis action CANNOT be undone.`
    );

    if (!confirmed) return;

    setUpdating(true);
    try {
      const appRef = doc(db, "applications", uid);
      const updatedStageStatus = { ...application.stageStatus };

      // Only mark the current stage as rejected
      updatedStageStatus[currentStage] = 'rejected';

      await updateDoc(appRef, {
        currentStage: 4,
        stageStatus: updatedStageStatus,
        updatedAt: new Date().toISOString()
      });

      await fetchApplication();
      alert(`✅ ${application.name} has been rejected at "${stageLabel}" stage.`);
    } catch (error) {
      console.error("Error rejecting applicant:", error);
      alert("Failed to reject applicant. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const handleUnreject = async () => {
    const currentStage = application.currentStage;

    if (currentStage !== 4) {
      alert("This applicant is not currently rejected.");
      return;
    }

    // Find which stage was rejected
    let rejectedStageIndex = 0;
    for (let i = 0; i < 4; i++) {
      if (application.stageStatus?.[i] === 'rejected') {
        rejectedStageIndex = i;
        break;
      }
    }

    const confirmed = window.confirm(
      `Are you sure you want to UNREJECT ${application.name}?\n\nThis will revert them back to "${getStageLabel(rejectedStageIndex)}" stage with "completed" status.\nThey will be moved to the next stage (pending).`
    );

    if (!confirmed) return;

    setUpdating(true);
    try {
      const appRef = doc(db, "applications", uid);
      const updatedStageStatus = { ...application.stageStatus };

      // Find and revert the rejected stage
      let hasRejected = false;
      for (let i = 0; i < 4; i++) {
        if (updatedStageStatus[i] === 'rejected') {
          // Set the rejected stage back to completed (they already completed it)
          updatedStageStatus[i] = 'completed';
          hasRejected = true;
          rejectedStageIndex = i;
          break;
        }
      }

      if (hasRejected) {
        // Set the next stage to pending (if it exists)
        if (rejectedStageIndex + 1 < 4) {
          updatedStageStatus[rejectedStageIndex + 1] = 'pending';
        }
        // Lock all future stages beyond the next one
        for (let i = rejectedStageIndex + 2; i < 4; i++) {
          updatedStageStatus[i] = 'locked';
        }
      }

      await updateDoc(appRef, {
        currentStage: rejectedStageIndex, // Move back to the stage they were rejected at
        stageStatus: updatedStageStatus,
        updatedAt: new Date().toISOString()
      });

      await fetchApplication();
      alert(`✅ ${application.name} has been unrejected and returned to "${getStageLabel(rejectedStageIndex)}" stage.`);
    } catch (error) {
      console.error("Error unrejecting applicant:", error);
      alert("Failed to unreject applicant. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const handleStageUpdate = async (newStage) => {
    // Don't allow stage update if rejected
    if (application.currentStage === 4) {
      alert("This applicant has been rejected. Please unreject them first to update their stage.");
      return;
    }

    // Check if the new stage is already completed
    if (application.stageStatus?.[newStage] === 'completed') {
      alert(`This applicant has already completed the "${getStageLabel(newStage)}" stage.`);
      return;
    }

    // Check if the new stage is locked (can't skip ahead)
    if (application.stageStatus?.[newStage] === 'locked') {
      const currentStage = application.currentStage;
      alert(`Cannot skip to "${getStageLabel(newStage)}". Please complete "${getStageLabel(currentStage)}" first.`);
      return;
    }

    const stageLabels = ["Form", "Written Test", "Interview", "Accepted"];
    const confirmed = window.confirm(
      `Move ${application.name} to "${stageLabels[newStage]}" stage?\n\nCurrent stage: ${stageLabels[application.currentStage] || "Unknown"}`
    );

    if (!confirmed) return;

    setUpdating(true);
    try {
      const appRef = doc(db, "applications", uid);
      const updatedStageStatus = { ...application.stageStatus };

      if (newStage === 3) {
        // Mark all stages as completed for acceptance
        for (let i = 0; i <= 3; i++) {
          if (updatedStageStatus[i] !== 'rejected') {
            updatedStageStatus[i] = "completed";
          }
        }
      } else {
        // Mark stages up to newStage as completed
        for (let i = 0; i <= newStage; i++) {
          if (updatedStageStatus[i] !== 'rejected') {
            updatedStageStatus[i] = "completed";
          }
        }

        // Mark the next stage as pending (if it exists)
        if (newStage + 1 < 4) {
          if (updatedStageStatus[newStage + 1] !== 'rejected') {
            updatedStageStatus[newStage + 1] = "pending";
          }
        }

        // Mark all future stages as locked
        for (let i = newStage + 2; i < 4; i++) {
          if (updatedStageStatus[i] !== 'rejected') {
            updatedStageStatus[i] = "locked";
          }
        }
      }

      await updateDoc(appRef, {
        currentStage: newStage,
        stageStatus: updatedStageStatus,
        updatedAt: new Date().toISOString()
      });

      await fetchApplication();
    } catch (error) {
      console.error("Error updating stage:", error);
      alert("Failed to update stage. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const getStageLabel = (stageIndex) => {
    const labels = ["Form", "Written Test", "Interview", "Accepted", "Rejected"];
    return labels[stageIndex] || `Stage ${stageIndex + 1}`;
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
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading application details...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  if (!application) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center bg-white p-8 rounded-xl shadow-lg">
          <p className="text-gray-600 text-lg">Application not found</p>
          <Link href="/ctrlpanel/oprec-applications" className="text-red-600 hover:text-red-800 mt-4 inline-block">
            ← Back to Applications
          </Link>
        </div>
      </div>
    );
  }

  const isRejected = application.currentStage === 4;
  // Find which stage was rejected
  let rejectedStageIndex = -1;
  if (isRejected) {
    for (let i = 0; i < 4; i++) {
      if (application.stageStatus?.[i] === 'rejected') {
        rejectedStageIndex = i;
        break;
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 md:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Link
          href="/ctrlpanel/oprec-applications"
          className="inline-flex items-center gap-2 text-red-600 hover:text-red-800 mb-6"
        >
          ← Back to Applications
        </Link>

        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          <div className={`px-6 py-4 border-b ${isRejected ? 'bg-red-50' : 'bg-gradient-to-r from-red-50 to-amber-50'}`}>
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold font-montserrat text-gray-800">
                  Application Details
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Submitted on {new Date(application.submittedAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              {isRejected && rejectedStageIndex !== -1 && (
                <span className="px-4 py-2 bg-red-100 text-red-700 rounded-full text-sm font-semibold">
                  ❌ Rejected at "{getStageLabel(rejectedStageIndex)}"
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="px-6 py-4 bg-gray-50 border-b">
            <h2 className="text-lg font-semibold font-montserrat text-gray-800">
              👤 Personal Information
            </h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 font-medium">Full Name</p>
              <p className="text-gray-900 font-medium">{application.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Email</p>
              <p className="text-gray-900">{application.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Phone (WA)</p>
              <p className="text-gray-900">{application.phone}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Birth Date</p>
              <p className="text-gray-900">{new Date(application.birthDate).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}</p>
            </div>
          </div>
        </div>

        {/* Education */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="px-6 py-4 bg-gray-50 border-b">
            <h2 className="text-lg font-semibold font-montserrat text-gray-800">
              🎓 Education
            </h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 font-medium">University</p>
              <p className="text-gray-900">{application.university}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Student ID</p>
              <p className="text-gray-900">{application.studentId}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Graduation Year</p>
              <p className="text-gray-900">{application.graduationYear}</p>
            </div>
          </div>
        </div>

        {/* Application Details */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="px-6 py-4 bg-gray-50 border-b">
            <h2 className="text-lg font-semibold font-montserrat text-gray-800">
              📋 Application Details
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <p className="text-sm text-gray-500 font-medium">Motivation</p>
              <div className="mt-1 p-4 bg-gray-50 text-gray-700 rounded-lg whitespace-pre-wrap">
                {application.motivation}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 font-medium">1st Choice</p>
                <p className="text-gray-900 font-medium">{application.firstChoice}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">2nd Choice</p>
                <p className="text-gray-900 font-medium">{application.secondChoice}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Available for Other Positions</p>
              <p className="text-gray-900">{application.otherPosition ? "✅ Ya" : "❌ Tidak"}</p>
            </div>
          </div>
        </div>

        {/* Documents */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="px-6 py-4 bg-gray-50 border-b">
            <h2 className="text-lg font-semibold font-montserrat text-gray-800">
              📄 Documents
            </h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 font-medium">Surat Pernyataan</p>
              {application.statementUrl ? (
                <a
                  href={application.statementUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-red-600 hover:text-red-800 font-medium mt-1"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    <path d="M10 11a1 1 0 011 1v3a1 1 0 11-2 0v-3a1 1 0 011-1z" />
                    <path d="M9 7a1 1 0 011 1v1a1 1 0 11-2 0V8a1 1 0 011-1z" />
                  </svg>
                  View PDF
                </a>
              ) : (
                <p className="text-gray-400 mt-1">Not uploaded</p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">CV</p>
              {application.cvUrl ? (
                <a
                  href={application.cvUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-red-600 hover:text-red-800 font-medium mt-1"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    <path d="M10 11a1 1 0 011 1v3a1 1 0 11-2 0v-3a1 1 0 011-1z" />
                    <path d="M9 7a1 1 0 011 1v1a1 1 0 11-2 0V8a1 1 0 011-1z" />
                  </svg>
                  View PDF
                </a>
              ) : (
                <p className="text-gray-400 mt-1">Not uploaded</p>
              )}
            </div>
          </div>
        </div>

        {/* Test Answers */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="px-6 py-4 bg-gray-50 border-b">
            <h2 className="text-lg font-semibold font-montserrat text-gray-800">
              📝 Test Answers
            </h2>
          </div>
          <div className="p-6 grid grid-cols-1 gap-4">
            <div>
              <p className="text-sm text-gray-500 font-medium">Test Submission</p>
              {application.testUrl ? (
                <div className="mt-2 space-y-2">
                  <a
                    href={application.testUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                      <path d="M10 11a1 1 0 011 1v3a1 1 0 11-2 0v-3a1 1 0 011-1z" />
                      <path d="M9 7a1 1 0 011 1v1a1 1 0 11-2 0V8a1 1 0 011-1z" />
                    </svg>
                    View Test Answers
                  </a>
                  {application.testSubmittedAt && (
                    <p className="text-xs text-gray-400">
                      Submitted on: {new Date(application.testSubmittedAt).toLocaleString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-gray-400 mt-1">Not submitted yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Progress Status & Actions */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="px-6 py-4 bg-gray-50 border-b">
            <h2 className="text-lg font-semibold font-montserrat text-gray-800">
              📊 Application Progress
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-5 gap-2 mb-6">
              {[0, 1, 2, 3, 4].map((stage) => {
                let status;
                if (stage === 4) {
                  status = isRejected ? 'rejected' : 'locked';
                } else {
                  status = application.stageStatus?.[stage] || "locked";
                }
                return (
                  <div key={stage} className="text-center">
                    <div className={`p-3 rounded-lg ${status === "completed" ? "bg-green-50 border border-green-200" :
                      status === "pending" ? "bg-amber-50 border border-amber-200" :
                        status === "rejected" ? "bg-red-50 border border-red-200" :
                          "bg-gray-50 border border-gray-200"
                      }`}>
                      <div className="text-2xl mb-1">
                        {status === "completed" ? "✅" :
                          status === "pending" ? "⏳" :
                            status === "rejected" ? "❌" : "🔒"}
                      </div>
                      <p className="text-xs font-medium text-gray-600">
                        {getStageLabel(stage)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {getStatusBadge(status)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-200">
              {!isRejected && (
                <>
                  <button
                    onClick={() => handleStageUpdate(0)}
                    disabled={updating || application.currentStage === 0 || application.stageStatus?.[0] === 'completed'}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-md text-sm font-medium transition-colors"
                  >
                    Form
                  </button>
                  <button
                    onClick={() => handleStageUpdate(1)}
                    disabled={updating || application.currentStage === 1 || application.stageStatus?.[1] === 'completed' || application.stageStatus?.[0] !== 'completed'}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-md text-sm font-medium transition-colors"
                  >
                    Written Test
                  </button>
                  <button
                    onClick={() => handleStageUpdate(2)}
                    disabled={updating || application.currentStage === 2 || application.stageStatus?.[2] === 'completed' || application.stageStatus?.[1] !== 'completed'}
                    className="px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-md text-sm font-medium transition-colors"
                  >
                    Interview
                  </button>
                  <button
                    onClick={() => handleStageUpdate(3)}
                    disabled={updating || application.currentStage === 3 || application.stageStatus?.[2] !== 'completed'}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-md text-sm font-medium transition-colors"
                  >
                    Accept ✅
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={updating}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-md text-sm font-medium transition-colors"
                  >
                    Reject ❌
                  </button>
                </>
              )}
              {isRejected && (
                <button
                  onClick={handleUnreject}
                  disabled={updating}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-md text-sm font-medium transition-colors"
                >
                  Unreject 🔄
                </button>
              )}
            </div>
            {updating && (
              <div className="mt-3 text-sm text-gray-500">
                Updating... Please wait.
              </div>
            )}
            {isRejected && rejectedStageIndex !== -1 && (
              <div className="mt-3 text-sm text-red-600">
                ⚠️ This applicant was rejected at the "{getStageLabel(rejectedStageIndex)}" stage.
                Click "Unreject" to restore their progress.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}