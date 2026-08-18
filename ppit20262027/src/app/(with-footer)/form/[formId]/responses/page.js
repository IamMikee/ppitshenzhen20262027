"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, doc, getDoc, query, orderBy } from "firebase/firestore";
import { db, auth } from "../../../../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter, useParams } from "next/navigation"
import { ChevronLeft, ChevronRight, List, LayoutGrid, Calendar, Clock } from "lucide-react";

export default function ResponsesPage() {
    const [responses, setResponses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingSheets, setLoadingSheets] = useState(false);
    const [questions, setQuestions] = useState([]);
    const [viewMode, setViewMode] = useState("perSubmission");
    const [currentIndex, setCurrentIndex] = useState(0);
    const [inputValue, setInputValue] = useState("");
    const router = useRouter();
    const formId = useParams()?.formId;

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (u) => {
            if (!u) {
                router.push("/login")
            }

            try {
                const userRef = doc(db, "users", u.uid);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    if (!userData.admin) {
                        router.push("/")
                    }
                }
            } catch (error) {
                console.error("failed to verify admin status: " + error);
            }
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        const fetchResponses = async () => {
            try {
                const q = query(
                    collection(db, "forms", formId, "responses"),
                    orderBy("submittedAt", "asc")
                );

                const snapshot = await getDocs(q);

                const data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));

                setResponses(data);
                setCurrentIndex(data.length - 1);
                setInputValue(String(data.length));
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (formId) {
            fetchResponses();
        }
    }, [formId]);

    useEffect(() => {
        const fetchForm = async () => {
            try {
                const snapshot = await getDoc(doc(db, "forms", formId));

                if (!snapshot.exists()) return;
                const data = snapshot.data();

                const questionObj = data.questions || {};

                const questionList = Object.entries(questionObj)
                    .map((key) => {
                        if (!key) return null;
                        return {
                            index: parseInt(key[0]),
                            id: key[1].id || "",
                            label: key[1].label || "",
                            type: key[1].type || "",
                        };
                    })
                    .filter(q => q !== null);

                setQuestions(questionList);
            } catch (err) {
                console.error(err);
            }
        };

        if (formId) {
            fetchForm();
        }
    }, [formId]);

    const escapeCSV = (value) => {
        if (value === null || value === undefined) return "";

        let str = String(value);
        str = str.replace(/"/g, '""');

        if (str.includes(",") || str.includes("\n") || str.includes('"')) {
            str = `"${str}"`;
        }
        return str;
    };

    const exportToCSV = () => {
        if (responses.length === 0) return;

        const headers = new Set();
        const header_id = new Set();

        questions.forEach((q) => {
            headers.add(q.label);
            header_id.add(q.id);
        });

        const headerArray = [...Array.from(headers)];
        const headerIdArray = [...Array.from(header_id)];
        const rows = [];

        responses.forEach((res) => {
            const ans = res.answers || {}
            const values = [];
            headerIdArray.forEach((id) => {
                let val = ans?.[id] ?? "—";
                if (Array.isArray(val)) {
                    val = val.join(", ");
                }
                values.push(escapeCSV(val));
            });
            rows.push(values);
        });

        const csvContent = [
            headerArray.join(","),
            ...rows.map((row) => row.join(",")),
        ].join("\n");

        const blob = new Blob(["\uFEFF" + csvContent], {
            type: "text/csv;charset=utf-8;",
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "responses.csv";
        link.click();
    };

    const openInSheets = async () => {
        setLoadingSheets(true);

        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        try {
            const res = await fetch("/api/sheets", {
                method: "POST",
                body: JSON.stringify({
                    formId,
                    responses,
                    questions,
                }),
            });

            const data = await res.json();
            setLoadingSheets(false);

            if (data.url) {
                if (isMobile) {
                    window.location.href = data.url
                } else {
                    window.open(data.url, "_blank");
                }
            } else if (data.error) {
                alert("Failed to create spreadsheet: " + data.error);
            }
        } catch (e) {
            console.error("Network error: " + e);
            setLoadingSheets(false);
            alert("Failed to connect to server.");
        }
    };

    const goToPrevious = () => {
        if (currentIndex > 0) {
            const newIndex = currentIndex - 1;
            setCurrentIndex(newIndex);
            setInputValue(String(newIndex + 1));
        }
    };

    const goToNext = () => {
        if (currentIndex < responses.length - 1) {
            const newIndex = currentIndex + 1;
            setCurrentIndex(newIndex);
            setInputValue(String(newIndex + 1));
        }
    };

    const handleInputChange = (e) => {
        const value = e.target.value;
        setInputValue(value);
        if (value === "") return;
        const num = parseInt(value);
        if (!isNaN(num) && num >= 1 && num <= responses.length) {
            setCurrentIndex(num - 1);
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return "N/A";
        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return date.toLocaleString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        } catch {
            return "Invalid date";
        }
    };

    const renderAnswer = (value, questionType) => {
        if (value === undefined || value === null) return "—";
        if (Array.isArray(value)) return value.join(", ");
        if (questionType === "file" && typeof value === "string" && value.startsWith("http")) {
            return (
                <div className="mt-2">
                    <img
                        src={value}
                        alt="Uploaded file"
                        className="rounded-lg max-w-full max-h-96 object-contain border border-gray-200"
                        onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.innerHTML = `<a href="${value}" target="_blank" class="text-blue-600 hover:underline">View uploaded file</a>`;
                        }}
                    />
                </div>
            );
        }
        return value;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#7E0C0E] border-t-transparent"></div>
                    <p className="mt-4 text-gray-500 font-medium">Loading responses...</p>
                </div>
            </div>
        );
    }

    if (loadingSheets) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#7E0C0E] border-t-transparent mb-4"></div>
                    <p className="text-gray-500 font-medium">Creating Google Sheets...</p>
                </div>
            </div>
        );
    }

    const currentResponse = responses[currentIndex];

    return (
        <div className="min-h-screen p-6 pt-24 bg-[#7E0C0E]">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <h1 className="text-2xl font-bold text-gray-800">Responses</h1>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setViewMode("perSubmission")}
                                className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 ${viewMode === "perSubmission"
                                        ? "bg-[#7E0C0E] text-white shadow-md"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    }`}
                            >
                                <LayoutGrid size={18} />
                                Per Submission
                            </button>
                            <button
                                onClick={() => setViewMode("all")}
                                className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 ${viewMode === "all"
                                        ? "bg-[#7E0C0E] text-white shadow-md"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    }`}
                            >
                                <List size={18} />
                                All Responses
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={exportToCSV}
                                className="bg-[#7E0C0E] text-white px-4 py-2 rounded-lg hover:bg-[#9E1A1C] transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                            >
                                Export CSV
                            </button>
                            <button
                                onClick={openInSheets}
                                className="bg-[#7E0C0E] text-white px-4 py-2 rounded-lg hover:bg-[#9E1A1C] transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                            >
                                Open in Sheets
                            </button>
                        </div>
                        <div className="ml-auto text-sm text-gray-500">
                            {responses.length} {responses.length === 1 ? 'response' : 'responses'}
                        </div>
                    </div>
                </div>

                {responses.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                        <p className="text-gray-500 text-lg">No responses yet.</p>
                    </div>
                ) : (
                    <>
                        {viewMode === "perSubmission" ? (
                            // Per Submission View
                            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                                {/* Navigation Bar */}
                                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                                    <div className="flex flex-wrap items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={goToPrevious}
                                                disabled={currentIndex === 0}
                                                className="p-2 rounded-lg bg-white shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-sm"
                                            >
                                                <ChevronLeft size={20} className="text-gray-700" />
                                            </button>
                                            <div className="flex items-center gap-2">
                                                <span className="text-gray-500">Response</span>
                                                <input
                                                    type="text"
                                                    value={inputValue}
                                                    onChange={handleInputChange}
                                                    className="w-12 text-center border border-gray-300 rounded-lg px-1 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#7E0C0E] focus:border-transparent text-gray-600"
                                                />
                                                <span className="text-gray-500">of {responses.length}</span>
                                            </div>
                                            <button
                                                onClick={goToNext}
                                                disabled={currentIndex === responses.length - 1}
                                                className="p-2 rounded-lg bg-white shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-sm"
                                            >
                                                <ChevronRight size={20} className="text-gray-700" />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <Calendar size={16} />
                                            <span>Submitted: {formatDate(currentResponse?.submittedAt)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Response Content */}
                                <div className="p-6">
                                    <div className="space-y-6">
                                        {questions.map((q) => {
                                            const value = currentResponse?.answers?.[q.id];
                                            if (value === undefined || value === null) return null;

                                            return (
                                                <div key={q.id} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                                                    <h3 className="text-sm font-medium text-gray-500 mb-2">
                                                        {q.label || q.id}
                                                        {q.required && <span className="text-red-500 ml-1">*</span>}
                                                    </h3>
                                                    <div className="text-gray-700">
                                                        {renderAnswer(value, q.type)}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // All Responses View
                            <div className="space-y-4">
                                {responses.map((res, index) => {
                                    const responseNumber = responses.length - index;
                                    return (
                                        <div key={res.id} className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
                                            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
                                                <span className="font-semibold text-gray-700">
                                                    Response #{responseNumber}
                                                </span>
                                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                                    <Clock size={14} />
                                                    <span>{formatDate(res.submittedAt)}</span>
                                                </div>
                                            </div>
                                            <div className="p-6">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {questions.map((q) => {
                                                        const value = res.answers?.[q.id];
                                                        if (value === undefined || value === null) return null;

                                                        return (
                                                            <div key={q.id} className="bg-gray-50 rounded-lg p-3">
                                                                <div className="text-xs font-medium text-gray-500 mb-1 truncate">
                                                                    {q.label || q.id}
                                                                </div>
                                                                <div className="text-sm text-gray-700 break-words">
                                                                    {Array.isArray(value)
                                                                        ? value.join(", ")
                                                                        : typeof value === "string" && value.startsWith("http") && q.type === "file"
                                                                            ? "📎 File uploaded"
                                                                            : value}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}