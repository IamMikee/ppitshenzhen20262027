"use client";

import { useState, useEffect } from "react";
import { auth } from "../../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { getAllUsers } from "../../../services/forms";


export default function AdminControlPage() {
    const [selectedEmail, setSelectedEmail] = useState("");
    const [userFound, setUserFound] = useState(null);
    const [userNotFound, setUserNotFound] = useState(false);
    const [selectedClientEmail, setSelectedClientEmail] = useState(false);
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState(undefined);
    const router = useRouter();

    async function updateAdminStatus(uid, status) {
        const docRef = doc(db, "users", uid);
        await updateDoc(docRef, {
            admin: status,
        });
    }

    async function verifyEmail() {
        if (!selectedEmail.trim()) return;
        if (selectedEmail == user.email) {
            setSelectedClientEmail(true);
            setLoading(false);
            return;
        }

        setLoading(true);
        
        const allUsersList = await getAllUsers();
        setTimeout(() => {
            for (let userObj of allUsersList) {
                if (userObj.email == selectedEmail) {
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

        await updateAdminStatus(userFound.uid, !userFound.admin);
        alert(`Toggled the admin status for ${selectedEmail} to ${!userFound.admin}`);

        setSelectedEmail("");
        setUserFound(null);
    }
    
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
          if (!currentUser) {
              router.replace("/login");
              return;
          }
    
          setUser(currentUser);
            
          try {
            const userRef = doc(db, "users", currentUser.uid);
            const userSnap = await getDoc(userRef);
    
            if (userSnap.exists()) {
                const userData = userSnap.data();
                if (!userData.admin) {
                    alert("You do not have permission to view this page.");
                    router.push("/");
                }
            }
          } catch (error) {
            alert("Failed to verify admin status!");
          }
        }); 
    
        console.log(userFound)
    
        return () => unsubscribe();
    }, [userFound]);
        


    return (
        <div className="min-h-screen bg-[#252525] font-sans flex">
            {/* Sidebar */}
            <div className="font-montserrat pt-28 w-60 bg-[#1e1e1e] border-r border-gray-700 p-8 hidden md:block">
                <h2 className="text-white text-2xl font-semibold mb-8">
                Control Panel
                </h2>

                <div className="bg-gray-700 text-white px-4 py-3 rounded-lg cursor-pointer hover:bg-gray-600 transition">
                👑 Admin Status
                </div>
            </div>

            {/* Main Content */}
            <div className="font-montserrat flex-1 flex justify-center items-start px-6 md:px-12 pt-24 pb-12">
                <div className="w-full max-w-xl bg-[#1f1f1f] rounded-xl shadow-2xl p-10 text-white">
                    <h1 className="text-2xl font-semibold mb-8"> Admin Status Management </h1>

                    {/* Email Label */}
                    <label className="block mb-2 text-sm text-gray-300"> User Email </label>

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
                    
                    { userFound && (
                        <>
                            <div className="font-montserrat text-white text-sm" style={{ marginTop:"-1rem" }}>User found! ✅</div>
                            <div className="mb-4 text-white text-sm">Admin Status: {userFound.admin ? "True" : "False"}</div>
                        </>
                    )}

                    { userNotFound &&
                        <div className="mb-4 font-montserrat text-white text-sm" style={{ marginTop:"-1rem" }}>User not found! ❌</div>
                    }

                    { selectedClientEmail &&
                        <div className="mb-4 font-montserrat text-white text-sm" style={{ marginTop:"-1rem" }}>Cannot modify yourself! ❌</div>
                    }

                    {/* Verify Button */}
                    { !userFound &&
                        <button
                            onClick={verifyEmail}
                            disabled={loading}
                            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg transition mb-6"
                        >
                            {loading ? "Verifying..." : "Verify User"}
                        </button>
                    }

                    {/* Toggle Button */}
                    {userFound && (
                        <button
                        onClick={processAdminStatusChange}
                        className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-lg transition"
                        >
                        Toggle Admin Status
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}