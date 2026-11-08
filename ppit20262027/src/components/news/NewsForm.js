"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft, Eye, Save, Send, Upload, Loader2, X, ExternalLink, Star, Trash2, EyeOff,
    Newspaper, Home, AlertTriangle, Crop, Replace,
} from "lucide-react";
import useUnsavedChangesGuard from "./useUnsavedChangesGuard";
import { auth } from "@/lib/firebase";
import RichArticleEditor from "./RichArticleEditor";
import ArticleView from "./ArticleView";
import ImageEditorModal from "./ImageEditorModal";
import {
    DEFAULT_CATEGORIES, slugify, toDate, formatNewsDate, htmlToText,
    createNews, updateNews, deleteNews, uploadNewsImage,
} from "@/services/news";

const EMPTY = {
    title: "",
    slug: "",
    category: DEFAULT_CATEGORIES[0],
    author: "PPIT Shenzhen",
    summary: "",
    coverImage: "",
    contentHtml: "",
    status: "draft",
    featured: false,
    showOnNewsPage: true,
    showOnHomepage: true,
    publishDate: new Date(),
};

const toInputDate = (value) => {
    const d = toDate(value) || new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const fromInputDate = (str) => {
    const [y, m, d] = str.split("-").map(Number);
    return new Date(y, m - 1, d, 12, 0, 0); // noon local → no timezone day shift
};

const SUMMARY_MAX = 220;

export default function NewsForm({ articleId = null, initialData = null }) {
    const router = useRouter();
    const isEdit = !!articleId;
    const [form, setForm] = useState(() => {
        const merged = { ...EMPTY, ...(initialData || {}) };
        // older articles don't have the visibility flags yet → visible by default
        merged.showOnNewsPage = merged.showOnNewsPage !== false;
        merged.showOnHomepage = merged.showOnHomepage !== false;
        return merged;
    });
    const [slugTouched, setSlugTouched] = useState(isEdit);
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(null); // "draft" | "published" | null
    // cover cropper: { src, file?, initialEdits } while open
    const [coverEditor, setCoverEditor] = useState(null);
    const [showPreview, setShowPreview] = useState(false);
    const [toast, setToast] = useState(null);
    const [error, setError] = useState("");
    const savedStatus = useRef(initialData?.status || "draft");

    const set = (patch) => {
        setForm((f) => ({ ...f, ...patch }));
        setDirty(true);
    };

    // auto slug from title (until the slug is edited manually)
    useEffect(() => {
        if (!slugTouched) setForm((f) => ({ ...f, slug: slugify(f.title) }));
    }, [form.title, slugTouched]);

    // warn before leaving with unsaved changes (tab close, links, browser back)
    const allowNextNavigation = useUnsavedChangesGuard(dirty);

    const showToast = (msg, type = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const autoSummary = useMemo(() => {
        const text = htmlToText(form.contentHtml);
        return text.length > SUMMARY_MAX ? `${text.slice(0, SUMMARY_MAX - 1).trim()}…` : text;
    }, [form.contentHtml]);

    const save = async (status) => {
        if (saving) return;
        setError("");
        if (!form.title.trim()) {
            setError("Please enter a title.");
            return;
        }
        if (status === "published" && !htmlToText(form.contentHtml) && !form.contentHtml.includes("<img")) {
            setError("The article body is empty — write something before publishing.");
            return;
        }
        setSaving(status);
        try {
            const payload = {
                ...form,
                status,
                summary: form.summary.trim() || autoSummary,
            };
            const user = auth.currentUser;
            if (isEdit) {
                const { slug } = await updateNews(articleId, payload, user);
                setForm((f) => ({ ...f, slug, status, summary: payload.summary }));
                savedStatus.current = status;
                setDirty(false);
                showToast(status === "published" ? "Published! It's now live on the website." : "Draft saved.");
            } else {
                const { id } = await createNews(payload, user);
                setDirty(false);
                showToast(status === "published" ? "Published!" : "Draft created.");
                allowNextNavigation();
                router.replace(`/ctrlpanel/news-dashboard/${id}/edit`);
            }
        } catch (err) {
            console.error(err);
            setError(
                err?.code === "permission-denied"
                    ? "Permission denied by Firestore. Make sure the security rules allow admins to write to the 'news' collection."
                    : `Save failed: ${err.message}`
            );
        } finally {
            setSaving(null);
        }
    };

    const remove = async () => {
        if (!confirm(`Delete "${form.title || "this article"}" permanently? This cannot be undone.`)) return;
        try {
            await deleteNews(articleId);
            setDirty(false);
            allowNextNavigation();
            router.push("/ctrlpanel/news-dashboard");
        } catch (err) {
            setError(`Delete failed: ${err.message}`);
        }
    };

    // picking a file opens the cropper first; nothing is uploaded until "Apply"
    const onCoverFile = (file) => {
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            setError("Please choose an image file.");
            return;
        }
        setError("");
        setCoverEditor({ src: URL.createObjectURL(file), file, initialEdits: null });
    };

    const editExistingCover = () => {
        if (!form.coverImage) return;
        const hasOriginal = !!form.coverOriginal;
        setCoverEditor({
            src: hasOriginal ? form.coverOriginal : form.coverImage,
            initialEdits: hasOriginal ? form.coverEdits || null : null,
        });
    };

    const closeCoverEditor = () => {
        if (coverEditor?.file) URL.revokeObjectURL(coverEditor.src);
        setCoverEditor(null);
    };

    const applyCover = async ({ edits, identity, editsChanged, render }) => {
        const { file, src } = coverEditor;
        if (!file && !editsChanged) return closeCoverEditor(); // nothing changed
        // the uncropped original (uploaded once, so the cover can be re-cropped later)
        const originalUrl = file ? await uploadNewsImage(file) : src;
        if (identity) {
            set({ coverImage: originalUrl, coverOriginal: "", coverEdits: null });
        } else {
            const blob = await render();
            const url = await uploadNewsImage(blob);
            set({ coverImage: url, coverOriginal: originalUrl, coverEdits: edits });
        }
        closeCoverEditor();
    };

    // Ctrl+S / Cmd+S → save (keeps the current published/draft status)
    const saveRef = useRef(save);
    saveRef.current = save;
    useEffect(() => {
        const onKey = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
                e.preventDefault();
                saveRef.current(savedStatus.current);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    const inputClass =
        "w-full bg-[#2a2a2a] border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500";
    const labelClass = "block text-sm font-medium text-gray-300 mb-1";
    const isPublished = savedStatus.current === "published";

    return (
        <div className="text-white font-montserrat">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <Link
                        href="/ctrlpanel/news-dashboard"
                        className="p-2 rounded-lg hover:bg-gray-700 text-gray-300"
                        title="Back to dashboard"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold">{isEdit ? "Edit Article" : "New Article"}</h1>
                        <p className="text-sm text-gray-400 flex items-center gap-2">
                            <span
                                className={`inline-block w-2 h-2 rounded-full ${isPublished ? "bg-green-500" : "bg-yellow-500"}`}
                            />
                            {isPublished ? "Published" : "Draft"}
                            {dirty && <span className="text-orange-400">· unsaved changes (Ctrl+S to save)</span>}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setShowPreview(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600"
                    >
                        <Eye className="w-4 h-4" /> Preview
                    </button>
                    {isEdit && isPublished && (
                        <a
                            href={`/news/${form.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600"
                        >
                            <ExternalLink className="w-4 h-4" /> View live
                        </a>
                    )}
                </div>
            </div>

            {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-900/50 border border-red-700 text-red-200 text-sm flex justify-between gap-4">
                    <span>{error}</span>
                    <button onClick={() => setError("")}><X className="w-4 h-4" /></button>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
                {/* ------------ MAIN COLUMN ------------ */}
                <div className="space-y-5 min-w-0">
                    <input
                        value={form.title}
                        onChange={(e) => set({ title: e.target.value })}
                        placeholder="Article title"
                        className="w-full bg-transparent border-b-2 border-gray-700 focus:border-purple-500 text-3xl md:text-4xl font-bold py-2 focus:outline-none placeholder-gray-600"
                    />

                    <div>
                        <label className={labelClass}>
                            Summary <span className="text-gray-500 font-normal">(shown on cards & the homepage carousel)</span>
                        </label>
                        <textarea
                            value={form.summary}
                            onChange={(e) => set({ summary: e.target.value.slice(0, SUMMARY_MAX) })}
                            rows={3}
                            placeholder={autoSummary || "A short teaser for this article. Leave empty to generate it from the article body."}
                            className={`${inputClass} resize-y`}
                        />
                        <div className="text-xs text-gray-500 text-right">
                            {form.summary.length}/{SUMMARY_MAX}
                        </div>
                    </div>

                    <div>
                        <label className={labelClass}>Article body</label>
                        <RichArticleEditor
                            key={articleId || "new"}
                            initialValue={form.contentHtml}
                            onChange={(html) => html !== form.contentHtml && set({ contentHtml: html })}
                        />
                    </div>
                </div>

                {/* ------------ SIDEBAR ------------ */}
                <aside className="space-y-5">
                    {/* Publish box */}
                    <div className="bg-[#1f1f1f] border border-gray-700 rounded-xl p-5 space-y-4">
                        <h2 className="font-semibold text-lg">Publish</h2>
                        <div>
                            <label className={labelClass}>Publish date</label>
                            <input
                                type="date"
                                value={toInputDate(form.publishDate)}
                                onChange={(e) => e.target.value && set({ publishDate: fromInputDate(e.target.value) })}
                                className={`${inputClass} [color-scheme:dark]`}
                            />
                        </div>
                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={form.featured}
                                onChange={(e) => set({ featured: e.target.checked })}
                                className="mt-1 accent-amber-400 w-4 h-4"
                            />
                            <span>
                                <span className="flex items-center gap-1 font-medium">
                                    <Star className="w-4 h-4 text-amber-400" /> Featured
                                </span>
                                <span className="block text-xs text-gray-400">
                                    Shown as the big banner on /news and first in the homepage carousel.
                                </span>
                            </span>
                        </label>

                        <div className="border-t border-gray-700 pt-4 space-y-3">
                            <p className="text-sm font-medium text-gray-300">Show this article on</p>
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.showOnNewsPage}
                                    onChange={(e) => set({ showOnNewsPage: e.target.checked })}
                                    className="mt-1 accent-purple-500 w-4 h-4"
                                />
                                <span>
                                    <span className="flex items-center gap-1 font-medium">
                                        <Newspaper className="w-4 h-4 text-purple-300" /> News &amp; Events page
                                    </span>
                                    <span className="block text-xs text-gray-400">Listed on /news.</span>
                                </span>
                            </label>
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.showOnHomepage}
                                    onChange={(e) => set({ showOnHomepage: e.target.checked })}
                                    className="mt-1 accent-purple-500 w-4 h-4"
                                />
                                <span>
                                    <span className="flex items-center gap-1 font-medium">
                                        <Home className="w-4 h-4 text-purple-300" /> Homepage carousel
                                    </span>
                                    <span className="block text-xs text-gray-400">Shown in &quot;Latest News &amp; Events&quot; on the main page.</span>
                                </span>
                            </label>
                            {!form.showOnNewsPage && !form.showOnHomepage && (
                                <p className="text-xs text-orange-300 flex gap-1.5">
                                    <AlertTriangle className="w-4 h-4 shrink-0" />
                                    Hidden from both pages — people can only open it with the direct link.
                                </p>
                            )}
                        </div>

                        <div className="flex flex-col gap-2 pt-2">
                            <button
                                type="button"
                                disabled={!!saving}
                                onClick={() => save("published")}
                                className="inline-flex justify-center items-center gap-2 px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 font-semibold disabled:opacity-50"
                            >
                                {saving === "published" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                {isPublished ? "Update" : "Publish"}
                            </button>
                            <button
                                type="button"
                                disabled={!!saving}
                                onClick={() => save("draft")}
                                className="inline-flex justify-center items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50"
                            >
                                {saving === "draft" ? <Loader2 className="w-4 h-4 animate-spin" /> : isPublished ? <EyeOff className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                                {isPublished ? "Unpublish (move to draft)" : "Save draft"}
                            </button>
                            {isEdit && (
                                <button
                                    type="button"
                                    onClick={remove}
                                    className="inline-flex justify-center items-center gap-2 px-4 py-2 rounded-lg text-red-400 hover:bg-red-950/50 text-sm"
                                >
                                    <Trash2 className="w-4 h-4" /> Delete article
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Cover image */}
                    <div className="bg-[#1f1f1f] border border-gray-700 rounded-xl p-5 space-y-3">
                        <h2 className="font-semibold text-lg">Cover image</h2>
                        {form.coverImage ? (
                            <div className="relative group rounded-lg overflow-hidden border border-gray-600 aspect-video bg-black/40">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={form.coverImage} alt="Cover" className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => set({ coverImage: "", coverOriginal: "", coverEdits: null })}
                                    className="absolute top-2 right-2 bg-black/70 hover:bg-red-600 p-1.5 rounded-full"
                                    title="Remove cover"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                                <div className="absolute bottom-2 left-2 right-2 flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition">
                                    <button
                                        type="button"
                                        onClick={editExistingCover}
                                        className="flex-1 inline-flex items-center justify-center gap-1.5 bg-black/75 hover:bg-purple-600 text-xs font-semibold py-1.5 rounded-md"
                                    >
                                        <Crop className="w-3.5 h-3.5" /> Crop / edit
                                    </button>
                                    <label className="flex-1 inline-flex items-center justify-center gap-1.5 bg-black/75 hover:bg-purple-600 text-xs font-semibold py-1.5 rounded-md cursor-pointer">
                                        <Replace className="w-3.5 h-3.5" /> Replace
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                onCoverFile(e.target.files?.[0]);
                                                e.target.value = "";
                                            }}
                                        />
                                    </label>
                                </div>
                            </div>
                        ) : (
                            <label
                                className="flex flex-col items-center justify-center gap-2 aspect-video border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 text-gray-400 text-sm"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    onCoverFile(e.dataTransfer.files?.[0]);
                                }}
                            >
                                <Upload className="w-6 h-6" />
                                Click or drop an image
                                <span className="text-xs text-gray-500">You can crop it before it&apos;s applied</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        onCoverFile(e.target.files?.[0]);
                                        e.target.value = "";
                                    }}
                                />
                            </label>
                        )}
                        <input
                            value={form.coverImage}
                            onChange={(e) => set({ coverImage: e.target.value.trim(), coverOriginal: "", coverEdits: null })}
                            placeholder="…or paste an image URL"
                            className={`${inputClass} text-sm`}
                        />
                    </div>

                    {/* Details */}
                    <div className="bg-[#1f1f1f] border border-gray-700 rounded-xl p-5 space-y-4">
                        <h2 className="font-semibold text-lg">Details</h2>
                        <div>
                            <label className={labelClass}>Category</label>
                            <input
                                list="news-categories"
                                value={form.category}
                                onChange={(e) => set({ category: e.target.value })}
                                placeholder="Pick or type a new one"
                                className={inputClass}
                            />
                            <datalist id="news-categories">
                                {DEFAULT_CATEGORIES.map((c) => (
                                    <option key={c} value={c} />
                                ))}
                            </datalist>
                        </div>
                        <div>
                            <label className={labelClass}>Author / Division</label>
                            <input
                                value={form.author}
                                onChange={(e) => set({ author: e.target.value })}
                                placeholder="e.g. PPIT Shenzhen Media Team"
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>URL slug</label>
                            <div className="flex items-center bg-[#2a2a2a] border border-gray-600 rounded-lg focus-within:border-purple-500">
                                <span className="pl-3 text-gray-500 text-sm">/news/</span>
                                <input
                                    value={form.slug}
                                    onChange={(e) => {
                                        setSlugTouched(true);
                                        set({ slug: slugify(e.target.value) });
                                    }}
                                    className="flex-1 bg-transparent px-1 py-2 text-white focus:outline-none text-sm min-w-0"
                                />
                            </div>
                            {isEdit && isPublished && (
                                <p className="text-xs text-orange-300/80 mt-1">
                                    Changing the slug of a published article breaks links that were already shared.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Card preview */}
                    <div className="bg-[#1f1f1f] border border-gray-700 rounded-xl p-5">
                        <h2 className="font-semibold text-lg mb-3">Card preview</h2>
                        <div className="bg-[#61090A] border border-white/15 rounded-xl overflow-hidden">
                            <div className="relative h-32 bg-black/40">
                                {form.coverImage && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={form.coverImage} alt="" className="w-full h-full object-cover opacity-90" />
                                )}
                                {form.category && (
                                    <span className="absolute top-2 left-2 bg-red-700/90 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                                        {form.category}
                                    </span>
                                )}
                            </div>
                            <div className="p-4">
                                <span className="text-amber-400 text-[11px] font-semibold">{formatNewsDate(form.publishDate)}</span>
                                <h3 className="font-bold leading-snug line-clamp-2">{form.title || "Article title"}</h3>
                                <p className="text-white/70 text-xs line-clamp-3 mt-1">{form.summary || autoSummary || "Summary…"}</p>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>

            {/* Preview overlay */}
            {showPreview && (
                <div className="fixed inset-0 z-[70] bg-[#7E0C0E] overflow-y-auto">
                    <div className="sticky top-0 z-20 flex justify-between items-center px-4 md:px-8 py-3 bg-black/70 backdrop-blur">
                        <span className="text-sm text-gray-200">Preview — this is how the article will look on the website</span>
                        <button
                            type="button"
                            onClick={() => setShowPreview(false)}
                            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20"
                        >
                            <X className="w-4 h-4" /> Close preview
                        </button>
                    </div>
                    <div className="py-10 pb-24">
                        <ArticleView article={{ ...form, summary: form.summary || autoSummary }} preview />
                    </div>
                </div>
            )}

            {coverEditor && (
                <ImageEditorModal
                    key={coverEditor.src}
                    mode="cover"
                    title="Crop cover image"
                    src={coverEditor.src}
                    blobType={coverEditor.file?.type}
                    initialEdits={coverEditor.initialEdits}
                    defaultAspect={16 / 9}
                    onCancel={closeCoverEditor}
                    onApply={applyCover}
                />
            )}

            {toast && (
                <div
                    className={`fixed bottom-6 right-6 z-[80] px-5 py-3 rounded-lg shadow-2xl text-sm font-medium ${
                        toast.type === "success" ? "bg-green-600" : "bg-red-600"
                    }`}
                >
                    {toast.msg}
                </div>
            )}
        </div>
    );
}
