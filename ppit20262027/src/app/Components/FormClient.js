"use client";

import { useState, useEffect } from "react";
import { submitResponse } from "../../services/forms";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { getDoc, doc } from "firebase/firestore";
import { CheckCircle, ArrowLeft, Upload, FileText, AlertCircle, ArrowRight } from "lucide-react";

export default function FormClient({ form }) {
  const [user, setUser] = useState(null);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formClosed, setFormClosed] = useState(false);
  const [fileName, setFileName] = useState({});
  const router = useRouter();

  /* Auth check */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          // Check form status (isClosed) and user submission together
          const [userSnap, formSnap] = await Promise.all([
            getDoc(doc(db, "users", u.uid)),
            getDoc(doc(db, "forms", form.id))
          ]);

          const submittedForms = userSnap.data()?.submittedForms || [];
          if (submittedForms.includes(form.id)) {
            setFormSubmitted(true);
          }

          if (formSnap.exists() && formSnap.data().isClosed === true) {
            setFormClosed(true);
          }
        } catch (e) {
          console.error("Error checking status:", e);
        }
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Helper function to format description with markdown
  const formatDescription = (text) => {
    if (!text) return "";
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/__(.*?)__/g, '<u>$1</u>')
      .replace(/\n/g, '<br>');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#7E0C0E] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
          <p className="mt-4 text-white/70 font-medium">Loading form...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#7E0C0E] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Please Log In</h2>
          <p className="text-gray-500">You need to be logged in to submit this form.</p>
        </div>
      </div>
    );
  }

  if (formClosed) {
    return (
      <div className="min-h-screen bg-[#7E0C0E] flex items-center justify-center p-6 font-montserrat">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
              <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Form is Closed</h2>
            <div className="h-1 w-16 bg-[#7E0C0E] mx-auto rounded-full mb-4"></div>
            <p className="text-gray-600 mb-4">This form is currently closed and not accepting new submissions.</p>
            <p className="text-gray-400 text-sm mb-6">Please contact the administrator if you have questions.</p>
            <button
              onClick={() => router.push('/form')}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#7E0C0E] text-white rounded-lg hover:bg-[#9E1A1C] transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
            >
              <ArrowLeft size={18} />
              Back to Forms
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (formSubmitted) {
    return (
      <div className="min-h-screen bg-[#7E0C0E] flex items-center justify-center p-6 font-montserrat">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
              <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Already Submitted</h2>
            <div className="h-1 w-16 bg-[#7E0C0E] mx-auto rounded-full mb-4"></div>
            <p className="text-gray-600 mb-4">You have already submitted this form.</p>
            <p className="text-gray-400 text-sm mb-6">Each user can only submit once.</p>
            <button
              onClick={() => router.push('/form')}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#7E0C0E] text-white rounded-lg hover:bg-[#9E1A1C] transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
            >
              <ArrowLeft size={18} />
              Back to Forms
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (submitting) {
    return (
      <div className="min-h-screen bg-[#7E0C0E] flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#7E0C0E] border-t-transparent mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-800">Submitting...</h3>
          <p className="text-gray-500 text-sm">Please wait while we process your submission.</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#7E0C0E] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle size={64} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Thank You!</h2>
          <p className="text-gray-500 mb-1">Your response has been submitted successfully.</p>
          <p className="text-gray-400 text-sm mb-6">We appreciate your time and input.</p>
          <button
            onClick={() => router.push('/form')}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#7E0C0E] text-white rounded-lg hover:bg-[#9E1A1C] transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
          >
            <ArrowLeft size={18} />
            Back to Forms
          </button>
        </div>
      </div>
    );
  }

  /* Validation check */
  const validateRequired = () => {
    for (const q of form.questions) {
      if (q.required && q.type !== "info") {
        const value = answers[q.id];
        if (
          value === undefined ||
          value === "" ||
          (Array.isArray(value) && value.length === 0) ||
          (value instanceof File && value.size === 0)
        ) {
          throw new Error(`Please fill required field: ${q.label}`);
        }
      }
    }
  };

  /* Submit */
  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      validateRequired();

      const processedAnswers = { ...answers };

      for (const q of form.questions) {
        if (q.type === "file" && answers[q.id]) {
          const file = answers[q.id];

          if (file.size > 5 * 1024 * 1024) {
            throw new Error("File must be under 5MB");
          }

          const formData = new FormData();
          formData.append("file", file);
          formData.append(
            "upload_preset",
            process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
          );
          formData.append("folder", "Form");
          formData.append("public_id", `${form.id}_${user.uid}_${Date.now()}`);

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
          processedAnswers[q.id] = data.secure_url;
        }
      }

      await submitResponse(form.id, form.questions, processedAnswers);

      setSuccess(true);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#7E0C0E] py-12 px-4 pt-24 font-montserrat">
      <div className="max-w-4xl mx-auto">
        {/* Form Header Card - Single box with outline and white background */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border-2 border-[#7E0C0E] mb-6">
          {/* Header with white background and black text */}
          <div className="px-8 py-8 bg-white border-b border-gray-200">
            <h1 className="text-4xl font-bold text-gray-900 text-center leading-snug tracking-tight mb-8">
              {form.title}
            </h1>
            {form.description && (
              <div
                className="text-gray-600 text-sm text-center mt-3 leading-relaxed max-w-2xl mx-auto"
                style={{ whiteSpace: "pre-line" }}
                dangerouslySetInnerHTML={{ __html: formatDescription(form.description) }}
              />
            )}
          </div>
        </div>

        {/* Question Cards - Each in its own box */}
        <div className="space-y-4 mt-3">
          {form.questions.map((q, index) => (
            <div key={q.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-7 py-9">
                {/* Question Label - slightly smaller */}
                <div className="flex items-start gap-1 mb-4">
                  <label
                    className="text-[18px] font-semibold text-gray-800"
                    style={{ whiteSpace: "pre-line" }}
                    dangerouslySetInnerHTML={{
                      __html: (q.type === "info"
                        ? `<span style="font-weight: 800; color: #6B7280; font-size: 15px;">${q.label}</span>`
                        : q.label) + (q.required && q.type !== "info" ? ' <span style="color: #D32F2F;">*</span>' : '')
                    }}
                  />
                </div>

                {/* Image Display */}
                {q.type === "image" && q.imageUrl && (
                  <div className="rounded-lg overflow-hidden border border-gray-200 mb-2">
                    <img
                      src={q.imageUrl}
                      alt="Form content"
                      className="w-full h-auto object-cover"
                    />
                  </div>
                )}

                {/* Text Input */}
                {q.type === "text" && (
                  <input
                    type="text"
                    className="w-full border-0 border-b-2 border-gray-300 px-0 py-2 text-gray-800 text-[14px] focus:outline-none focus:border-[#7E0C0E] transition-colors duration-200 bg-transparent"
                    placeholder="Your answer"
                    value={answers[q.id] || ""}
                    onChange={(e) =>
                      setAnswers({ ...answers, [q.id]: e.target.value })
                    }
                  />
                )}

                {/* Textarea */}
                {q.type === "textarea" && (
                  <textarea
                    rows={3}
                    className="w-full border-0 border-b-2 border-gray-300 px-0 py-2 text-gray-800 text-[14px] focus:outline-none focus:border-[#7E0C0E] transition-colors duration-200 bg-transparent resize-none"
                    placeholder="Your answer"
                    value={answers[q.id] || ""}
                    onChange={(e) =>
                      setAnswers({ ...answers, [q.id]: e.target.value })
                    }
                  />
                )}

                {/* File Upload */}
                {q.type === "file" && (
                  <div className="relative">
                    <input
                      type="file"
                      id={`file-${q.id}`}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setAnswers({ ...answers, [q.id]: file });
                          setFileName({ ...fileName, [q.id]: file.name });
                        }
                      }}
                    />
                    <label
                      htmlFor={`file-${q.id}`}
                      className="flex items-center justify-center gap-3 w-full rounded-lg border-2 border-dashed border-gray-300 px-6 py-7 cursor-pointer hover:border-[#7E0C0E] transition-all duration-200 bg-gray-50 hover:bg-gray-100 group"
                    >
                      <Upload size={22} className="text-gray-400 group-hover:text-[#7E0C0E] transition-colors" />
                      <span className="text-gray-500 group-hover:text-gray-700 transition-colors text-[18px]">
                        {fileName[q.id] || "Upload file"}
                      </span>
                      {fileName[q.id] && <FileText size={16} className="text-[#7E0C0E]" />}
                    </label>
                    {fileName[q.id] && (
                      <p className="text-[12px] text-gray-500 mt-1">
                        {fileName[q.id]}
                      </p>
                    )}
                  </div>
                )}

                {/* Radio Options */}
                {q.type === "radio" && q.options && (
                  <div className="space-y-1.5">
                    {q.options.map((opt) => (
                      <label
                        key={opt}
                        className="flex items-center gap-3 cursor-pointer group"
                      >
                        <input
                          type="radio"
                          name={q.id}
                          value={opt}
                          checked={answers[q.id] === opt}
                          onChange={() =>
                            setAnswers({ ...answers, [q.id]: opt })
                          }
                          className="w-3.5 h-3.5 text-[#7E0C0E] focus:ring-[#7E0C0E] focus:ring-offset-0 cursor-pointer"
                        />
                        <span className="text-[15px] text-gray-700 group-hover:text-gray-900 transition-colors">
                          {opt}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                {/* Checkbox Options */}
                {q.type === "checkbox" && q.options && (
                  <div className="space-y-1.5">
                    {q.options.map((opt) => (
                      <label
                        key={opt}
                        className="flex items-center gap-3 cursor-pointer group"
                      >
                        <input
                          type="checkbox"
                          value={opt}
                          checked={(answers[q.id] || []).includes(opt)}
                          onChange={(e) => {
                            setAnswers((prevAnswers) => {
                              const prev = prevAnswers[q.id] || [];
                              return {
                                ...prevAnswers,
                                [q.id]: e.target.checked
                                  ? [...prev, opt]
                                  : prev.filter((v) => v !== opt),
                              };
                            });
                          }}
                          className="w-3.5 h-3.5 text-[#7E0C0E] focus:ring-[#7E0C0E] focus:ring-offset-0 rounded cursor-pointer"
                        />
                        <span className="text-[15px] text-gray-700 group-hover:text-gray-900 transition-colors">
                          {opt}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
            <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-600 text-xs">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <div className="mt-6 flex items-center gap-4 font-montserrat">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || success}
            className="relative bg-white text-[#7E0C0E] px-8 py-3 rounded-lg font-semibold text-sm
              hover:bg-gray-100 hover:shadow-lg transition-all duration-200 
              active:scale-95 active:shadow-sm
              disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
              shadow-md border-2 border-white hover:border-[#7E0C0E]/20
              overflow-hidden group"
          >
            {/* Ripple effect background */}
            <span className="absolute inset-0 bg-gradient-to-r from-[#7E0C0E]/0 via-[#7E0C0E]/5 to-[#7E0C0E]/0 
                     translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out">
            </span>

            <span className="relative flex items-center justify-center gap-2">
              {submitting ? (
                <>
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-[#7E0C0E] border-t-transparent"></span>
                  <span>Submitting...</span>
                </>
              ) : success ? (
                <>
                  <CheckCircle size={16} className="text-green-500" />
                  <span>Submitted ✓</span>
                </>
              ) : (
                <>
                  <span>Submit</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-200" />
                </>
              )}
            </span>
          </button>
          <span className="text-xs text-white/70 font-medium">
            * Required fields
          </span>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-white/40 mt-6">
          Never submit passwords through this form.
        </p>
      </div>
    </div>
  );
}