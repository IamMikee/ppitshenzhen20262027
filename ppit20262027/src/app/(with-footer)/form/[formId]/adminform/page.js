"use client";

import { useState, useEffect } from "react";
import { auth } from "../../../../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../../../../lib/firebase";
import { useParams } from "next/navigation";
import { createForm } from "../../../../../services/forms";
import { ChevronDown, ChevronUp, Trash2, Plus, Save, Eye, EyeOff, ArrowLeft, XCircle, CheckCircle } from "lucide-react";

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
    headerColor: "#7E0C0E",
    coverImage: "",
    isActive: true,
    isClosed: false,
    questions: [
      {
        id: "Name",
        type: "text",
        label: "Name",
        required: true,
      },
    ],
  });

  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [coverImageError, setCoverImageError] = useState("");
  const [user, setUser] = useState(null);
  const [admin, setAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [coverFile, setCoverFile] = useState(null);
  const [saving, setSaving] = useState(false);

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
          isActive: data.isActive !== undefined ? data.isActive : true,
          isClosed: data.isClosed !== undefined ? data.isClosed : false,
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
        setLoading(false);
        return;
      }

      setUser(currentUser);

      try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          const isAdmin = userData.admin || false;
          setAdmin(isAdmin);

          if (!isAdmin) {
            router.replace("/");
          }
        }
      } catch (error) {
        console.error("Error verifying admin status:", error);
        alert("Gagal memverifikasi status admin!");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const updateFormMeta = (field, value) => {
    if (field === "coverImage") {
      setCoverImageError("");
    }
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCoverUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setCoverImageError("File must be under 10MB");
      return;
    }

    setCoverFile(file);
    setCoverImageError("");
  };

  const addNewQuestion = () => {
    const newQuestion = {
      id: generateClientId(),
      type: "text",
      label: "Type Question",
      required: false,
      options: [],
      imageUrl: "",
    };
    if (["radio", "checkbox"].includes(newQuestion.type)) newQuestion.options = ["Option 1"];
    setForm({ ...form, questions: [...form.questions, newQuestion] });
  };

  const deleteQuestion = (questionId) => {
    setForm({
      ...form,
      questions: form.questions.filter((q) => q.id !== questionId),
    });
  };

  const updateQuestion = (questionId, field, value) => {
    setForm({
      ...form,
      questions: form.questions.map((q) =>
        q.id === questionId ? { ...q, [field]: value } : q
      ),
    });
  };

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

    [newQuestions[index], newQuestions[targetIndex]] =
      [newQuestions[targetIndex], newQuestions[index]];

    setForm({ ...form, questions: newQuestions });
  };

  const saveForm = async () => {
    if (!showSaveConfirm) {
      setShowSaveConfirm(true);
      setShowDeleteConfirm(false);
      return;
    }

    if (coverImageError) {
      alert(coverImageError);
      return;
    }

    setSaving(true);
    setLoading(true);

    try {
      let coverImageUrl = form.coverImage;

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

      if (isEditing) {
        const formRef = doc(db, "forms", formId);

        await updateDoc(formRef, {
          title: form.title,
          description: form.description,
          headerColor: form.headerColor,
          coverImage: coverImageUrl,
          questions: form.questions,
          isActive: form.isActive,
          isClosed: form.isClosed,
          updatedAt: new Date().toISOString(),
        });

        alert("Form saved successfully!");
      } else {
        const response = await createForm({
          title: form.title,
          description: form.description,
          questions: form.questions,
          headerColor: form.headerColor,
          coverImage: coverImageUrl,
          isActive: form.isActive,
          isClosed: form.isClosed,
          published: true,
          createdBy: user.uid,
        });

        const newId = response.id;
        alert("Form created successfully!");
        router.replace(`/form/${newId}/adminform`);
      }

      setShowSaveConfirm(false);
      setCoverFile(null);

    } catch (error) {
      console.error(error);
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
      setSaving(false);
    }
  };

  const deleteForm = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      setShowSaveConfirm(false);
      return;
    }

    try {
      const isEditing = formId && formId !== "new";

      if (isEditing) {
        await deleteDoc(doc(db, "forms", formId));
        alert("Form deleted successfully!");
        router.replace("/form");
        router.refresh();
      } else {
        setForm({
          id: null,
          title: "Untitled Form",
          description: "",
          headerColor: "#7E0C0E",
          coverImage: "",
          isActive: true,
          isClosed: false,
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
    setShowSaveConfirm(false);
    setShowDeleteConfirm(false);
  };

  const questionTypes = [
    { value: "text", label: "Short Answer" },
    { value: "textarea", label: "Paragraph" },
    { value: "radio", label: "Multiple Choice" },
    { value: "checkbox", label: "Checkboxes" },
    { value: "file", label: "File Upload" },
    { value: "info", label: "Text Only (No Answer)" },
    { value: "image", label: "Image Display" },
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

  const sanitizeBoldOnly = (html) => {
    const div = document.createElement("div");
    div.innerHTML = html;

    const walk = (node) => {
      const children = Array.from(node.childNodes);

      for (let child of children) {
        if (child.nodeType === 1) {
          const tag = child.tagName.toLowerCase();

          if (!["b", "strong", "br"].includes(tag)) {
            const parent = child.parentNode;
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

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#7E0C0E] border-t-transparent"></div>
          <p className="mt-4 text-gray-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // If not logged in, show login message (though should redirect)
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Please Log In</h2>
          <p className="text-gray-500">You need to be logged in to access this page.</p>
        </div>
      </div>
    );
  }

  // If logged in but not admin, show access denied
  if (!admin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-gray-500">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen py-16 px-4 pt-24"
      style={{ backgroundColor: "#7E0C0E" }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header Bar */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-12 flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={() => router.push('/form')}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back to Forms</span>
          </button>

          <div className="flex items-center gap-4 flex-wrap">
            {/* Active Toggle Switch */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Active</span>
              <button
                onClick={() => updateFormMeta("isActive", !form.isActive)}
                className={`relative w-12 h-6 rounded-full transition-all duration-300 ${form.isActive ? "bg-[#7E0C0E]" : "bg-gray-300"
                  }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${form.isActive ? "left-6" : "left-0.5"
                    }`}
                />
              </button>
              <span className="text-sm">
                {form.isActive ? (
                  <span className="flex items-center gap-1 text-green-600">
                    <Eye size={16} /> Live
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-gray-400">
                    <EyeOff size={16} /> Hidden
                  </span>
                )}
              </span>
            </div>

            {/* Separator */}
            <div className="w-px h-8 bg-gray-300"></div>

            {/* Closed Toggle Switch */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Closed</span>
              <button
                onClick={() => updateFormMeta("isClosed", !form.isClosed)}
                className={`relative w-12 h-6 rounded-full transition-all duration-300 ${form.isClosed ? "bg-red-500" : "bg-gray-300"
                  }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${form.isClosed ? "left-6" : "left-0.5"
                    }`}
                />
              </button>
              <span className="text-sm">
                {form.isClosed ? (
                  <span className="flex items-center gap-1 text-red-500">
                    <XCircle size={16} /> Closed
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle size={16} /> Open
                  </span>
                )}
              </span>
            </div>

            {showDeleteConfirm ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={deleteForm}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                >
                  Confirm Delete
                </button>
                <button
                  onClick={cancelConfirmation}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={deleteForm}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all duration-200"
              >
                <Trash2 size={18} />
                Delete
              </button>
            )}

            {showSaveConfirm ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={saveForm}
                  disabled={loading}
                  className="bg-[#7E0C0E] text-white px-6 py-2 rounded-lg hover:bg-[#9E1A1C] transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                      Saving...
                    </span>
                  ) : (
                    "Confirm Save"
                  )}
                </button>
                <button
                  onClick={cancelConfirmation}
                  disabled={loading}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={saveForm}
                className="flex items-center gap-2 bg-[#7E0C0E] text-white px-6 py-2 rounded-lg hover:bg-[#9E1A1C] transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
              >
                <Save size={18} />
                Save Form
              </button>
            )}
          </div>
        </div>

        {/* Form Title & Description */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
          <div className="p-6 space-y-4">
            <input
              type="text"
              value={form.title}
              onChange={(e) => updateFormMeta("title", e.target.value)}
              className="w-full text-3xl font-bold text-gray-800 border-0 border-b-2 border-transparent focus:border-[#7E0C0E] outline-none transition-all duration-200 px-2 py-1"
              placeholder="Form Title"
            />
            <div
              contentEditable
              suppressContentEditableWarning
              data-placeholder="Form description (optional)"
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
              className="w-full text-gray-500 outline-none min-h-[40px] px-2 py-1 
             border-b-2 border-transparent focus:border-[#7E0C0E] 
             transition-all duration-200"
            />
          </div>
        </div>

        {/* Form Appearance */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Form Appearance</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-500 mb-2">Header Color</label>
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    value={form.headerColor}
                    onChange={(e) => updateFormMeta("headerColor", e.target.value)}
                    className="w-12 h-12 rounded-lg cursor-pointer border border-gray-200"
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
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#7E0C0E] focus:border-transparent"
                    placeholder="#7E0C0E"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-2">Cover Image</label>
                <input
                  type="file"
                  accept="image/*"
                  className="block text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:bg-[#7E0C0E] file:text-white
                    file:hover:bg-[#9E1A1C] file:transition-all file:duration-200
                    hover:file:shadow-md hover:file:-translate-y-0.5"
                  onChange={handleCoverUpload}
                />
                {coverImageError && (
                  <p className="text-red-500 text-sm mt-2">{coverImageError}</p>
                )}
                {form.coverImage && !coverFile && (
                  <div className="mt-3">
                    <img
                      src={form.coverImage}
                      alt="Cover"
                      className="rounded-lg max-h-48 object-cover border border-gray-200"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-4 mb-6">
          {form.questions.map((question, index) => (
            <div
              key={question.id}
              className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200"
            >
              <div className="p-6">
                <div className="flex flex-wrap items-start gap-4 mb-4">
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
                    className="flex-1 text-lg font-medium text-gray-800 outline-none border-b-2 border-transparent focus:border-[#7E0C0E] transition-all duration-200 px-2 py-1 min-w-[200px]"
                    placeholder="Question text..."
                  />
                  <select
                    value={question.type}
                    onChange={(e) => changeQuestionType(question.id, e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#7E0C0E] focus:border-transparent"
                  >
                    {questionTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Question type previews */}
                {question.type === "text" && (
                  <input
                    type="text"
                    placeholder="Respondent's short answer"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg text-gray-500 bg-gray-50 cursor-not-allowed"
                    readOnly
                  />
                )}

                {question.type === "textarea" && (
                  <textarea
                    placeholder="Respondent's paragraph answer"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg text-gray-500 bg-gray-50 cursor-not-allowed min-h-[100px]"
                    readOnly
                    rows={4}
                  />
                )}

                {["radio", "checkbox"].includes(question.type) && (
                  <div className="space-y-2">
                    {question.options.map((option, idx) => (
                      <div key={`${question.id}-option-${idx}`} className="flex items-center gap-3">
                        <div className={`w-4 h-4 border-2 border-gray-300 flex-shrink-0 ${question.type === "radio" ? "rounded-full" : "rounded"
                          }`} />
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => updateOption(question.id, idx, e.target.value)}
                          className="flex-1 px-2 py-1 border-b border-gray-200 focus:border-[#7E0C0E] outline-none text-gray-700"
                          placeholder="Option"
                        />
                        <button
                          onClick={() => deleteOption(question.id, idx)}
                          disabled={question.options.length === 1}
                          className={`p-1 rounded transition-colors ${question.options.length === 1
                            ? "text-gray-300 cursor-not-allowed"
                            : "text-gray-400 hover:text-red-500 hover:bg-red-50"
                            }`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addOption(question.id)}
                      className="flex items-center gap-2 text-[#7E0C0E] hover:text-[#9E1A1C] transition-colors text-sm"
                    >
                      <Plus size={16} />
                      Add Option
                    </button>
                  </div>
                )}

                {question.type === "file" && (
                  <div className="bg-gray-50 rounded-lg p-4 text-gray-500 text-sm border border-dashed border-gray-300">
                    📎 Users will be able to upload files (images, documents, etc.)
                  </div>
                )}

                {question.type === "info" && (
                  <div className="bg-gray-50 rounded-lg p-4 text-gray-500 text-sm border border-gray-200">
                    ℹ️ This is display text only. Users will not answer this.
                  </div>
                )}

                {question.type === "image" && (
                  <div className="space-y-3">
                    {!question.imageUrl ? (
                      <input
                        type="file"
                        accept="image/*"
                        className="block text-sm text-gray-500
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-lg file:border-0
                          file:bg-[#7E0C0E] file:text-white
                          file:hover:bg-[#9E1A1C] file:transition-all file:duration-200
                          hover:file:shadow-md hover:file:-translate-y-0.5"
                        onChange={(e) => handleQuestionImageUpload(e, question.id)}
                      />
                    ) : (
                      <div>
                        <img
                          src={question.imageUrl}
                          alt="Question"
                          className="rounded-lg max-h-64 object-contain border border-gray-200"
                        />
                        <div className="flex gap-3 mt-2">
                          <label className="text-sm text-[#7E0C0E] hover:text-[#9E1A1C] cursor-pointer transition-colors">
                            Change Image
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleQuestionImageUpload(e, question.id)}
                            />
                          </label>
                          <button
                            onClick={() => updateQuestion(question.id, "imageUrl", "")}
                            className="text-sm text-red-500 hover:text-red-600 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Bottom controls */}
                <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-gray-100">
                  {!["info", "image"].includes(question.type) && (
                    <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={question.required}
                        onChange={(e) => updateQuestion(question.id, "required", e.target.checked)}
                        className="w-4 h-4 text-[#7E0C0E] focus:ring-[#7E0C0E] rounded cursor-pointer"
                      />
                      Required
                    </label>
                  )}

                  <button
                    onClick={() => deleteQuestion(question.id)}
                    className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600 transition-colors ml-auto"
                  >
                    <Trash2 size={16} />
                    Delete Question
                  </button>

                  <div className="flex gap-1">
                    <button
                      onClick={() => moveQuestion(index, -1)}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronUp size={18} />
                    </button>
                    <button
                      onClick={() => moveQuestion(index, 1)}
                      disabled={index === form.questions.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronDown size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Question Button */}
        <button
          onClick={addNewQuestion}
          className="w-full bg-white text-gray-700 border-2 border-dashed border-gray-300 rounded-2xl py-4 hover:border-[#7E0C0E] hover:text-[#7E0C0E] transition-all duration-200 flex items-center justify-center gap-2 font-medium"
        >
          <Plus size={20} />
          Add Question
        </button>
      </div>
    </div>
  );
}