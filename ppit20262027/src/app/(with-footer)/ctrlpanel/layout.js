"use client";

import { useState, useEffect } from "react";
import { auth } from "../../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import Link from "next/link";

export default function ControlPanelLayout({ children }) {
    const [user, setUser] = useState(undefined);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

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
            } finally {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#252525] flex items-center justify-center">
                <div className="text-white text-xl">Loading...</div>
            </div>
        );
    }

    const navItems = [
        { 
            name: "Admin Status", 
            path: "/ctrlpanel/adminstatus",
            active: pathname === "/ctrlpanel/adminstatus"
        },
        { 
            name: "Email Broadcast", 
            path: "/ctrlpanel/emailsender",
            active: pathname === "/ctrlpanel/emailsender"
        },
        // Add more nav items here as you create them
    ];

    return (
        <div className="min-h-screen bg-[#252525] font-sans flex">
            {/* Sidebar */}
            <div className="font-montserrat pt-28 w-60 bg-[#1e1e1e] border-r border-gray-700 p-8 hidden md:block">
                <h2 className="text-white text-2xl font-semibold mb-8 hover:text-purple-500">
                    <Link href="/ctrlpanel">
                    Control Panel
                    </Link>
                </h2>

                <nav className="space-y-2">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            href={item.path}
                            className={`block px-4 py-3 rounded-lg transition ${
                                item.active
                                    ? "bg-purple-600 text-white"
                                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                            }`}
                        >
                            {item.name}
                        </Link>
                    ))}
                </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex justify-center items-start px-6 md:px-12 pt-24 pb-12">
                <div className="w-full max-w-4xl">
                    {children}
                </div>
            </div>
        </div>
    );
}