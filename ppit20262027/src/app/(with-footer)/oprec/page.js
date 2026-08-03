"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../../lib/firebase";
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";
import Header from "../../../app/Components/Header";
import LoadingScreen from "../../../app/Components/LoadingScreen";

export default function RecruitmentPage() {
    const router = useRouter();
    const [loadingFinished, setLoadingFinished] = useState(false);
    const [activeStage, setActiveStage] = useState(0);
    const [userName, setUserName] = useState("Applicant");
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [applicationData, setApplicationData] = useState(null);
    const [currentStage, setCurrentStage] = useState(0);
    const [stageStatus, setStageStatus] = useState({});
    const [formSubmitted, setFormSubmitted] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        fullName: "",
        phone: "",
        email: "",
        birthDate: "",
        university: "",
        studentId: "",
        graduationYear: "",
        motivation: "",
        firstChoice: "",
        secondChoice: "",
        otherPosition: "",
        statementFile: null,
        cvFile: null,
    });
    const [formErrors, setFormErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [submitSuccess, setSubmitSuccess] = useState(false);

    // Application stages data
    const stages = [
        {
            id: 0,
            title: "Online Application Form",
            icon: "📝",
            color: "from-amber-400 to-yellow-300",
        },
        {
            id: 1,
            title: "Written Test",
            icon: "✍️",
            color: "from-amber-500 to-red-400",
        },
        {
            id: 2,
            title: "Interview",
            icon: "🎯",
            color: "from-red-500 to-red-700",
        },
        {
            id: 3,
            title: "Results",
            icon: "🏆",
            color: "from-red-700 to-red-900",
        },
    ];

    // 🆕 Merged divisions with names and codes
    const divisions = [
        { name: "Dana Usaha", code: "DU" },
        { name: "Departemen Olahraga", code: "DO" },
        { name: "Hubungan Masyarakat", code: "HM" },
        { name: "Informasi Teknologi", code: "IT" },
        { name: "Media Kreatif", code: "MK" },
        { name: "Perkembangan Karir & Akademik", code: "PKA" },
        { name: "Sosial Budaya", code: "SB" }
    ];

    /* Auth check - fetch user name and application data from Firestore */
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (u) => {
            if (u) {
                setUser(u);

                try {
                    // Fetch user data from users collection
                    const userRef = doc(db, "users", u.uid);
                    const userSnap = await getDoc(userRef);

                    if (userSnap.exists()) {
                        const userData = userSnap.data();
                        const name = userData.name || userData.displayName || u.displayName || u.email?.split('@')[0] || "Applicant";
                        setUserName(name);

                        // Pre-fill form with user data
                        setFormData(prev => ({
                            ...prev,
                            email: u.email || "",
                            birthDate: userData.birthday || "",
                            fullName: userData.name || "",
                        }));
                    }

                    // Check if application already exists (meaning form was submitted)
                    const appRef = doc(db, "applications", u.uid);
                    const appSnap = await getDoc(appRef);

                    if (appSnap.exists()) {
                        const appData = appSnap.data();
                        setApplicationData(appData);
                        setCurrentStage(appData.currentStage || 0);
                        setStageStatus(appData.stageStatus || {});
                        setActiveStage(appData.currentStage || 0);
                        setFormSubmitted(true);
                    } else {
                        // No application yet - set initial state
                        const initialStatus = {
                            0: "pending",
                            1: "locked",
                            2: "locked",
                            3: "locked"
                        };
                        setStageStatus(initialStatus);
                        setCurrentStage(0);
                        setActiveStage(0);
                        setFormSubmitted(false);
                    }
                } catch (error) {
                    console.error("Error fetching data:", error);
                }

                setLoading(false);
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        return () => unsub();
    }, []);

    // Check if a stage is clickable (completed or pending)
    const isStageClickable = (stageIndex) => {
        if (stageIndex === 0) return true; // Stage 0 is always clickable
        const status = stageStatus[stageIndex];
        return status === "completed" || status === "pending";
    };

    const isStageCompleted = (stageIndex) => {
        return stageStatus[stageIndex] === "completed";
    };

    const isStageLocked = (stageIndex) => {
        return stageStatus[stageIndex] === "locked";
    };

    const handleStageClick = (index) => {
        if (isStageClickable(index)) {
            setActiveStage(index);
        }
    };

    // Form handlers
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        // Clear error for this field
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: "" }));
        }
    };

    const handleFileChange = (e, field) => {
        const file = e.target.files[0];
        if (file) {
            // Validate PDF
            if (file.type !== "application/pdf") {
                setFormErrors(prev => ({ ...prev, [field]: "File must be PDF format" }));
                return;
            }
            // Validate size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                setFormErrors(prev => ({ ...prev, [field]: "File must be under 5MB" }));
                return;
            }
            setFormData(prev => ({ ...prev, [field]: file }));
            setFormErrors(prev => ({ ...prev, [field]: "" }));
        }
    };

    const validateForm = () => {
        const errors = {};

        if (!formData.fullName.trim()) errors.fullName = "Nama lengkap wajib diisi";
        if (!formData.phone.trim()) errors.phone = "Nomor WA wajib diisi";
        if (!formData.phone.startsWith("+62")) errors.phone = "Nomor WA harus diawali +62";
        if (!formData.university.trim()) errors.university = "Universitas wajib diisi";
        if (!formData.studentId.trim()) errors.studentId = "Student ID wajib diisi";
        if (!formData.graduationYear) errors.graduationYear = "Tahun kelulusan wajib diisi";
        if (formData.graduationYear && (formData.graduationYear < 2020 || formData.graduationYear > 2030)) {
            errors.graduationYear = "Tahun kelulusan tidak valid";
        }
        if (!formData.motivation.trim()) errors.motivation = "Esai motivasi wajib diisi";
        if (!formData.firstChoice) errors.firstChoice = "Pilihan pertama wajib dipilih";
        if (!formData.secondChoice) errors.secondChoice = "Pilihan kedua wajib dipilih";

        if (formData.firstChoice && formData.secondChoice && formData.firstChoice === formData.secondChoice) {
            errors.secondChoice = "Pilihan kedua harus berbeda dari pilihan pertama";
        }

        if (!formData.otherPosition) errors.otherPosition = "Harap pilih salah satu";
        if (!formData.statementFile) errors.statementFile = "Surat pernyataan wajib diupload";
        if (!formData.cvFile) errors.cvFile = "CV wajib diupload";

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // In your RecruitmentPage component
    const uploadFileToCloudinary = async (file, fileType) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append(
            "upload_preset",
            process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_OPREC
        );
        formData.append("public_id", `${user.uid}_${fileType}_${Date.now()}`);

        const res = await fetch(
            `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`,
            {
                method: "POST",
                body: formData,
            }
        );

        if (!res.ok) {
            const errorData = await res.json();
            console.error("Cloudinary error:", errorData);
            throw new Error(errorData.error?.message || "Upload failed");
        }

        const data = await res.json();
        return data.secure_url;
    };

    // 🆕 Get candidate ID based on division
    const getNextCandidateId = async (divisionName) => {
        try {
            // Find the division code
            const division = divisions.find(d => d.name === divisionName);
            if (!division) {
                throw new Error(`Invalid division: ${divisionName}`);
            }

            // Reference to the counter document for this division
            const counterRef = doc(db, "applicationsCounter", division.code);
            const counterSnap = await getDoc(counterRef);
            
            let currentCount = 0;
            if (counterSnap.exists()) {
                currentCount = counterSnap.data().count || 0;
            }
            
            // Increment the count
            const newCount = currentCount + 1;
            
            // Update the counter
            await setDoc(counterRef, { count: newCount });
            
            // Format as DU-001, SB-001, etc.
            const paddedNumber = String(newCount).padStart(3, '0');
            return `${division.code}-${paddedNumber}`;
            
        } catch (error) {
            console.error("Error getting candidate ID:", error);
            throw error;
        }
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setSubmitting(true);
        setSubmitError("");

        try {
            // Upload files to Cloudinary - returns public URLs
            const [statementUrl, cvUrl] = await Promise.all([
                uploadFileToCloudinary(formData.statementFile, 'statement'),
                uploadFileToCloudinary(formData.cvFile, 'cv')
            ]);

            // 🆕 Get the candidate ID based on their first choice
            const candidateId = await getNextCandidateId(formData.firstChoice);

            // Create application document with Cloudinary URLs and candidate ID
            const applicationData = {
                uid: user.uid,
                candidateId: candidateId,
                division: formData.firstChoice, // Store which division they applied to
                email: formData.email,
                name: formData.fullName,
                phone: formData.phone,
                birthDate: formData.birthDate,
                university: formData.university,
                studentId: formData.studentId,
                graduationYear: formData.graduationYear,
                motivation: formData.motivation,
                firstChoice: formData.firstChoice,
                secondChoice: formData.secondChoice,
                otherPosition: formData.otherPosition === "Ya",
                statementUrl: statementUrl,
                cvUrl: cvUrl,
                currentStage: 0,
                stageStatus: {
                    0: "completed",
                    1: "pending",
                    2: "locked",
                    3: "locked"
                },
                submittedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await setDoc(doc(db, "applications", user.uid), applicationData);

            // Update user's submittedForms
            await updateDoc(doc(db, "users", user.uid), {
                submittedForms: arrayUnion("recruitment_2026")
            });

            setApplicationData(applicationData);
            setCurrentStage(0);
            setStageStatus(applicationData.stageStatus);
            setFormSubmitted(true);
            setSubmitSuccess(true);

            setTimeout(() => {
                setSubmitSuccess(false);
            }, 3000);

        } catch (error) {
            console.error("Error submitting form:", error);
            setSubmitError(error.message || "Gagal mengirim form. Silakan coba lagi.");
        } finally {
            setSubmitting(false);
        }
    };

    // Render form
    const renderForm = () => {
        if (formSubmitted) {
            return (
                <div className="text-center py-8">
                    <div className="text-6xl mb-4">✅</div>
                    <h3 className="text-2xl font-bold text-green-600 mb-2">Form Submitted Successfully!</h3>
                    <p className="text-gray-500">Your application has been received. You can now proceed to the next stages.</p>
                    {applicationData?.candidateId && (
                        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg inline-block">
                            <p className="text-sm text-gray-600">Your Candidate ID:</p>
                            <p className="text-xl font-bold text-red-600">{applicationData.candidateId}</p>
                            <p className="text-xs text-gray-500">Division: {applicationData.division}</p>
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div className="space-y-6">
                {/* Warning */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <p className="text-red-700 text-sm font-medium">
                        ⚠️ Peringatan: Progress tidak akan disimpan sampai Anda menekan tombol "Submit".
                        Pastikan semua data sudah benar sebelum mengirim.
                    </p>
                </div>

                {/* Full Name */}
                <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                        Nama lengkap sesuai paspor <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        className={`w-full rounded-lg border ${formErrors.fullName ? 'border-red-500' : 'border-gray-300'} px-4 py-2 text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500`}
                        placeholder="Masukkan nama lengkap"
                    />
                    {formErrors.fullName && <p className="text-red-500 text-sm mt-1">{formErrors.fullName}</p>}
                </div>

                {/* Phone */}
                <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                        Nomor WA <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className={`w-full rounded-lg border ${formErrors.phone ? 'border-red-500' : 'border-gray-300'} px-4 py-2 text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500`}
                        placeholder="+62..."
                    />
                    {formErrors.phone && <p className="text-red-500 text-sm mt-1">{formErrors.phone}</p>}
                </div>

                {/* Email (fixed) */}
                <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                        Email aktif <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        disabled
                        className="w-full rounded-lg border border-gray-300 bg-gray-100 px-4 py-2 text-gray-500 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1">Email tidak dapat diubah</p>
                </div>

                {/* Birth Date */}
                <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                        Tanggal lahir <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="date"
                        name="birthDate"
                        value={formData.birthDate}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                </div>

                {/* University */}
                <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                        Universitas <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        name="university"
                        value={formData.university}
                        onChange={handleInputChange}
                        className={`w-full rounded-lg border ${formErrors.university ? 'border-red-500' : 'border-gray-300'} px-4 py-2 text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500`}
                        placeholder="Masukkan nama universitas"
                    />
                    {formErrors.university && <p className="text-red-500 text-sm mt-1">{formErrors.university}</p>}
                </div>

                {/* Student ID */}
                <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                        Student ID <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        name="studentId"
                        value={formData.studentId}
                        onChange={handleInputChange}
                        className={`w-full rounded-lg border ${formErrors.studentId ? 'border-red-500' : 'border-gray-300'} px-4 py-2 text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500`}
                        placeholder="Masukkan Student ID"
                    />
                    {formErrors.studentId && <p className="text-red-500 text-sm mt-1">{formErrors.studentId}</p>}
                </div>

                {/* Graduation Year */}
                <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                        Tahun kelulusan <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="number"
                        name="graduationYear"
                        value={formData.graduationYear}
                        onChange={handleInputChange}
                        className={`w-full rounded-lg border ${formErrors.graduationYear ? 'border-red-500' : 'border-gray-300'} px-4 py-2 text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500`}
                        placeholder="Contoh: 2027"
                        min="2027"
                        max="2032"
                    />
                    {formErrors.graduationYear && <p className="text-red-500 text-sm mt-1">{formErrors.graduationYear}</p>}
                </div>

                {/* Motivation Essay */}
                <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                        Kenapa Anda ingin mendaftar sebagai pengurus PPITSZ 26/27? <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        name="motivation"
                        value={formData.motivation}
                        onChange={handleInputChange}
                        rows={5}
                        className={`w-full rounded-lg border ${formErrors.motivation ? 'border-red-500' : 'border-gray-300'} px-4 py-2 text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none`}
                        placeholder="Tuliskan alasan dan motivasi Anda..."
                    />
                    {formErrors.motivation && <p className="text-red-500 text-sm mt-1">{formErrors.motivation}</p>}
                </div>

                {/* First Choice */}
                <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                        Bidang yang Anda minati (1st Choice) <span className="text-red-500">*</span>
                    </label>
                    <select
                        name="firstChoice"
                        value={formData.firstChoice}
                        onChange={handleInputChange}
                        className={`w-full rounded-lg border ${formErrors.firstChoice ? 'border-red-500' : 'border-gray-300'} px-4 py-2 text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500`}
                    >
                        <option value="">Pilih bidang</option>
                        {divisions.map(d => (
                            <option key={d.code} value={d.name}>{d.name}</option>
                        ))}
                    </select>
                    {formErrors.firstChoice && <p className="text-red-500 text-sm mt-1">{formErrors.firstChoice}</p>}
                </div>

                {/* Second Choice */}
                <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                        Bidang yang Anda minati (2nd Choice) <span className="text-red-500">*</span>
                    </label>
                    <select
                        name="secondChoice"
                        value={formData.secondChoice}
                        onChange={handleInputChange}
                        className={`w-full rounded-lg border ${formErrors.secondChoice ? 'border-red-500' : 'border-gray-300'} px-4 py-2 text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500`}
                    >
                        <option value="">Pilih bidang</option>
                        {divisions
                            .filter(d => d.name !== formData.firstChoice)
                            .map(d => (
                                <option key={d.code} value={d.name}>{d.name}</option>
                            ))}
                    </select>
                    {formErrors.secondChoice && <p className="text-red-500 text-sm mt-1">{formErrors.secondChoice}</p>}
                </div>

                {/* Other Position */}
                <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                        Apakah Anda bersedia dipertimbangkan untuk posisi lain apabila diperlukan? <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 text-gray-500">
                            <input
                                type="radio"
                                name="otherPosition"
                                value="Ya"
                                checked={formData.otherPosition === "Ya"}
                                onChange={handleInputChange}
                                className="accent-red-600"
                            />
                            Ya
                        </label>
                        <label className="flex items-center gap-2 text-gray-500">
                            <input
                                type="radio"
                                name="otherPosition"
                                value="Tidak"
                                checked={formData.otherPosition === "Tidak"}
                                onChange={handleInputChange}
                                className="accent-red-600"
                            />
                            Tidak
                        </label>
                    </div>
                    {formErrors.otherPosition && <p className="text-red-500 text-sm mt-1">{formErrors.otherPosition}</p>}
                </div>

                {/* Statement File */}
                <div>
                    <div className="flex items-center justify-between mb-1">
                        <label className="block text-sm font-medium text-gray-500">
                            Surat Pernyataan <span className="text-red-500">*</span>
                        </label>
                        <a
                            href="https://docs.google.com/document/d/1CN4a715KlMbRPATh07J88tfVW4yYEABMXASLtwOjmc0/export?format=docx&tab=t.0"
                            className="text-sm text-red-600 hover:text-red-800 font-medium flex items-center gap-1 underline-offset-2 hover:underline"
                        >
                            📄 Download Template
                        </a>
                    </div>

                    <div className={`flex items-center gap-3 p-3 rounded-lg border ${formErrors.statementFile ? 'border-red-500' : 'border-gray-300'}`}>
                        <input
                            type="file"
                            accept=".pdf"
                            onChange={(e) => handleFileChange(e, 'statementFile')}
                            className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 transition-colors"
                        />
                        {formData.statementFile && (
                            <span className="text-sm text-green-600">✓ {formData.statementFile.name}</span>
                        )}
                    </div>

                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <span>Note: </span> Download template, sign, and upload PDF (max 5MB)
                    </p>

                    {formErrors.statementFile && (
                        <p className="text-red-500 text-sm mt-1">{formErrors.statementFile}</p>
                    )}
                </div>

                {/* CV File */}
                <div>
                    <div className="flex items-center justify-between mb-1">
                        <label className="block text-sm font-medium text-gray-500">
                            CV <span className="text-red-500">*</span>
                        </label>
                    </div>

                    <div className={`flex items-center gap-3 p-3 rounded-lg border ${formErrors.cvFile ? 'border-red-500' : 'border-gray-300'}`}>
                        <input
                            type="file"
                            accept=".pdf"
                            onChange={(e) => handleFileChange(e, 'cvFile')}
                            className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 transition-colors"
                        />
                        {formData.cvFile && (
                            <span className="text-sm text-green-600">✓ {formData.cvFile.name}</span>
                        )}
                    </div>

                    <p className="text-xs text-gray-400 mt-1">Upload your CV in PDF format (max 5MB)<br></br>Please merge your CV and Portfolio into 1 PDF file (khusus Informasi Teknologi, Media Kreatif, dan Hubungan Masyarakat)**</p>

                    {formErrors.cvFile && (
                        <p className="text-red-500 text-sm mt-1">{formErrors.cvFile}</p>
                    )}
                </div>

                {/* Submit Error */}
                {submitError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-red-700 text-sm">{submitError}</p>
                    </div>
                )}

                {/* Submit Success */}
                {submitSuccess && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-green-700 text-sm">✅ Form berhasil dikirim!</p>
                    </div>
                )}

                {/* Submit Button */}
                <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full bg-gradient-to-r from-red-600 to-amber-500 text-white font-bold py-3 px-6 rounded-lg hover:shadow-lg hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {submitting ? (
                        <span className="flex items-center justify-center gap-2">
                            <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                            Mengirim...
                        </span>
                    ) : (
                        "Submit Application"
                    )}
                </button>
            </div>
        );
    };

    if (loading) {
        return (
            <div style={{ minHeight: "100vh", backgroundColor: "#7E0C0E", fontFamily: "Arial, sans-serif", margin: 0, padding: 0 }}>
                <div className="font-montserrat" style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3rem", fontWeight: "bolder", color: "white" }}>Loading...</div>
            </div>
        );
    }

    if (!user) {
        return (
            <div style={{ minHeight: "100vh", backgroundColor: "#7E0C0E", fontFamily: "Arial, sans-serif", margin: 0, padding: 0 }}>
                <div className="font-montserrat" style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", fontWeight: "bolder", color: "white", textAlign: "center", padding: "0 1rem" }}>
                    Please log in to view your application progress.
                </div>
            </div>
        );
    }

    return (
        <>
            {!loadingFinished && (
                <LoadingScreen
                    logoSrc="/ppitsz2526_whitelogo.webp"
                    text="PPIT SHENZHEN"
                    onFinish={() => setLoadingFinished(true)}
                />
            )}

            <Header />

            <div className="min-h-[calc(100vh-200px)] bg-fixed bg-cover bg-center bg-[url('/bg-oprec-app.webp')] bg-[#7E0C0E] py-12 md:py-16 px-4 md:px-8 lg:px-16">
                <div className="min-h-[calc(100vh-200px)] bg-black/40 backdrop-blur-[2px] -m-4 md:-m-8 lg:-m-16 p-4 md:p-8 lg:p-16">
                    <div className="max-w-6xl mx-auto">
                        <div className="mb-10 md:mb-14 mt-12">
                            <h1 className="text-2xl md:text-3xl lg:text-4xl font-montserrat font-bold text-white">
                                Hi, <span className="text-yellow-200">{userName}</span>!
                                <span className="block mt-1 text-lg md:text-xl lg:text-2xl font-light text-gray-300">
                                    Welcome to PPIT Shenzhen Open Recruitment Application 2026/2027
                                </span>
                            </h1>
                        </div>

                        <div className="mb-8">
                            {/* Glass card wrapper for progress section */}
                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-white/10">
                                <h2 className="text-xl md:text-2xl font-montserrat font-semibold text-white mb-6">
                                    My Application Progress:
                                </h2>

                                <div className="relative">
                                    {/* Progress bar background */}
                                    <div className="absolute left-0 right-0 top-8 h-1 bg-white/20 rounded-full"></div>

                                    {/* Progress bar fill */}
                                    <div
                                        className="absolute left-0 top-8 h-1 rounded-full transition-all duration-500"
                                        style={{
                                            width: `${(Object.values(stageStatus).filter(s => s === "completed").length / stages.length) * 100}%`,
                                            background: 'linear-gradient(to right, #fbbf24, #dc2626)',
                                        }}
                                    ></div>

                                    {/* Stage buttons */}
                                    <div className="relative flex justify-between items-center">
                                        {stages.map((stage, index) => {
                                            const isActive = activeStage === index;
                                            const isCompleted = isStageCompleted(index);
                                            const isLocked = isStageLocked(index);
                                            const isClickable = isStageClickable(index);

                                            return (
                                                <button
                                                    key={stage.id}
                                                    onClick={() => handleStageClick(index)}
                                                    disabled={!isClickable}
                                                    className="group flex flex-col items-center relative z-10"
                                                    title={isLocked ? "🔒 This stage is locked" : isCompleted ? "✅ Completed" : "Click to view"}
                                                >
                                                    <div className={`
                                w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center
                                text-2xl md:text-3xl font-montserrat font-bold
                                transition-all duration-300 transform 
                                ${isClickable ? 'hover:scale-110 cursor-pointer' : 'cursor-not-allowed'}
                                border-4 shadow-lg
                                ${isActive
                                                            ? 'border-red-500 shadow-red-500/30 scale-110'
                                                            : isCompleted
                                                                ? 'border-green-400 shadow-green-400/20'
                                                                : isLocked
                                                                    ? 'border-white/20 shadow-none opacity-50'
                                                                    : 'border-amber-400 shadow-amber-400/20'
                                                        }
                                ${isCompleted
                                                            ? `bg-gradient-to-br ${stage.color} text-white`
                                                            : isLocked
                                                                ? 'bg-white/10 text-white/40'
                                                                : isActive
                                                                    ? `bg-gradient-to-br ${stage.color} text-white`
                                                                    : 'bg-white/20 backdrop-blur-sm text-white/80'
                                                        }
                            `}>
                                                        {isCompleted ? '✓' : isLocked ? '🔒' : stage.icon}
                                                    </div>

                                                    {/* Stage Title - COLOR LOGIC FIXED */}
                                                    <span className={`
                                mt-2 text-xs md:text-sm font-montserrat font-medium text-center max-w-[80px] md:max-w-none
                                ${isCompleted
                                                            ? 'text-green-300 font-bold'
                                                            : isActive
                                                                ? 'text-white font-bold drop-shadow-lg'
                                                                : isLocked
                                                                    ? 'text-white/40'
                                                                    : 'text-white/80'
                                                        }
                            `}>
                                                        {stage.title}
                                                    </span>

                                                    {/* Status Text - COLOR LOGIC FIXED */}
                                                    <span className={`
                                text-xs font-montserrat mt-0.5
                                ${isCompleted
                                                            ? 'text-green-300'
                                                            : isActive
                                                                ? 'text-amber-300 font-semibold'
                                                                : isLocked
                                                                    ? 'text-white/30'
                                                                    : 'text-white/60'
                                                        }
                            `}>
                                                        {isLocked ? '🔒 Locked' : isCompleted ? '✅ Completed' : '📋 Pending'}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-12 md:mt-16 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                            <div className={`h-1.5 bg-gradient-to-r ${stages[activeStage].color}`}></div>

                            <div className="p-6 md:p-8 lg:p-10">
                                <div className="flex items-center gap-3 mb-6">
                                    <span className="text-3xl">
                                        {isStageLocked(activeStage) ? '🔒' : isStageCompleted(activeStage) ? '✅' : stages[activeStage].icon}
                                    </span>
                                    <div>
                                        <h3 className="text-xl md:text-2xl font-montserrat font-bold text-gray-800">
                                            {stages[activeStage].title}
                                        </h3>
                                        <p className="text-sm text-gray-500 font-montserrat">
                                            Step {activeStage + 1} of {stages.length}
                                            {isStageLocked(activeStage) && (
                                                <span className="text-red-500 ml-2">🔒 Locked</span>
                                            )}
                                            {isStageCompleted(activeStage) && (
                                                <span className="text-green-500 ml-2">✅ Completed</span>
                                            )}
                                            {!isStageLocked(activeStage) && !isStageCompleted(activeStage) && (
                                                <span className="text-amber-500 ml-2">📋 In Progress</span>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {isStageLocked(activeStage) ? (
                                    <div className="text-center py-12 text-gray-400">
                                        <span className="text-6xl block mb-4">🔒</span>
                                        <p className="font-montserrat text-lg font-medium text-gray-500">This stage is locked</p>
                                        <p className="font-montserrat text-sm text-gray-400 mt-1">Complete the previous stages to unlock</p>
                                    </div>
                                ) : activeStage === 0 ? (
                                    renderForm()
                                ) : (
                                    <div className="text-center py-12 text-gray-400">
                                        <span className="text-6xl block mb-4">⏳</span>
                                        <p className="font-montserrat text-lg font-medium text-gray-500">Awaiting Review</p>
                                        <p className="font-montserrat text-sm text-gray-400 mt-1">Your application is being reviewed. You'll be notified when this stage becomes available.</p>
                                    </div>
                                )}

                                <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-100">
                                    <button
                                        onClick={() => setActiveStage(Math.max(0, activeStage - 1))}
                                        disabled={activeStage === 0 || isStageLocked(activeStage - 1)}
                                        className={`
                    px-6 py-2.5 rounded-lg font-montserrat font-medium transition-all duration-300
                    ${activeStage === 0 || isStageLocked(activeStage - 1)
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
                                            }
                  `}
                                    >
                                        ← Previous
                                    </button>

                                    <div className="flex items-center gap-3">
                                        <span className="text-sm text-gray-500 font-montserrat">
                                            {activeStage + 1} / {stages.length}
                                        </span>
                                        <div className="flex gap-1">
                                            {stages.map((_, idx) => {
                                                const status = stageStatus[idx];
                                                return (
                                                    <div
                                                        key={idx}
                                                        className={`w-2 h-2 rounded-full transition-all duration-300
                            ${idx === activeStage ? 'w-6 bg-red-600' :
                                                                status === 'completed' ? 'bg-green-500' :
                                                                    status === 'pending' ? 'bg-amber-400' :
                                                                        'bg-gray-300'}
                          `}
                                                    ></div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setActiveStage(Math.min(stages.length - 1, activeStage + 1))}
                                        disabled={activeStage === stages.length - 1 || isStageLocked(activeStage + 1)}
                                        className={`
                    px-6 py-2.5 rounded-lg font-montserrat font-medium transition-all duration-300
                    ${activeStage === stages.length - 1 || isStageLocked(activeStage + 1)
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                : 'bg-gradient-to-r from-red-600 to-amber-500 text-white hover:shadow-lg hover:shadow-red-300/50 hover:scale-105'
                                            }
                  `}
                                    >
                                        Next →
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}