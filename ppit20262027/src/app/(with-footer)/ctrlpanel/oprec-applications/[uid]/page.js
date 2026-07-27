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

  const getStageLabel = (stageIndex) => {
    const labels = ["Form", "Written Test", "Interview", "Results"];
    return labels[stageIndex] || `Stage ${stageIndex + 1}`;
  };

  const getStatusBadge = (status) => {
    const styles = {
      completed: "bg-green-100 text-green-700",
      pending: "bg-amber-100 text-amber-700",
      locked: "bg-gray-100 text-gray-500"
    };
    const labels = {
      completed: "✅ Completed",
      pending: "📋 Pending",
      locked: "🔒 Locked"
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
          <div className="bg-gradient-to-r from-red-50 to-amber-50 px-6 py-4 border-b">
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

        {/* Progress Status */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b">
            <h2 className="text-lg font-semibold font-montserrat text-gray-800">
              📊 Application Progress
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2, 3].map((stage) => {
                const status = application.stageStatus?.[stage] || "locked";
                return (
                  <div key={stage} className="text-center">
                    <div className={`p-3 rounded-lg ${
                      status === "completed" ? "bg-green-50 border border-green-200" :
                      status === "pending" ? "bg-amber-50 border border-amber-200" :
                      "bg-gray-50 border border-gray-200"
                    }`}>
                      <div className="text-2xl mb-1">
                        {status === "completed" ? "✅" : status === "pending" ? "⏳" : "🔒"}
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
          </div>
        </div>
      </div>
    </div>
  );
}