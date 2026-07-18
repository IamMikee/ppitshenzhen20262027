"use client";

import { useEffect, useState } from "react";
import { auth } from "../../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { getAllForms } from "../../../services/forms";
import { db } from "../../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";

function isDark(color) {
  // convert hex to RGB
  const r = parseInt(color.substr(1, 2), 16);
  const g = parseInt(color.substr(3, 2), 16);
  const b = parseInt(color.substr(5, 2), 16);

  // calculate brightness (0 = dark, 255 = light)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness < 128; // true if dark
}

export default function loadAllFormsPage(){
    const [forms, setForms] = useState([]);
    const [activeQr, setActiveQr] = useState(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(undefined);
    const [admin, setAdmin] = useState(false);
    const [attendedForms, setAttendedForms] = useState([]);
    const [submittedForms, setSubmittedForms] = useState([]);
    const router = useRouter();
    const getQrUrl = (qrContent) => `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrContent)}`;
    const activeForms = [];


    // GET USER AND FORMS DATA
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                router.replace("/login");
                return;
            }

            setUser(currentUser);

            try {
                // 🔹 Fetch forms AFTER auth confirmed
                const data = await getAllForms();
                setForms(data);

                // 🔹 Fetch user data
                const userRef = doc(db, "users", currentUser.uid);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    setAdmin(userData.admin || false);
                    setAttendedForms(userData.attendedForms || []);
                    setSubmittedForms(userData.submittedForms || []);
                }

            } catch (error) {
                console.error("Error loading data:", error);
            } finally {
                setLoading(false);
            }
        });

        return () => unsub();
    }, [router]);
    
    //COMPUTE ACTIVE USER FORMS
    for (let f of forms) {
        if (f.isActive) {
            activeForms.push(f);
        };
    };

    
    if (user === undefined) {
        return (
        <div className="min-h-screen bg-[#7E0C0E] text-white flex items-center justify-center">
             <div className="font-montserrat text-white" style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }}>Loading session...</div>
        </div>
        );
    };

    if (loading) return (
        <div style={{ minHeight: "100vh", backgroundColor: "#7E0C0E", margin: 0, padding: 0 }}>
            <div className="font-montserrat text-white" style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", textAlign: "center" }}>Fetching forms, please wait...</div>
        </div>

    );

    if (activeForms.length == 0 && !admin) {
        return (
            <div style={{ minHeight: "100vh", backgroundColor: "#7E0C0E", fontFamily: "Arial, sans-serif", margin: 0, padding: 0 }}>
                <div className="font-montserrat text-white" style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", textAlign: "center" }}>No events to register at the moment.</div>
            </div>
        )
    }

    return (
        <div style={{ paddingTop: "6rem", minHeight: "100vh", backgroundColor: "#7E0C0E", fontFamily: "Arial, sans-serif", margin: 0 }}>
            {/* FORM CONTENT */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 p-8 mx-auto justify-center items-center">
                {forms.map((form) => {
                    const status = attendedForms.includes(form.id)
                        ? "attended"
                        : submittedForms.includes(form.id)
                        ? "submitted"
                        : form.isClosed
                        ? "closed"
                        : "open";

                    const buttonDisabled = status != "open" && !admin;
                    const buttonStyle = {
                        marginBottom: "1rem",
                        padding: "0.45rem 1.4rem",
                        borderRadius: "8px",
                        border: "none",
                        fontWeight: 600,
                        fontSize: "0.9rem",
                        cursor: buttonDisabled ? "not-allowed" : "pointer",
                        opacity: buttonDisabled ? 0.7 : 1,
                        pointerEvents: buttonDisabled ? "none" : "auto",
                        color:
                        admin ? "white" :
                        status === "submitted"
                            ? "#000"
                            : "white",
                        background:
                        admin ? "#e40000" :
                        status === "submitted"
                            ? "#fbbf24"
                            : status === "attended"
                            ? "#000"
                            : status === "closed"
                            ? "#9ca3af" // grey
                            : "#e40000",
                    }

                return (
                    <div key={form.id} style={{ display: `${admin ? "auto" : form.isActive ? "auto" : "none"}`, position: "relative", borderRadius: "14px", overflow: "hidden", backgroundSize: "cover", backgroundPosition: "center", boxShadow: "0 10px 30px rgba(0, 0, 0, 0.25)", backgroundImage: `url(${form.coverImage || "/DefaultFormCardBackground.webp"})`, }}>
                        <div className="font-montserrat" style={{ background: `${form.headerColor ?? "#bf3330"}`, color: `${isDark(form.headerColor ?? "#bf3330") ? "#FFF" : "#000"}`, fontWeight: 600, textAlign: "center", padding: "0.75rem 1rem", fontSize: "1rem", }}> {form.title} </div>
                        
                        <div style={{ position: "relative", height: "30vh", display: "flex", alignItems: "flex-end", justifyContent: "center", }}>
                            {/* QR BUTTON (ONLY FOR ADMIN) */}
                            <button
                                onClick={() => setActiveQr(getQrUrl(form.id))}
                                style={{
                                    display:
                                        admin ? "flex" : "none",
                                    position: "absolute",
                                    top: "10px",
                                    right: "10px",
                                    width: "36px",
                                    height: "36px",
                                    borderRadius: "50%",
                                    border: "none",
                                    background: "rgba(0,0,0,0.65)",
                                    color: "white",
                                    cursor: "pointer",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "0.85rem",
                                    zIndex: 2,
                                }}> QR
                            </button>

                            {/* REGISTER BUTTON */}
                            <button className="font-montserrat"
                                style={ buttonStyle } 
                                onClick={() => {
                                    if (admin) {
                                        router.push(`form/${form.id}/adminform`);
                                    } else {
                                        router.push(`form/${form.id}`)
                                    }
                                }}>
                            {admin
                                ? "Edit"
                                : status === "submitted"
                                ? "Submitted"
                                : status === "attended"
                                ? "Attended"
                                : status === "closed"
                                ? "Closed"
                                : "Register"}
                            </button>

                            {/* VIEW RESPONSES BUTTON (ADMIN ONLY) */}
                            {admin && (
                                <button 
                                    className="font-montserrat ml-4"
                                    style={ buttonStyle }
                                    onClick={() => router.push(`form/${form.id}/responses`)}
                                > 
                                Responses
                                </button>
                            )}
                        </div> 
                    </div>
                )})}

                

                {/* FADE ANIMATION FOR OVERLAY */}
                <div onClick={() => setActiveQr(null)}
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0,0,0,0.6)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: activeQr ? 1 : 0,
                        pointerEvents: activeQr ? "auto" : "none",
                        transition: "opacity 0.3s ease",
                        zIndex: 999,
                    }}>
                    <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                            background: "#fff",
                            padding: "1.2rem",
                            borderRadius: "14px",
                            transform: activeQr ? "scale(1)" : "scale(0.95)",
                            transition: "transform 0.3s ease",
                            boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
                        }}>
                        <img
                            src={activeQr}
                            alt="QR Code"
                            style={{ width: "220px", height: "220px" }}
                        />
                    </div>
                </div>
            </div> 

            {/* Create New Form Button */}
            {admin && (
                <div style={{ marginTop: "2rem", textAlign: "center" }}>
                    <button
                    onClick={ async () => {
                        try {
                            const formData = {
                                title: "Untitled Form",
                                description: "",
                                headerColor: "#bf3330",
                                questions: [
                                    {
                                    id: "Name",
                                    label: "Name",
                                    required: true,
                                    type: "text",
                                    },
                                ],
                                published: false,
                                createdBy: user.uid,
                            }
                            
                            localStorage.setItem("newFormDraft", JSON.stringify(formData)); // Store temporarily
                            router.push("/form/new/adminform");

                            //const docRef = await createForm(formData);
                            //router.push(`/form/${docRef.id}/adminform`);

                        } catch (error) {
                            console.error(error);
                        }
                    }}
                    style={{
                        padding: "0.7rem 1.8rem",
                        borderRadius: "10px",
                        border: "none",
                        fontWeight: 600,
                        fontSize: "1rem",
                        cursor: "pointer",
                        background: "#16a34a",
                        color: "white",
                        margin: "2rem"
                    }}>
                    Create New Form
                    </button>
                </div>
            )}

            {/* BARCODE SCANNER BUTTON */}
            {!admin && forms.length != 0 && (
                <div style={{ marginTop: "2rem", textAlign: "center" }}>
                    <button
                    onClick={() => router.push("scan")}
                    style={{
                        alignItems: "center",
                        gap: "0.6rem",
                        padding: "0.8rem 1.6rem",
                        margin: "2rem",
                        borderRadius: "12px",
                        border: "none",
                        fontSize: "1rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        background: "#d43535",
                        color: "white",
                        boxShadow: "0 4px 14px rgba(21, 114, 55, 0.3)",
                        transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) =>
                        (e.currentTarget.style.transform = "scale(1.05)")
                    }
                    onMouseLeave={(e) =>
                        (e.currentTarget.style.transform = "scale(1)")
                    }>
                    📷 Scan QR code
                    </button>
                </div>
            )}

        </div>
    );
}
