// use http://localhost:3000/form/YgJDVQi8Te6c6oHu1J4Z for testing design
// use http://localhost:3000/form/ibRFcVaV4KFNYleAhq6W for testing submit form

"use client";

import { useState, useEffect } from "react";
import { submitResponse } from "../../../../services/forms";
import { auth, db } from "../../../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { getDoc, doc } from "firebase/firestore";

export default function FormClient({ form }) {
  const [user, setUser] = useState(null);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
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
        if(submittedForms.includes(form.id)) {
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
      <div style={{ minHeight: "100vh", backgroundColor: "#7E0C0E", fontFamily: "Arial, sans-serif", margin: 0, padding: 0 }}>
        <div className="font-montserrat" style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3rem", fontWeight: "bolder" }}>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#7E0C0E", fontFamily: "Arial, sans-serif", margin: 0, padding: 0 }}>
        <div className="font-montserrat" style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3rem", fontWeight: "bolder" }}>Please log in to submit this form.</div>
      </div>
    );
  }

  if (formSubmitted) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", backgroundColor: "#7E0C0E", fontFamily: "Arial, sans-serif", margin: 0, padding: 0, gap: "1rem" }}>
        <div className="font-montserrat" style={{ fontSize: "2rem", fontWeight: "bold" }}>Form can only be filled once.</div>
        <button onClick={() => router.push('/form')} className="underline hover:text-white text-lg md:text-base text-gray-300">
          Go back to forms page
        </button>
      </div>
    )
  }

  if (submitting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#7E0C0E] text-white">
        <p className="text-lg font-semibold animate-pulse">
          Submitting form…
        </p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#7E0C0E] font-montserrat text-center px-6">
        
        <h1 className="text-3xl md:text-3xl font-semibold uppercase mb-1 text-white">
          {form.title}
        </h1>

        <h2 className="text-2xl md:text-3xl font-semibold uppercase mb-8 text-white">
          Registration Form
        </h2>

        <p className="text-base md:text-md mb-1 text-gray-300">
          Thank you for your registration.
        </p>

        <button
          onClick={() => router.push("/form")}
          className="underline hover:text-white text-md md:text-base text-gray-300"
        >
          Go back to forms page
        </button>
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
          (Array.isArray(value) && value.length === 0)||
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
          formData.append("public_id",`${form.id}_${user.uid}_${Date.now()}`);

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
    <div className="min-h-screen bg-[#7E0C0E] font-montserrat flex justify-center pt-[140px] pb-20">
      <div className="w-full max-w-2xl px-6 text-white">
        <h1 className="text-2xl font-semibold text-center uppercase">
          {form.title}
        </h1>

        <p
          className="text-sm text-center text-gray-200 mt-2 mb-10"
          style={{ whiteSpace: "pre-line" }}
          dangerouslySetInnerHTML={{ __html: form.description }}
        />

        {form.questions.map((q) => (
          <div key={q.id} className="mb-8">
            {/* TITLE/LABEL */}
            <label
              className="block mb-3 text-lg font-semibold"
              style={{ whiteSpace: "pre-line" }}
              dangerouslySetInnerHTML={{
                __html:
                  (q.type === "info"
                    ? `<span style="font-weight: normal;">${q.label}</span>`
                    : q.label) +
                  (q.required && q.type !== "info" ? " *" : ""),
              }}
            />

            {/* TEXTAREA (COMMENTS) */}
            {q.type === "textarea" && (
              <textarea
                rows={4}
                className="w-full rounded bg-[#B88C8C] px-3 py-2 text-black focus:outline-none resize-none"
                value={answers[q.id] || ""}
                onChange={(e) =>
                  setAnswers({ ...answers, [q.id]: e.target.value })
                }
              />
            )}

            {/* FILE UPLOAD */}
            {q.type === "file" && (
              <input
                type="file"
                className="block text-sm text-white
                          file:mr-4 file:rounded
                          file:border-0
                          file:bg-[#B88C8C]
                          file:px-4 file:py-2
                          file:text-black
                          hover:file:opacity-90"
                onChange={(e) =>
                  setAnswers({ ...answers, [q.id]: e.target.files[0] })
                }
              />
            )}

            {q.type === "image" && q.imageUrl && (
              <img
                src={q.imageUrl}
                alt="Form content"
                style={{
                  width: "100%",
                  borderRadius: "0.5rem",
                  marginBottom: "1rem"
                }}
              />
            )}

            {/* TEXT */}
            {q.type === "text" && (
              <input
                className="w-full rounded bg-[#B88C8C] px-3 py-2 text-black focus:outline-none"
                value={answers[q.id] || ""}
                onChange={(e) =>
                  setAnswers({ ...answers, [q.id]: e.target.value })
                }
              />
            )}

            {/* RADIO */}
            {q.type === "radio" &&
              q.options?.map((opt) => (
                <label key={opt} className="flex items-center gap-3 text-sm mb-1">
                  <input
                    type="radio"
                    name={q.id}
                    value={opt}
                    checked={answers[q.id] === opt}
                    onChange={() =>
                      setAnswers({ ...answers, [q.id]: opt })
                    }
                    className="accent-black"
                  />
                  {opt}
                </label>
              ))}

            {/* CHECKBOX */}
            {q.type === "checkbox" &&
              q.options?.map((opt) => (
                <label key={opt} className="flex items-center gap-3 text-sm mb-1">
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
                    className="accent-black"
                  />
                  {opt}
                </label>
              ))}

          </div>
        ))}

        {error && <p style={{ color: "red" }}>{error}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || success}
          className="bg-white text-[#7A1E1E] px-8 py-2 rounded font-semibold
                    hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Submitting..." : success ? "Submitted" : "Submit"}
        </button>
      </div>
    </div>
  );
}

