"use client";

import { useState, useEffect } from "react";
import { auth } from "../../../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, updateDoc, addDoc, collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "../../../../lib/firebase";
import { getAllUsers } from "../../../../services/forms";

export default function AdminStatusPage() {
    const [selectedEmail, setSelectedEmail] = useState("");
    const [userFound, setUserFound] = useState(null);
    const [userNotFound, setUserNotFound] = useState(false);
    const [selectedClientEmail, setSelectedClientEmail] = useState(false);
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState(null);
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                fetchHistory();
            }
        });
        return () => unsubscribe();
    }, []);

    async function fetchHistory() {
        setHistoryLoading(true);
        try {
            const historyRef = collection(db, "adminHistory");
            const q = query(historyRef, orderBy("timestamp", "desc"));
            const querySnapshot = await getDocs(q);
            const historyData = [];
            querySnapshot.forEach((doc) => {
                historyData.push({ id: doc.id, ...doc.data() });
            });
            setHistory(historyData);
        } catch (error) {
            console.error("Error fetching history:", error);
        } finally {
            setHistoryLoading(false);
        }
    }

    async function updateAdminStatus(uid, status) {
        const docRef = doc(db, "users", uid);
        await updateDoc(docRef, {
            admin: status,
        });
    }

    async function logAdminHistory(adminEmail, targetEmail, oldStatus, newStatus) {
        try {
            await addDoc(collection(db, "adminHistory"), {
                adminEmail: adminEmail,
                targetEmail: targetEmail,
                oldStatus: oldStatus,
                newStatus: newStatus,
                timestamp: new Date(),
            });
            // Refresh history after logging
            await fetchHistory();
        } catch (error) {
            console.error("Error logging admin history:", error);
        }
    }

    async function verifyEmail() {
        if (!selectedEmail.trim()) return;
        if (selectedEmail == user?.email) {
            setSelectedClientEmail(true);
            setLoading(false);
            return;
        }

        setLoading(true);

        const allUsersList = await getAllUsers();
        setTimeout(() => {
            for (let userObj of allUsersList) {
                if (userObj.email == selectedEmail.toLowerCase()) {
                    setUserFound(userObj);
                    setLoading(false);
                    return;
                }
            }
            setUserNotFound(true);
            setSelectedEmail("");
            setLoading(false);
            return;
        }, 500);
    }

    async function processAdminStatusChange() {
        if (!userFound) return;

        const oldStatus = userFound.admin;
        const newStatus = !userFound.admin;

        try {
            await updateAdminStatus(userFound.uid, newStatus);
            await logAdminHistory(user.email, selectedEmail, oldStatus, newStatus);
            alert(`Toggled the admin status for ${selectedEmail} to ${newStatus}`);

            setSelectedEmail("");
            setUserFound(null);
        } catch (error) {
            console.error("Error processing admin status change:", error);
            alert("Failed to update admin status. Please try again.");
        }
    }

    function formatDate(timestamp) {
        if (!timestamp) return "N/A";
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    return (
        <div className="w-full max-w-xl bg-[#1f1f1f] rounded-xl shadow-2xl p-10 text-white mx-auto">
            <h1 className="text-2xl font-semibold mb-8">Admin Status Management</h1>

            {/* Email Label */}
            <label className="block mb-2 text-sm text-gray-300">User Email</label>

            {/* Email Input */}
            <input
                type="email"
                value={selectedEmail}
                onChange={(e) => {
                    setSelectedEmail(e.target.value);
                    setUserFound(null);
                    setUserNotFound(false);
                    setSelectedClientEmail(false);
                }}
                placeholder="Enter user email..."
                className="w-full px-4 py-3 rounded-lg bg-[#2a2a2a] border border-gray-600 focus:border-purple-500 focus:outline-none transition mb-4"
            />

            {userFound && (
                <>
                    <div className="text-white text-sm" style={{ marginTop: "-1rem" }}>User found! ✅</div>
                    <div className="mb-4 text-white text-sm">Admin Status: {userFound.admin ? "True" : "False"}</div>
                </>
            )}

            {userNotFound && (
                <div className="mb-4 text-white text-sm" style={{ marginTop: "-1rem" }}>User not found! ❌</div>
            )}

            {selectedClientEmail && (
                <div className="mb-4 text-white text-sm" style={{ marginTop: "-1rem" }}>Cannot modify yourself! ❌</div>
            )}

            {/* Verify Button */}
            {!userFound && (
                <button
                    onClick={verifyEmail}
                    disabled={loading}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg transition mb-6"
                >
                    {loading ? "Verifying..." : "Verify User"}
                </button>
            )}

            {/* Toggle Button */}
            {userFound && (
                <button
                    onClick={processAdminStatusChange}
                    className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-lg transition mb-6"
                >
                    Toggle Admin Status
                </button>
            )}

            {/* History Section */}
            <div className="mt-8 border-t border-gray-700 pt-6">
                <h2 className="text-xl font-semibold mb-4">Admin History</h2>

                {historyLoading ? (
                    <div className="text-gray-400 text-sm">Loading history...</div>
                ) : history.length === 0 ? (
                    <div className="text-gray-400 text-sm">No admin changes recorded yet.</div>
                ) : (
                    <div className="max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                        {history.map((entry) => (
                            <div
                                key={entry.id}
                                className="bg-[#2a2a2a] rounded-lg p-4 mb-3 border border-gray-700 hover:border-purple-500 transition"
                            >
                                <div className="flex flex-col space-y-1 text-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400">Admin:</span>
                                        <span className="text-purple-400 font-medium">{entry.adminEmail}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400">Target:</span>
                                        <span className="text-blue-400 font-medium">{entry.targetEmail}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400">Status Change:</span>
                                        <span className="font-medium">
                                            <span className="text-gray-400">{entry.oldStatus ? "True" : "False"}</span>
                                            <span className="text-gray-500 mx-2">→</span>
                                            <span className={entry.newStatus ? "text-green-400" : "text-red-400"}>
                                                {entry.newStatus ? "True" : "False"}
                                            </span>
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400">Date:</span>
                                        <span className="text-gray-300 text-xs">{formatDate(entry.timestamp)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Custom scrollbar styles */}
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #2a2a2a;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #7c3aed;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #6d28d9;
                }
            `}</style>
        </div>
    );
}