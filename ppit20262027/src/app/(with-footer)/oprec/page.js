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
    const [formSubmitted, setFormSubmitted] = useState(false);
    const [isRejected, setIsRejected] = useState(false);
    const [rejectedStage, setRejectedStage] = useState(-1);

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

    // Written Test state
    const [testFile, setTestFile] = useState(null);
    const [testFileError, setTestFileError] = useState("");
    const [testSubmitting, setTestSubmitting] = useState(false);
    const [testSubmitSuccess, setTestSubmitSuccess] = useState(false);

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
            title: "Accepted",
            icon: "🏆",
            color: "from-red-700 to-red-900",
        },
    ];

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

                    // Check if application already exists
                    const appRef = doc(db, "applications", u.uid);
                    const appSnap = await getDoc(appRef);

                    if (appSnap.exists()) {
                        const appData = appSnap.data();
                        setApplicationData(appData);
                        const stage = appData.currentStage || 0;
                        setCurrentStage(stage);
                        setActiveStage(stage > 3 ? 0 : stage);
                        setFormSubmitted(true);

                        // Check if rejected (currentStage === 4)
                        if (stage === 4) {
                            setIsRejected(true);
                            setRejectedStage(appData.rejectedAtStage || 0);
                        } else {
                            setIsRejected(false);
                        }
                    } else {
                        // No application yet - set initial state
                        setCurrentStage(0);
                        setActiveStage(0);
                        setFormSubmitted(false);
                        setIsRejected(false);
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

    // ─── STAGE HELPER FUNCTIONS ──────────────────────────────
    // currentStage meanings:
    // 0 = Stage 0 completed, waiting for Stage 1 (Written Test)
    // 1 = Stage 1 completed, waiting for Stage 2 (Interview)
    // 2 = Stage 2 completed, waiting for Stage 3 (Acceptance)
    // 3 = Stage 3 completed ✅ Accepted
    // 4 = Rejected ❌ (hide timeline)

    const isStageClickable = (stageIndex) => {
        if (isRejected) return false;
        // Can click on completed stages (0 to currentStage) and the pending stage (currentStage + 1)
        return stageIndex <= currentStage + 1;
    };

    const isStageCompleted = (stageIndex) => {
        if (isRejected) return false;
        // Completed if index is less than or equal to currentStage
        return stageIndex <= currentStage;
    };

    const isStageLocked = (stageIndex) => {
        if (isRejected) return true;
        // Locked if index is greater than currentStage + 1 (beyond the pending stage)
        return stageIndex > currentStage + 1;
    };

    const isStagePending = (stageIndex) => {
        if (isRejected) return false;
        // Pending if index is exactly currentStage + 1
        return stageIndex === currentStage + 1;
    };

    const handleStageClick = (index) => {
        if (isStageClickable(index) && !isRejected) {
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
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: "" }));
        }
    };

    const handleFileChange = (e, field) => {
        const file = e.target.files[0];
        if (file) {
            if (file.type !== "application/pdf") {
                setFormErrors(prev => ({ ...prev, [field]: "File must be PDF format" }));
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                setFormErrors(prev => ({ ...prev, [field]: "File must be under 5MB" }));
                return;
            }
            setFormData(prev => ({ ...prev, [field]: file }));
            setFormErrors(prev => ({ ...prev, [field]: "" }));
        }
    };

    const handleTestFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.type !== "application/pdf") {
                setTestFileError("File must be PDF format");
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                setTestFileError("File must be under 5MB");
                return;
            }
            setTestFile(file);
            setTestFileError("");
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

    const downloadTestDocument = () => {
        const cloudinaryUrl = 'https://res.cloudinary.com/dfcheu2em/raw/upload/v1788020245/TEMPLATE_TES_TERTULIS_26_27.docx';

        fetch(cloudinaryUrl)
            .then(response => response.blob())
            .then(blob => {
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', `${applicationData?.candidateId || 'applicant'}.docx`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            })
            .catch(error => {
                console.error('Error downloading file:', error);
                alert('Failed to download test document. Please try again.');
            });
    };

    const getNextCandidateId = async (divisionName) => {
        try {
            const division = divisions.find(d => d.name === divisionName);
            if (!division) {
                throw new Error(`Invalid division: ${divisionName}`);
            }

            const counterRef = doc(db, "applicationsCounter", division.code);
            const counterSnap = await getDoc(counterRef);

            let currentCount = 0;
            if (counterSnap.exists()) {
                currentCount = counterSnap.data().count || 0;
            }

            const newCount = currentCount + 1;
            await setDoc(counterRef, { count: newCount });

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
            const [statementUrl, cvUrl] = await Promise.all([
                uploadFileToCloudinary(formData.statementFile, 'statement'),
                uploadFileToCloudinary(formData.cvFile, 'cv')
            ]);

            const candidateId = await getNextCandidateId(formData.firstChoice);

            const applicationData = {
                uid: user.uid,
                candidateId: candidateId,
                division: formData.firstChoice,
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
                submittedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await setDoc(doc(db, "applications", user.uid), applicationData);

            await updateDoc(doc(db, "users", user.uid), {
                submittedForms: arrayUnion("recruitment_2026")
            });

            setApplicationData(applicationData);
            setCurrentStage(0);
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

    const handleTestSubmit = async () => {
        if (!testFile) {
            setTestFileError("Please upload your test file");
            return;
        }

        setTestSubmitting(true);
        try {
            const testUrl = await uploadFileToCloudinary(testFile, 'test');

            const appRef = doc(db, "applications", user.uid);
            await updateDoc(appRef, {
                testUrl: testUrl,
                testSubmittedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            setTestSubmitSuccess(true);
            setTimeout(() => setTestSubmitSuccess(false), 3000);

            const appSnap = await getDoc(appRef);
            if (appSnap.exists()) {
                const appData = appSnap.data();
                setApplicationData(appData);
                setCurrentStage(appData.currentStage || 0);
            }

            setTestFile(null);
            const fileInput = document.querySelector('input[type="file"][accept=".pdf"]');
            if (fileInput) fileInput.value = '';

        } catch (error) {
            console.error("Error submitting test:", error);
            alert("Failed to submit test. Please try again.");
        } finally {
            setTestSubmitting(false);
        }
    };

    // ─── RENDER FUNCTIONS ──────────────────────────────────────

    const renderForm = () => {
        if (formSubmitted) {
            return (
                <div className="text-center py-8">
                    <div className="text-6xl mb-4">✅</div>
                    <h3 className="text-2xl font-bold text-green-600 mb-2">Form Submitted Successfully!</h3>
                    <p className="text-gray-500">Your application has been received.</p>
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
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <p className="text-red-700 text-sm font-medium">
                        ⚠️ Peringatan: Progress tidak akan disimpan sampai Anda menekan tombol "Submit".
                        Pastikan semua data sudah benar sebelum mengirim.
                    </p>
                </div>

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

                {submitError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-red-700 text-sm">{submitError}</p>
                    </div>
                )}

                {submitSuccess && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-green-700 text-sm">✅ Form berhasil dikirim!</p>
                    </div>
                )}

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

    const renderWrittenTest = () => {
        const hasSubmitted = applicationData?.testUrl;
        // currentStage = 0: Stage 0 complete, Stage 1 pending (show test upload)
        // currentStage = 1: Stage 1 complete, Stage 2 pending (test completed)
        // currentStage >= 2: Test is completed (already moved to interview or beyond)
        const isCompleted = currentStage >= 1;
        const isPending = currentStage === 0;
        const isTestReleased = true;

        const isLate = () => {
            if (!applicationData?.testSubmittedAt) return false;
            const deadline = new Date('2026-09-16T23:59:00+08:00');
            const submittedDate = new Date(applicationData.testSubmittedAt);
            return submittedDate > deadline;
        };

        const submissionIsLate = isLate();

        if (!isTestReleased) {
            return (
                <div className="text-center py-12">
                    <div className="text-6xl mb-4">⏳</div>
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">Waiting for Test Release</h3>
                    <p className="text-gray-500 max-w-md mx-auto">
                        The written test has not been released yet. Please check back later for updates.
                    </p>
                    <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg max-w-md mx-auto">
                        <p className="text-sm text-gray-600">
                            📌 You will be notified once the test is available.
                        </p>
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold text-blue-800 mb-2">📋 Peraturan</h4>
                    <ul className="text-sm text-gray-700 space-y-2 list-disc list-inside">
                        <li>Maksimal 3000 kata (termasuk soal)</li>
                        <li>Font 'Times New Roman', Size 12, Spacing 1.5</li>
                        <li>DEADLINE: 23:59 BJT, 16 September 2026</li>
                        <li>Jawab semua pertanyaan langsung di bawah soal yang sudah disediakan</li>
                        <li>Upload file Anda ke kolom yang sudah disediakan di bawah</li>
                        <li>DILARANG menyertakan informasi pribadi di dalam dokumen tes <i>(peserta akan bersifat anonim terhadap penguji untuk menghindari kecurangan)</i>.</li>
                        <li>DILARANG KERAS menggunakan bantuan AI dalam bentuk apapun, apabila terdeteksi adanya indikator penggunaan AI, Anda akan didiskualifikasi secara langsung.</li>
                    </ul>
                    <h4 className="font-semibold text-sm text-gray-800 mt-4">Catatan: Silahkan download test file menggunakan tombol di sebelah kanan kolom. All the best!</h4>
                </div>

                {hasSubmitted ? (
                    <div className={`rounded-lg p-6 text-center ${isCompleted
                        ? 'bg-green-50 border border-green-200'
                        : submissionIsLate
                            ? 'bg-amber-50 border border-amber-200'
                            : isPending
                                ? 'bg-blue-50 border border-blue-200'
                                : 'bg-gray-50 border border-gray-200'
                        }`}>
                        <div className="text-4xl mb-2">
                            {isCompleted
                                ? '🎉'
                                : submissionIsLate
                                    ? '⚠️'
                                    : isPending
                                        ? '✅'
                                        : '📝'}
                        </div>
                        <p className={`font-semibold ${isCompleted
                            ? 'text-green-700'
                            : submissionIsLate
                                ? 'text-amber-700'
                                : isPending
                                    ? 'text-blue-700'
                                    : 'text-gray-700'
                            }`}>
                            {isCompleted
                                ? 'Congratulations! You have passed the Written Test stage!'
                                : submissionIsLate
                                    ? 'Your test has been submitted, but it was LATE.'
                                    : isPending
                                        ? 'Your test has been submitted successfully!'
                                        : 'Test submitted'}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                            {isCompleted
                                ? 'You may now proceed to the Interview stage. Please check back for your interview schedule.'
                                : submissionIsLate
                                    ? 'Your submission was received after the deadline. This may affect your evaluation.'
                                    : isPending
                                        ? 'Your submission is being reviewed by the recruitment team.'
                                        : 'Status: Unknown'}
                        </p>
                        {isCompleted && (
                            <div className="mt-3 p-3 bg-green-100 rounded-lg">
                                <p className="text-sm text-green-700">
                                    ✅ Stage completed! The Interview stage will be available once the admin schedules your interview.
                                </p>
                            </div>
                        )}
                        {submissionIsLate && (
                            <div className="mt-3 p-3 bg-amber-100 rounded-lg">
                                <p className="text-sm text-amber-700">
                                    ⚠️ Please contact the recruitment team if you have any concerns.
                                </p>
                            </div>
                        )}
                        {isPending && !submissionIsLate && (
                            <div className="mt-3 p-3 bg-blue-100 rounded-lg">
                                <p className="text-sm text-blue-700">
                                    ⏳ Please wait while the recruitment team reviews your submission.
                                </p>
                            </div>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                            Submitted on: {new Date(applicationData.testSubmittedAt).toLocaleString()}
                            {submissionIsLate && (
                                <span className="text-amber-600 ml-2 font-medium">(⚠️ Late Submission)</span>
                            )}
                            {!submissionIsLate && isPending && (
                                <span className="text-green-600 ml-2 font-medium">(✅ On Time)</span>
                            )}
                        </p>
                        {applicationData.testUrl && (
                            <button
                                onClick={() => window.open(applicationData.testUrl, '_blank')}
                                className="mt-3 text-blue-600 hover:text-blue-800 text-sm font-medium underline"
                            >
                                View Your Submission
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-sm font-medium text-gray-500">
                                    Test Document <span className="text-red-500">*</span>
                                </label>
                                <button
                                    onClick={downloadTestDocument}
                                    className="text-sm text-red-600 hover:text-red-800 font-medium flex items-center gap-1"
                                >
                                    📄 Download Test
                                </button>
                            </div>

                            <div className={`flex items-center gap-3 p-3 rounded-lg border ${testFileError ? 'border-red-500' : 'border-gray-300'}`}>
                                <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={handleTestFileChange}
                                    className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors"
                                />
                                {testFile && (
                                    <span className="text-sm text-green-600">✓ {testFile.name}</span>
                                )}
                            </div>
                            {testFileError && <p className="text-red-500 text-sm mt-1">{testFileError}</p>}
                            <p className="text-xs text-gray-400 mt-1">Upload your completed test in PDF format (max 5MB)</p>
                        </div>

                        {testSubmitSuccess && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <p className="text-green-700 text-sm">✅ Test submitted successfully! Your submission is now being reviewed.</p>
                            </div>
                        )}

                        <button
                            onClick={handleTestSubmit}
                            disabled={testSubmitting}
                            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold py-3 px-6 rounded-lg hover:shadow-lg hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {testSubmitting ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                                    Submitting...
                                </span>
                            ) : (
                                "Submit Test"
                            )}
                        </button>
                    </>
                )}
            </div>
        );
    };

    const renderInterview = () => {
        const hasInterviewDetails = applicationData?.interviewDateTime && applicationData?.interviewLocation;

        // currentStage = 1: Stage 1 complete, Stage 2 pending (show interview schedule or waiting)
        // currentStage >= 2: Stage 2 complete (interview completed)
        // currentStage >= 3: Accepted
        if (currentStage >= 2) {
            return (
                <div className="text-center py-12">
                    <div className="text-6xl mb-4">✅</div>
                    <h3 className="text-xl font-semibold text-green-600 mb-2">Interview Completed!</h3>
                    <p className="text-gray-600 max-w-md mx-auto">
                        You have successfully completed your interview.
                    </p>
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg max-w-md mx-auto">
                        <p className="text-sm text-gray-700">
                            🎯 We are reviewing all candidates.
                            You will be notified once the final decision has been made.
                        </p>
                    </div>
                    {applicationData.interviewDateTime && (
                        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg max-w-md mx-auto">
                            <p className="text-xs text-gray-500">Interview Date:</p>
                            <p className="text-sm font-medium text-gray-700">
                                {new Date(applicationData.interviewDateTime).toLocaleString('id-ID', {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </p>
                        </div>
                    )}
                    <div className="mt-4 text-sm text-gray-500">
                        ⏳ Please check Stage 3 for the final results.
                    </div>
                </div>
            );
        }

        if (!hasInterviewDetails) {
            return (
                <div className="text-center py-12">
                    <div className="text-6xl mb-4">⏳</div>
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">Waiting for Interview Schedule</h3>
                    <p className="text-gray-500 max-w-md mx-auto">
                        Your interview time and place are being finalized.
                        Please check back here for updates.
                    </p>
                    <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg max-w-md mx-auto">
                        <p className="text-sm text-gray-600">
                            📌 You will receive a notification once your interview schedule is confirmed.
                        </p>
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-6">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                    <div className="flex items-start gap-3 mb-4">
                        <span className="text-3xl">🎯</span>
                        <div>
                            <h4 className="font-semibold text-purple-800 text-lg">Your Interview Schedule</h4>
                            <p className="text-sm text-gray-600 mt-1">Please be punctual for your interview session</p>
                        </div>
                    </div>

                    <div className="space-y-3 mt-4">
                        <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-purple-100">
                            <span className="text-xl">🕐</span>
                            <div>
                                <p className="text-xs text-gray-500 font-medium">Interview Time</p>
                                <p className="text-gray-800 font-semibold">
                                    {new Date(applicationData.interviewDateTime).toLocaleString('id-ID', {
                                        weekday: 'long',
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-purple-100">
                            <span className="text-xl">📍</span>
                            <div>
                                <p className="text-xs text-gray-500 font-medium">Interview Location</p>
                                <p className="text-gray-800 font-semibold">{applicationData.interviewLocation}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => window.location.href = `mailto:recruitment@ppitsz.com`}
                    className="w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white font-bold py-3 px-6 rounded-lg hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
                >
                    📧 Need Help? Contact Us
                </button>
            </div>
        );
    };

    const renderAccepted = () => {
        // currentStage = 2: Stage 2 complete, Stage 3 pending (waiting for acceptance decision)
        // currentStage = 3: Accepted
        if (currentStage === 2) {
            return (
                <div className="text-center py-12">
                    <div className="text-6xl mb-4">⏳</div>
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">Interview Under Review</h3>
                    <p className="text-gray-500 max-w-md mx-auto">
                        Thank you for completing your interview. We are currently reviewing your performance.
                    </p>
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-md mx-auto">
                        <p className="text-sm text-gray-600">
                            📌 You will be notified once the final decision has been made.
                            Please check back for updates.
                        </p>
                    </div>
                </div>
            );
        }

        return (
            <div className="text-center py-8">
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-2xl font-bold text-green-600 mb-2">Congratulations!</h3>
                <p className="text-gray-600 text-lg">You have been accepted to join PPIT Shenzhen 2026/2027!</p>
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg max-w-md mx-auto">
                    <p className="text-sm text-gray-700">
                        Welcome to the team! Further instructions will be sent to your registered email.
                        We're excited to have you on board! 🚀
                    </p>
                </div>
                {applicationData?.candidateId && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg inline-block">
                        <p className="text-sm text-gray-600">Your Candidate ID:</p>
                        <p className="text-xl font-bold text-red-600">{applicationData.candidateId}</p>
                    </div>
                )}
            </div>
        );
    };

    const renderRejection = () => {
        const stageLabel = rejectedStage !== -1 ? stages[rejectedStage].title : "the selection process";

        return (
            <div className="text-center py-8">
                <div className="text-6xl mb-4">😔</div>
                <h3 className="text-2xl font-bold text-red-600 mb-2">We Appreciate Your Interest</h3>
                <div className="max-w-2xl mx-auto space-y-4">
                    <p className="text-gray-700 text-lg">
                        Thank you for your interest in joining PPIT Shenzhen 2026/2027.
                    </p>
                    <p className="text-gray-600">
                        After careful consideration, we regret to inform you that your application
                        was not selected to proceed further from the <strong>"{stageLabel}"</strong> stage.
                    </p>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                        <p className="text-gray-700 text-sm">
                            We received many qualified applications this year, and the selection process
                            was extremely competitive. We encourage you to continue developing your skills
                            and hope you'll consider applying again in the future.
                        </p>
                    </div>
                    <div className="mt-6">
                        <p className="text-gray-500 text-sm">
                            💪 We wish you all the best in your future endeavors!
                        </p>
                        <p className="text-gray-400 text-xs mt-2">
                            - PPIT Shenzhen Recruitment Team
                        </p>
                    </div>
                </div>
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

    const showRejection = isRejected;

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
                            <div className={`bg-white/10 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-white/10 ${showRejection ? 'opacity-60' : ''}`}>
                                <h2 className="text-xl md:text-2xl font-montserrat font-semibold text-white mb-6">
                                    My Application Progress:
                                </h2>

                                {!showRejection && (
                                    <div className="relative">
                                        <div className="absolute left-0 right-0 top-8 h-1 bg-white/20 rounded-full"></div>

                                        <div
                                            className="absolute left-0 top-8 h-1 rounded-full transition-all duration-500"
                                            style={{
                                                width: `${[25, 55, 85, 100][currentStage] || 0}%`,
                                                background: 'linear-gradient(to right, #fbbf24, #dc2626)',
                                            }}
                                        ></div>

                                        <div className="relative flex justify-between items-center">
                                            {stages.map((stage, index) => {
                                                const isActive = activeStage === index;
                                                const isCompleted = isStageCompleted(index);
                                                const isLocked = isStageLocked(index);
                                                const isClickable = isStageClickable(index);
                                                const isPending = isStagePending(index);

                                                return (
                                                    <button
                                                        key={stage.id}
                                                        onClick={() => handleStageClick(index)}
                                                        disabled={!isClickable || showRejection}
                                                        className="group flex flex-col items-center relative z-10"
                                                        title={isLocked ? "🔒 This stage is locked" : isCompleted ? "✅ Completed" : "Click to view"}
                                                    >
                                                        <div className={`
                                                            w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center
                                                            text-2xl md:text-3xl font-montserrat font-bold
                                                            transition-all duration-300 transform 
                                                            ${isClickable && !showRejection ? 'hover:scale-110 cursor-pointer' : 'cursor-not-allowed'}
                                                            border-4 shadow-lg
                                                            ${isActive
                                                                ? 'border-red-500 shadow-red-500/30 scale-110'
                                                                : isCompleted
                                                                    ? 'border-green-400 shadow-green-400/20'
                                                                    : isLocked || showRejection
                                                                        ? 'border-white/20 shadow-none opacity-50'
                                                                        : 'border-amber-400 shadow-amber-400/20'
                                                            }
                                                            ${isCompleted
                                                                ? `bg-gradient-to-br ${stage.color} text-white`
                                                                : isLocked || showRejection
                                                                    ? 'bg-white/10 text-white/40'
                                                                    : isActive
                                                                        ? `bg-gradient-to-br ${stage.color} text-white`
                                                                        : 'bg-white/20 backdrop-blur-sm text-white/80'
                                                            }
                                                        `}>
                                                            {isCompleted ? '✓' : isLocked || showRejection ? '🔒' : stage.icon}
                                                        </div>

                                                        <span className={`
                                                            mt-2 text-xs md:text-sm font-montserrat font-medium text-center max-w-[80px] md:max-w-none
                                                            ${isCompleted
                                                                ? 'text-green-300 font-bold'
                                                                : isActive
                                                                    ? 'text-white font-bold drop-shadow-lg'
                                                                    : isLocked || showRejection
                                                                        ? 'text-white/40'
                                                                        : 'text-white/80'
                                                            }
                                                        `}>
                                                            {stage.title}
                                                        </span>

                                                        <span className={`
                                                            text-xs font-montserrat mt-0.5
                                                            ${isCompleted
                                                                ? 'text-green-300'
                                                                : isActive
                                                                    ? 'text-amber-300 font-semibold'
                                                                    : isLocked || showRejection
                                                                        ? 'text-white/30'
                                                                        : 'text-white/60'
                                                            }
                                                        `}>
                                                            {isLocked ? '🔒 Locked' : isCompleted ? '✅ Completed' : isPending ? '📋 Pending' : '📋 Pending'}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {showRejection && (
                                    <div className="text-center py-4">
                                        <p className="text-white/60 text-sm font-montserrat">
                                            ❌ Your application was not selected to proceed further.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-12 md:mt-16 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                            {!showRejection && <div className={`h-1.5 bg-gradient-to-r ${stages[activeStage].color}`}></div>}
                            {showRejection && <div className="h-1.5 bg-gradient-to-r from-red-500 to-red-700"></div>}

                            <div className="p-6 md:p-8 lg:p-10">
                                {showRejection ? (
                                    <>
                                        <div className="flex items-center gap-3 mb-6">
                                            <span className="text-3xl">😔</span>
                                            <div>
                                                <h3 className="text-xl md:text-2xl font-montserrat font-bold text-gray-800">
                                                    Application Status
                                                </h3>
                                                <p className="text-sm text-red-500 font-montserrat font-semibold">
                                                    ❌ Not Selected
                                                </p>
                                            </div>
                                        </div>
                                        {renderRejection()}
                                    </>
                                ) : (
                                    <>
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
                                        ) : activeStage === 1 ? (
                                            renderWrittenTest()
                                        ) : activeStage === 2 ? (
                                            renderInterview()
                                        ) : activeStage === 3 ? (
                                            renderAccepted()
                                        ) : (
                                            <div className="text-center py-12 text-gray-400">
                                                <span className="text-6xl block mb-4">⏳</span>
                                                <p className="font-montserrat text-lg font-medium text-gray-500">Awaiting Review</p>
                                                <p className="font-montserrat text-sm text-gray-400 mt-1">Your application is being reviewed. You'll be notified when this stage becomes available.</p>
                                            </div>
                                        )}
                                    </>
                                )}

                                {!showRejection && (
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
                                                    const isCompleted = isStageCompleted(idx);
                                                    const isPending = isStagePending(idx);
                                                    const isLocked = isStageLocked(idx);
                                                    return (
                                                        <div
                                                            key={idx}
                                                            className={`w-2 h-2 rounded-full transition-all duration-300
                                                                ${idx === activeStage ? 'w-6 bg-red-600' :
                                                                    isCompleted ? 'bg-green-500' :
                                                                        isPending ? 'bg-amber-400' :
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
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}