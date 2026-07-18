"use client";

import { useState, useEffect } from "react";
import { auth } from "../../../../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../../../../lib/firebase";
import { useParams } from "next/navigation";
import { createForm } from "../../../../../services/forms";

const INITIAL_QUESTION_ID = "initial-question-1";

let clientIdCounter = 1;
const generateClientId = () => {
  const id = `client-id-${clientIdCounter}`;
  clientIdCounter++;
  return id;
};

export default function FormAdminBuilder() {
  const router = useRouter();
  const params = useParams();
  const formId = params?.formId; 

  const [form, setForm] = useState({
    id: null,
    title: "Untitled Form",
    description: "",
    headerColor: "#bf3330", 
    coverImage: "", 
    questions: [
      {
        id: "Name",
        type: "text",
        label: "Name", 
        required: true,
      },
    ],
  });

  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [coverImageError, setCoverImageError] = useState(""); 
  const [user, setUser] = useState(undefined);
  const [admin, setAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [coverFile, setCoverFile] = useState(null); // store selected file


  useEffect(() => {

  if (formId === "new") {
    const draft = localStorage.getItem("newFormDraft");

    if (draft) {
      setForm(JSON.parse(draft));
      localStorage.removeItem("newFormDraft");
    }

    return;
  }

  const fetchForm = async () => {
    try {
      const formRef = doc(db, "forms", formId);
      const formSnap = await getDoc(formRef);

      if (!formSnap.exists()) {
        alert("Form not found");
        router.push("/form");
        return;
      }

      const data = formSnap.data();

      setForm({
        id: formId,
        title: data.title || "Untitled Form",
        description: data.description || "",
        headerColor: data.headerColor || "#7E0C0E",
        coverImage: data.coverImage || "",
        questions: data.questions?.map((q) => ({
          id: q.id || generateClientId(),
          type: q.type,
          label: q.label,
          required: q.required || false,
          options: q.options || [],
          imageUrl: q.imageUrl || "",
        })) || [],
      });

    } catch (error) {
      console.error(error);
      alert("Failed to load form.");
    }
  };

  fetchForm();
}, [formId]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
          router.replace("/login");
          return;
      }

      setUser(currentUser);
        
      try {
        // 🔹 Fetch user data
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const userData = userSnap.data();
            setAdmin(userData.admin || false);
        }
      } catch (error) {
        alert("Gagal memverifikasi status admin!");
      }
    }); 

    return () => unsubscribe();
  }, []);

  const updateFormMeta = (field, value) => {
    if (field === "coverImage") {
      setCoverImageError(""); // clear previous error
    }
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Handle file select (no upload yet)
  const handleCoverUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Optional: validate file size immediately
    if (file.size > 10 * 1024 * 1024) {
      setCoverImageError("File must be under 10MB");
      return;
    }

    setCoverFile(file);
    setCoverImageError(""); // clear previous errors
  };


  // addNewQuestion
  const addNewQuestion = () => {
  const newQuestion = {
    id: generateClientId(),
    type: "text",
    label: "Type Question",
    required: false,
    options: [],
    imageUrl: "", // ✅ NEW
  };
  if (["radio", "checkbox"].includes(newQuestion.type)) newQuestion.options = ["Option 1"];
  setForm({ ...form, questions: [...form.questions, newQuestion] });
};

  // deleteQuestion
  const deleteQuestion = (questionId) => {
    setForm({
      ...form,
      questions: form.questions.filter((q) => q.id !== questionId),
    });
  };

  // updateQuestion
  const updateQuestion = (questionId, field, value) => {
    setForm({
      ...form,
      questions: form.questions.map((q) =>
        q.id === questionId ? { ...q, [field]: value } : q
      ),
    });
  };

  // changeQuestionType
  const changeQuestionType = (questionId, newType) => {
    setForm({
      ...form,
      questions: form.questions.map((q) => {
        if (q.id !== questionId) return q;
        let newOptions = q.options;
        let imageUrl = q.imageUrl || "";
        if (["text", "textarea", "file", "info"].includes(newType)) newOptions = [];
        else if (["radio", "checkbox"].includes(newType)) newOptions = ["Option 1"];
        return { ...q, type: newType, options: newOptions, label: newType === "image" ? "" : q.label, imageUrl };
      }),
    });
  };

  // addOption 
  const addOption = (questionId) => {
    setForm({
      ...form,
      questions: form.questions.map((q) =>
        q.id === questionId
          ? { ...q, options: [...q.options, `Option ${q.options.length + 1}`] }
          : q
      ),
    });
  };

  // deleteOption
  const deleteOption = (questionId, optionIndex) => {
    setForm({
      ...form,
      questions: form.questions.map((q) =>
        q.id === questionId
          ? { ...q, options: q.options.filter((_, idx) => idx !== optionIndex) }
          : q
      ),
    });
  };

  const updateOption = (questionId, optionIndex, value) => {
    setForm({
      ...form,
      questions: form.questions.map((q) =>
        q.id === questionId
          ? { ...q, options: q.options.map((opt, idx) => (idx === optionIndex ? value : opt)) }
          : q
      ),
    });
  };

  const moveQuestion = (index, direction) => {
    const newQuestions = [...form.questions];
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= newQuestions.length) return;

    // swap
    [newQuestions[index], newQuestions[targetIndex]] = 
      [newQuestions[targetIndex], newQuestions[index]];

    setForm({ ...form, questions: newQuestions });
  };

  const publishForm = async () => {
    if (!showPublishConfirm) {
      setShowPublishConfirm(true);
      setShowDeleteConfirm(false);
      return;
    }

    if (coverImageError) {
      alert(coverImageError);
      return;
    }

    setLoading(true);

    try {
      let coverImageUrl = form.coverImage;

      // Upload cover image only if a new file was selected
      if (coverFile) {
        const formData = new FormData();
        formData.append("file", coverFile);
        formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_FORMCOVER);
        formData.append("folder", "FormCover");
        formData.append("public_id", `cover_${Date.now()}`);

        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`,
          { method: "POST", body: formData }
        );

        if (!res.ok) {
          const errorData = await res.json();
          console.error("Cloudinary error:", errorData);
          throw new Error(errorData.error?.message || "Cover upload failed");
        }

        const data = await res.json();
        coverImageUrl = data.secure_url;
      }
      const isEditing = formId && formId !== "new";

      // 🔵 EDIT EXISTING FORM
      if (isEditing) {
        const formRef = doc(db, "forms", formId);

        await updateDoc(formRef, {
            title: form.title,
            description: form.description,
            headerColor: form.headerColor,
            coverImage: coverImageUrl,
            questions: form.questions,
        });

        alert("Form updated successfully!");
      } 
      
      // 🟢 CREATE NEW FORM
      else {
        const response = await createForm({
            title: form.title,
            description: form.description,
            questions: form.questions,
            headerColor: form.headerColor,
            coverImage: coverImageUrl,
            published: true,
            createdBy: user.uid,
          });

        const newId = response.id;

        alert("Form created successfully!");

        // Replace URL so page becomes editing mode
        router.replace(`/form/${newId}/adminform`);
      }

      setShowPublishConfirm(false);
      setCoverFile(null);

    } catch (error) {
      console.error(error);
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteForm = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      setShowPublishConfirm(false);
      return;
    }

    try {
      const isEditing = formId && formId !== "new";

      // 🔴 If editing existing form → delete from Firestore
      if (isEditing) {
      await deleteDoc(doc(db, "forms", formId));
      alert("Form deleted successfully!");
      router.replace("/form"); //delet > form list
      router.refresh();
      } 
      
      // 🟡 If it's a new unsaved form → just reset state
      else {
        setForm({
          id: null,
          title: "Untitled Form",
          description: "",
          headerColor: "#7E0C0E",
          coverImage: "",
          questions: [
            {
              id: generateClientId(),
              type: "text",
              label: "Type Question",
              required: false,
              options: [],
            },
          ],
        });

        alert("Blank form reset.");
      }

      setShowDeleteConfirm(false);

    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete form.");
    }
  };

  const cancelConfirmation = () => {
    setShowPublishConfirm(false);
    setShowDeleteConfirm(false);
  };

  const questionTypes = [
    { value: "text", label: "Short Answer" },
    { value: "textarea", label: "Paragraph" },
    { value: "radio", label: "Multiple Choice" },
    { value: "checkbox", label: "Checkboxes" },
    { value: "file", label: "File Upload" }, // File Upload User
    { value: "info", label: "Text Only (No Answer)" },
    { value: "image", label: "Image Display" }, // Image Upload Admin
  ];

  const handleQuestionImageUpload = async (e, questionId) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("Image must be under 10MB");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_FORMCOVER);
      formData.append("folder", "FormImages");

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData }
      );
      
      const data = await res.json();

      updateQuestion(questionId, "imageUrl", data.secure_url);
    } catch (err) {
      console.error(err);
      alert("Image upload failed");
    }
  };

  // Allow <b> and <strong> for questions
  const sanitizeBoldOnly = (html) => {
    const div = document.createElement("div");
    div.innerHTML = html;

    const walk = (node) => {
      // Copy children first (important to avoid mutation issues)
      const children = Array.from(node.childNodes);

      for (let child of children) {
        if (child.nodeType === 1) {
          const tag = child.tagName.toLowerCase();

          if (!["b", "strong", "br"].includes(tag)) {
            const parent = child.parentNode;

            // ✅ SAFETY CHECK (fixes your crash)
            if (!parent) continue;

            while (child.firstChild) {
              parent.insertBefore(child.firstChild, child);
            }

            parent.removeChild(child);
          } else {
            walk(child);
          }
        }
      }
    };

    walk(div);
    return div.innerHTML;
  };

  if (user === undefined) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", backgroundColor: "#7E0C0E" }}>
        <p className="font-montserrat" style={{ color: "white", fontSize: "1.2rem", textAlign: "center" }}>Please try logging in again.</p>
      </div>
    );
  }

  if (user && !admin) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", backgroundColor: "#7E0C0E" }}>
        <p className="font-montserrat" style={{ color: "white", fontSize: "1.2rem", textAlign: "center" }}>You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: form.headerColor, 
      fontFamily: "Arial, sans-serif",
      margin: "4rem auto 0 auto",
      padding: 0
    }}>
      <header style={{
        backgroundColor: "white",
        borderBottom: "1px solid #e5e7eb",
        padding: "1rem 1.5rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <h1 style={{
          fontSize: "1.5rem",
          fontWeight: "bold",
          color: "#111827",
          margin: 0
        }}>PPITSZ Form Builder</h1>

        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          {showDeleteConfirm ? (
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <button
                onClick={deleteForm}
                style={{
                  backgroundColor: "#ef4444",
                  color: "white",
                  padding: "0.5rem 1rem",
                  borderRadius: "0.375rem",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  transition: "background-color 0.2s"
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = "#dc2626"}
                onMouseOut={(e) => e.target.style.backgroundColor = "#ef4444"}
              >
                Confirm Delete
              </button>
              <button
                onClick={cancelConfirmation}
                style={{
                  backgroundColor: "#f3f4f6",
                  color: "#374151",
                  padding: "0.5rem 1rem",
                  borderRadius: "0.375rem",
                  border: "1px solid #e5e7eb",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  transition: "background-color 0.2s"
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = "#e5e7eb"}
                onMouseOut={(e) => e.target.style.backgroundColor = "#f3f4f6"}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={deleteForm}
              style={{
                backgroundColor: "#f87171",
                color: "white",
                padding: "0.5rem 1rem",
                borderRadius: "0.375rem",
                border: "none",
                cursor: "pointer",
                fontSize: "0.9rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                transition: "background-color 0.2s"
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = "#ef4444"}
              onMouseOut={(e) => e.target.style.backgroundColor = "#f87171"}
            >
              🗑️ Delete Form
            </button>
          )}

          {showPublishConfirm ? (
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <button
                onClick={publishForm}
                disabled={loading}
                style={{
                  backgroundColor: "#10b981",
                  color: "white",
                  padding: "0.5rem 1rem",
                  borderRadius: "0.375rem",
                  border: "none",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: "0.9rem",
                  transition: "background-color 0.2s"
                }}
                onMouseOver={(e) => !loading && (e.target.style.backgroundColor = "#059669")}
                onMouseOut={(e) => !loading && (e.target.style.backgroundColor = "#10b981")}
              >
                {loading ? "Publishing..." : "Confirm Publish"}
              </button>
              <button
                onClick={cancelConfirmation}
                disabled={loading}
                style={{
                  backgroundColor: "#f3f4f6",
                  color: "#374151",
                  padding: "0.5rem 1rem",
                  borderRadius: "0.375rem",
                  border: "1px solid #e5e7eb",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: "0.9rem",
                  transition: "background-color 0.2s"
                }}
                onMouseOver={(e) => !loading && (e.target.style.backgroundColor = "#e5e7eb")}
                onMouseOut={(e) => !loading && (e.target.style.backgroundColor = "#f3f4f6")}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={publishForm}
              style={{
                backgroundColor: "#2563eb",
                color: "white",
                padding: "0.5rem 1.5rem",
                borderRadius: "0.375rem",
                border: "none",
                cursor: "pointer",
                fontSize: "0.9rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                transition: "background-color 0.2s"
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = "#1d4ed8"}
              onMouseOut={(e) => e.target.style.backgroundColor = "#2563eb"}
            >
              🚀 Publish
            </button>
          )}
        </div>
      </header>

      <main style={{
        maxWidth: "768px",
        margin: "0 auto",
        padding: "2rem 1rem"
      }}>
        <div style={{
          backgroundColor: "white",
          borderRadius: "0.5rem",
          boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          border: "1px solid #e5e7eb",
          padding: "1.5rem",
          marginBottom: "2rem"
        }}>
          <input
            type="text"
            value={form.title}
            onChange={(e) => updateFormMeta("title", e.target.value)}
            style={{
              width: "100%",
              fontSize: "1.875rem",
              fontWeight: "bold",
              border: "none",
              outline: "none",
              marginBottom: "0.5rem",
              padding: "0.25rem 0",
              boxSizing: "border-box",
              color: "#111827",
              placeholder: "Form Title"
            }}
            placeholder="Form Title"
          />
          <div
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => {
              const clean = sanitizeBoldOnly(e.currentTarget.innerHTML);
              updateFormMeta("description", clean);
            }}
            onPaste={(e) => {
              e.preventDefault();
              const text = e.clipboardData.getData("text/plain");
              document.execCommand("insertText", false, text);
            }}
            dangerouslySetInnerHTML={{ __html: form.description || "" }}
            style={{
              width: "100%",
              fontSize: "1rem",
              outline: "none",
              padding: "0.25rem 0",
              color: "#4b5563",
              minHeight: "40px",
              whiteSpace: "pre-wrap",
              borderBottom: "1px solid transparent"
            }}
            onFocus={(e) => (e.target.style.borderBottom = "1px solid #2563eb")}
            onBlurCapture={(e) => (e.target.style.borderBottom = "1px solid transparent")}
          />
        </div>

        <div style={{
          backgroundColor: "white",
          borderRadius: "0.5rem",
          boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          border: "1px solid #e5e7eb",
          padding: "1.5rem",
          marginBottom: "2rem"
        }}>
          <h2 style={{
            fontSize: "1.25rem",
            fontWeight: "600",
            color: "#111827",
            margin: "0 0 1.5rem 0"
          }}>Form Appearance</h2>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{
              display: "block",
              fontSize: "0.9rem",
              color: "#374151",
              marginBottom: "0.5rem"
            }}>Header Color (Hex Code)</label>
            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <input
                type="color"
                value={form.headerColor}
                onChange={(e) => updateFormMeta("headerColor", e.target.value)}
                style={{
                  width: "3rem",
                  height: "3rem",
                  border: "none",
                  borderRadius: "0.25rem",
                  cursor: "pointer"
                }}
              />
              <input
                type="text"
                value={form.headerColor}
                onChange={(e) => {
                  const hexPattern = /^#([0-9A-Fa-f]{6})$/;
                  if (hexPattern.test(e.target.value) || e.target.value === "") {
                    updateFormMeta("headerColor", e.target.value);
                  }
                }}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "0.375rem",
                  fontSize: "0.9rem",
                  color: "#374151"
                }}
                placeholder="#7E0C0E"
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.9rem",
                color: "#374151",
                marginBottom: "0.5rem",
              }}
            >
              Upload Cover Image
            </label>

            <input
              type="file"
              accept="image/*"
              className="block text-sm
                file:mr-4 file:rounded
                file:border-0
                file:bg-[#B88C8C]
                file:px-4 file:py-2
                file:text-black
                hover:file:opacity-90"
              onChange={handleCoverUpload}
            />

            {coverImageError && (
              <p
                style={{
                  color: "#ef4444",
                  fontSize: "0.8rem",
                  marginTop: "0.5rem",
                  marginBottom: 0,
                }}
              >
                {coverImageError}
              </p>
            )}
          </div>
        </div>

        <div style={{ marginBottom: "2rem" }}>
          {form.questions.map((question, index) => (
            <div
              key={question.id}
              style={{
                backgroundColor: "white",
                borderRadius: "0.5rem",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                border: "1px solid #e5e7eb",
                padding: "1.5rem",
                marginBottom: "1.5rem",
                transition: "border-color 0.2s"
              }}
              onMouseOver={(e) => e.currentTarget.style.borderColor = "#d1d5db"}
              onMouseOut={(e) => e.currentTarget.style.borderColor = "#e5e7eb"}
            >
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "1rem"
              }}>
                <div
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => {
                    const clean = sanitizeBoldOnly(e.currentTarget.innerHTML);
                    updateQuestion(question.id, "label", clean);
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    const text = e.clipboardData.getData("text/plain");
                    document.execCommand("insertText", false, text);
                  }}
                  dangerouslySetInnerHTML={{ __html: question.label || "" }}
                  style={{
                    width: "100%",
                    maxWidth: "600px",
                    fontSize: "1.125rem",
                    fontWeight: "500",
                    border: "none",
                    outline: "none",
                    padding: "0.5rem 0",
                    boxSizing: "border-box",
                    borderBottom: "1px solid transparent",
                    color: "#111827",
                    whiteSpace: "pre-wrap"
                  }}
                  onFocus={(e) => (e.target.style.borderBottom = "1px solid #2563eb")}
                  onBlurCapture={(e) => (e.target.style.borderBottom = "1px solid transparent")}
                />
                <select
                  value={question.type}
                  onChange={(e) => changeQuestionType(question.id, e.target.value)}
                  style={{
                    padding: "0.4rem 0.6rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.375rem",
                    backgroundColor: "white",
                    fontSize: "0.85rem",
                    color: "#374151"
                  }}
                >
                  {questionTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {question.type === "text" && (
                <input
                  type="text"
                  placeholder="Respondent's short answer"
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.375rem",
                    marginBottom: "1rem",
                    color: "#6b7280",
                    backgroundColor: "#f9fafb"
                  }}
                  readOnly
                />
              )}

              {question.type === "textarea" && (
                <textarea
                  placeholder="Respondent's paragraph answer"
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.375rem",
                    marginBottom: "1rem",
                    color: "#6b7280",
                    backgroundColor: "#f9fafb",
                    minHeight: "100px"
                  }}
                  readOnly
                  rows={4}
                />
              )}

              {["radio", "checkbox"].includes(question.type) && (
                <div style={{
                  marginBottom: "1rem",
                  gap: "0.75rem",
                  display: "flex",
                  flexDirection: "column"
                }}>
                  {question.options.map((option, index) => (
                    <div key={`${question.id}-option-${index}`} style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem"
                    }}>
                      <div style={{
                        width: "1rem",
                        height: "1rem",
                        border: "1px solid #9ca3af",
                        borderRadius: question.type === "radio" ? "50%" : "0.25rem",
                        flexShrink: 0
                      }}></div>

                      <input
                        type="text"
                        value={option}
                        onChange={(e) => updateOption(question.id, index, e.target.value)}
                        style={{
                          flex: 1,
                          border: "none",
                          outline: "none",
                          padding: "0.25rem 0.5rem",
                          borderBottom: "1px solid #e5e7eb",
                          fontSize: "0.9rem"
                        }}
                        placeholder="Option"
                      />

                      <button
                        onClick={() => deleteOption(question.id, index)}
                        disabled={question.options.length === 1}
                        style={{
                          color: question.options.length === 1 ? "#d1d5db" : "#6b7280",
                          border: "none",
                          background: "none",
                          cursor: question.options.length === 1 ? "not-allowed" : "pointer",
                          fontSize: "1rem",
                          padding: "0.25rem",
                          borderRadius: "0.25rem"
                        }}
                        onMouseOver={(e) => {
                          if (question.options.length > 1) {
                            e.target.style.color = "#ef4444";
                            e.target.style.backgroundColor = "#fee2e2";
                          }
                        }}
                        onMouseOut={(e) => {
                          if (question.options.length > 1) {
                            e.target.style.color = "#6b7280";
                            e.target.style.backgroundColor = "transparent";
                          }
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={() => addOption(question.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      color: "#2563eb",
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      fontSize: "0.875rem",
                      padding: "0.5rem 0",
                      transition: "color 0.2s"
                    }}
                    onMouseOver={(e) => e.target.style.color = "#1d4ed8"}
                    onMouseOut={(e) => e.target.style.color = "#2563eb"}
                  >
                    ➕ Add Option
                  </button>
                </div>
              )}

              {question.type === "file" && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "0.875rem",
                  color: "#4b5563",
                  backgroundColor: "#f3f4f6",
                  padding: "0.75rem",
                  borderRadius: "0.375rem",
                  marginBottom: "0.5rem"
                }}>
                  ℹ️ Users will be able to upload files (images, documents, etc.)
                </div>
              )}

              {question.type === "info" && (
                <div
                  style={{
                    padding: "0.75rem",
                    borderRadius: "0.375rem",
                    backgroundColor: "#f9fafb",
                    color: "#374151",
                    fontSize: "0.95rem",
                    marginBottom: "1rem"
                  }}
                >
                  ℹ️ This is display text only. Users will not answer this.
                </div>
              )}

              {question.type === "image" && (
                <div style={{ marginBottom: "1rem" }}>
                  
                  {!question.imageUrl ? (
                    // ✅ No image yet → show upload
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleQuestionImageUpload(e, question.id)}
                    />
                  ) : (
                    // ✅ Image exists → show preview + controls
                    <div>
                      <img
                        src={question.imageUrl}
                        alt="Uploaded"
                        style={{
                          maxWidth: "100%",
                          borderRadius: "0.5rem",
                          border: "1px solid #e5e7eb"
                        }}
                      />

                      <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem" }}>
                        {/* Change Image */}
                        <label
                          style={{
                            cursor: "pointer",
                            color: "#2563eb",
                            fontSize: "0.85rem"
                          }}
                        >
                          Change Image
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: "none" }}
                            onChange={(e) => handleQuestionImageUpload(e, question.id)}
                          />
                        </label>

                        {/* Remove Image */}
                        <button
                          onClick={() => updateQuestion(question.id, "imageUrl", "")}
                          style={{
                            color: "#ef4444",
                            border: "none",
                            background: "none",
                            cursor: "pointer",
                            fontSize: "0.85rem"
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "1rem"
              }}>
                {!["info", "image"].includes(question.type) && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem"
                }}>
                  <input
                    type="checkbox"
                    id={`required-${question.id}`}
                    checked={question.required}
                    onChange={(e) => updateQuestion(question.id, "required", e.target.checked)}
                    style={{
                      width: "1rem",
                      height: "1rem",
                      color: "#2563eb",
                      accentColor: "#2563eb"
                    }}
                  />
                  <label
                    htmlFor={`required-${question.id}`}
                    style={{
                      fontSize: "0.875rem",
                      color: "#374151"
                    }}
                  >
                    Required
                  </label>
                </div>
              )}
              
                <button
                  onClick={() => deleteQuestion(question.id)}
                  style={{
                    marginLeft: "auto",
                    color: "#ef4444",
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    padding: "0.25rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.3rem"
                  }}
                >
                  🗑️ Delete Question
                </button>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => moveQuestion(index, -1)}
                    disabled={index === 0}
                    style={{
                      cursor: index === 0 ? "not-allowed" : "pointer",
                      opacity: index === 0 ? 0.3 : 1
                    }}
                  >
                    ⬆️
                  </button>

                  <button
                    onClick={() => moveQuestion(index, 1)}
                    disabled={index === form.questions.length - 1}
                    style={{
                      cursor: index === form.questions.length - 1 ? "not-allowed" : "pointer",
                      opacity: index === form.questions.length - 1 ? 0.3 : 1
                    }}
                  >
                    ⬇️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addNewQuestion}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            backgroundColor: "#ffffffff",
            color: "black",
            border: "none",
            borderRadius: "0.375rem",
            padding: "0.75rem 1.5rem",
            fontSize: "1rem",
            cursor: "pointer",
            margin: "0 auto",
            transition: "background-color 0.2s"
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = "#d4d4d4ff"}
          onMouseOut={(e) => e.target.style.backgroundColor = "#ffffffff"}
        >
          ➕ Add Question
        </button>
      </main>
    </div>
  );
}
