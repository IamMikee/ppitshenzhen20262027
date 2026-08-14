"use client";

import { useState, useEffect } from "react";
import { submitResponse } from "../../services/forms";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { getDoc, doc } from "firebase/firestore";
import { CheckCircle, ArrowLeft, Upload, FileText, AlertCircle } from "lucide-react";

export default function FormClient({ form }) {
  const [user, setUser] = useState(null);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [fileName, setFileName] = useState({});
  const router = useRouter();

  /* Auth check */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
      try {
        const ref = doc(db, "users", u.uid);
        const snapshot = await getDoc(ref);
        const submittedForms = snapshot.data().submittedForms;
        if (submittedForms.includes(form.id)) {
          setFormSubmitted(true);
        }
      } catch (e) {
        console.error("error in checking status" + e)
      }
    });

    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#7E0C0E] border-t-transparent"></div>
          <p className="mt-4 text-gray-500 font-medium">Loading form...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Please Log In</h2>
          <p className="text-gray-500">You need to be logged in to submit this form.</p>
        </div>
      </div>
    );
  }

  if (formSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">📝</div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Already Submitted</h2>
          <p className="text-gray-500 mb-6">You have already submitted this form. Each user can only submit once.</p>
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

  if (submitting) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-sm w-full text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#7E0C0E] border-t-transparent mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-800">Submitting...</h3>
          <p className="text-gray-500 text-sm">Please wait while we process your submission.</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
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
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-[#7E0C0E] px-8 py-6">
            <h1 className="text-2xl font-semibold text-white text-center">
              {form.title}
            </h1>
            {form.description && (
              <p
                className="text-gray-200 text-sm text-center mt-2"
                style={{ whiteSpace: "pre-line" }}
                dangerouslySetInnerHTML={{ __html: form.description }}
              />
            )}
          </div>

          {/* Form Body */}
          <div className="p-8 space-y-8">
            {form.questions.map((q, index) => (
              <div key={q.id} className="space-y-2">
                {/* Question Label */}
                <label
                  className="block text-sm font-medium text-gray-700"
                  style={{ whiteSpace: "pre-line" }}
                  dangerouslySetInnerHTML={{
                    __html: (q.type === "info"
                      ? `<span style="font-weight: normal; color: #6B7280;">${q.label}</span>`
                      : q.label) + (q.required && q.type !== "info" ? ' <span style="color: #EF4444;">*</span>' : '')
                  }}
                />

                {/* Image Display */}
                {q.type === "image" && q.imageUrl && (
                  <div className="rounded-xl overflow-hidden border border-gray-200">
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
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#7E0C0E] focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                    placeholder="Enter your answer..."
                    value={answers[q.id] || ""}
                    onChange={(e) =>
                      setAnswers({ ...answers, [q.id]: e.target.value })
                    }
                  />
                )}

                {/* Textarea */}
                {q.type === "textarea" && (
                  <textarea
                    rows={4}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#7E0C0E] focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white resize-none"
                    placeholder="Enter your answer..."
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
                      className="flex items-center justify-center gap-3 w-full rounded-xl border-2 border-dashed border-gray-300 px-6 py-8 cursor-pointer hover:border-[#7E0C0E] transition-all duration-200 bg-gray-50 hover:bg-gray-100 group"
                    >
                      <Upload size={24} className="text-gray-400 group-hover:text-[#7E0C0E] transition-colors" />
                      <span className="text-gray-500 group-hover:text-gray-700 transition-colors">
                        {fileName[q.id] || "Click to upload or drag and drop"}
                      </span>
                      {fileName[q.id] && <FileText size={18} className="text-[#7E0C0E]" />}
                    </label>
                    {fileName[q.id] && (
                      <p className="text-sm text-gray-500 mt-1">
                        Selected: {fileName[q.id]}
                      </p>
                    )}
                  </div>
                )}

                {/* Radio Options */}
                {q.type === "radio" && q.options && (
                  <div className="space-y-2">
                    {q.options.map((opt) => (
                      <label
                        key={opt}
                        className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-[#7E0C0E] transition-all duration-200 cursor-pointer bg-gray-50 hover:bg-white group"
                      >
                        <input
                          type="radio"
                          name={q.id}
                          value={opt}
                          checked={answers[q.id] === opt}
                          onChange={() =>
                            setAnswers({ ...answers, [q.id]: opt })
                          }
                          className="w-4 h-4 text-[#7E0C0E] focus:ring-[#7E0C0E] focus:ring-offset-0 cursor-pointer"
                        />
                        <span className="text-gray-700 group-hover:text-gray-900 transition-colors">
                          {opt}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                {/* Checkbox Options */}
                {q.type === "checkbox" && q.options && (
                  <div className="space-y-2">
                    {q.options.map((opt) => (
                      <label
                        key={opt}
                        className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-[#7E0C0E] transition-all duration-200 cursor-pointer bg-gray-50 hover:bg-white group"
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
                          className="w-4 h-4 text-[#7E0C0E] focus:ring-[#7E0C0E] focus:ring-offset-0 rounded cursor-pointer"
                        />
                        <span className="text-gray-700 group-hover:text-gray-900 transition-colors">
                          {opt}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || success}
                className="w-full bg-[#7E0C0E] text-white px-8 py-3.5 rounded-xl font-medium
                          hover:bg-[#9E1A1C] transition-all duration-200 shadow-sm hover:shadow-md
                          transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed
                          disabled:transform-none disabled:hover:shadow-sm"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>
                    Submitting...
                  </span>
                ) : success ? (
                  "Submitted ✓"
                ) : (
                  "Submit Form"
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-sm text-gray-500 mt-6">
          * Required fields are marked with <span className="text-red-500">*</span>
        </p>
      </div>
    </div>
  );
}