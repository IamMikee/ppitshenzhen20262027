"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, doc, getDoc, query, orderBy, where } from "firebase/firestore";
import { db, auth } from "../../../../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter, useParams } from "next/navigation"

export default function ResponsesPage() {
const [responses, setResponses] = useState([]);
const [loading, setLoading] = useState(true);
const [loadingSheets, setLoadingSheets] = useState(false);
// const [user, setUser] = useState(null);
const [questions, setQuestions] = useState({});
const router = useRouter();
const formId = useParams()?.formId;

useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
        if(!u) {
            router.push("/login")
        }
        // setUser(u);

        try {
            const userRef = doc(db, "users", u.uid);
            const userSnap = await getDoc(userRef);
    
            if (userSnap.exists()) {
                const userData = userSnap.data();
                if(!userData.admin) {
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
            collection(db, "responses"),
            where("formId", "==", formId),
            orderBy("submittedAt", "asc")
        );

        const snapshot = await getDocs(q); 

        const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        }));

        data.reverse();

        setResponses(data);
    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
    }
    };

    fetchResponses();
}, []);

useEffect(() => {
    const fetchForm = async () => {
        try {
            const snapshot = await getDoc(doc(db, "forms", formId));

            if (!snapshot.exists()) return;
            const data = snapshot.data();

            const questionObj = data.questions || {};
            
            const questionList = Object.entries(questionObj)
            .map((key)=> {
                // console.log(key)
                if(!key) return null;
                return {
                    index: parseInt(key[0]),
                    id: key[1].id || "",
                    label: key[1].label || "",
                };
            });

            setQuestions(questionList);
        } catch (err) {
            console.error(err);
        }
    };

    fetchForm();
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
    ].join("\n"); //PROBLEM IN SLICING COLUMNS (SOME VALUES CONTAIN ,)

    const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
    });

    // Downloading protocol
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "responses.csv";
    link.click();
};

const openInSheets = async () => {
    setLoadingSheets(true);

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    try{
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
    } catch(e) {
        console.error("Network error: " + e);
        setLoadingSheets(false);
        alert("Failed to connect to server.");
    }
};

if (loading) {
    return (
    <div className="min-h-screen text-lg flex items-center justify-center">
        Loading responses...
    </div>
    );
}

if (loadingSheets) {
    return (
    <div className="min-h-screen font-montserrat text-white text-2xl font-bold flex items-center bg-[#7E0C0E] justify-center">
        Creating Google Sheets...
    </div>
    );
}

return (
    <div className="font-montserrat min-h-screen bg-[#7E0C0E] text-white p-8 pt-24">
    <h1 className="text-3xl font-bold mb-6">User Responses</h1>

    <button
        onClick={exportToCSV}
        className="mb-6 bg-white text-black px-4 py-2 rounded"
    >
        Export CSV
    </button>

    <button
        onClick={openInSheets}
        className="mb-6 bg-white text-black px-4 py-2 rounded ml-4"
    >
        Open in Google Sheets
    </button>

    {responses.length === 0 ? (
        <p>No responses yet.</p>
    ) : (
        <div className="space-y-6">
        {responses.map((res, index) => (
            <div
            key={res.id}
            className="bg-[#B88C8C] text-black p-4 rounded"
            >
                
            <p className="font-semibold text-xl mb-4">
                Response #{responses.length - (index + 1) + 1}
            </p>

            {questions.map((q) => {
                const value = res.answers?.[q.id];

                if(value == undefined) return null;

                return (
                    <div key={q.id} className="font-montserrat mb-2">
                        <span className="font-medium">
                        {q.label || q.id}:
                        </span>{" "}
                        {Array.isArray(value)
                        ? value.join(", ")
                        : value}
                    </div>
                )
            })}
            </div>
        ))}
        </div>
    )}
    </div>
);
}