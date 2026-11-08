import { db } from "../lib/firebase";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    onSnapshot,
    serverTimestamp,
    Timestamp,
} from "firebase/firestore";

/*
 * Firestore collection: "news"
 * Each document:
 * {
 *   title:        string
 *   slug:         string   (URL of the article: /news/<slug>)
 *   category:     string
 *   author:       string
 *   summary:      string   (short text shown on cards / carousel)
 *   coverImage:   string   (image URL, usually Cloudinary)
 *   coverOriginal / coverEdits: uncropped cover URL + editor settings (for re-cropping)
 *   contentHtml:  string   (rich text body from the editor)
 *   status:       "draft" | "published"
 *   featured:     boolean  (shown as the big banner on /news, first in the homepage carousel)
 *   showOnNewsPage: boolean (listed on /news — the article link still works when false)
 *   showOnHomepage: boolean (shown in the homepage carousel)
 *   publishDate:  Timestamp (date displayed on the article)
 *   createdAt / updatedAt: Timestamp
 * }
 */

export const NEWS_COLLECTION = "news";

export const DEFAULT_CATEGORIES = [
    "Campus & Events",
    "Culture & Etiquette",
    "Global News",
    "Workshops",
    "Announcements",
];

// ---------- helpers ----------

export function slugify(text = "") {
    return text
        .toString()
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 80);
}

export function toDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value.toDate === "function") return value.toDate();
    if (typeof value.seconds === "number") return new Date(value.seconds * 1000);
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
}

export function formatNewsDate(value) {
    const d = toDate(value);
    if (!d) return "";
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export function readingTime(html = "") {
    const text = htmlToText(html);
    const words = text ? text.split(/\s+/).length : 0;
    return Math.max(1, Math.round(words / 200));
}

export function htmlToText(html = "") {
    if (typeof window === "undefined") return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const div = document.createElement("div");
    div.innerHTML = html;
    return (div.textContent || "").replace(/\s+/g, " ").trim();
}

// Newest first, by publish date (falls back to createdAt)
function sortByDateDesc(a, b) {
    const da = toDate(a.publishDate) || toDate(a.createdAt) || new Date(0);
    const dbb = toDate(b.publishDate) || toDate(b.createdAt) || new Date(0);
    return dbb - da;
}

function snapToList(snapshot) {
    const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    return list.sort(sortByDateDesc);
}

// Visibility flags — articles saved before these existed count as visible.
export const isShownOnNewsPage = (a) => a?.showOnNewsPage !== false;
export const isShownOnHomepage = (a) => a?.showOnHomepage !== false;

// ---------- public reads ----------

/** Live subscription to all published articles (newest first). Returns unsubscribe fn. */
export function subscribePublishedNews(callback, onError) {
    const q = query(collection(db, NEWS_COLLECTION), where("status", "==", "published"));
    return onSnapshot(
        q,
        (snap) => callback(snapToList(snap)),
        (err) => {
            console.error("Error loading news:", err);
            onError?.(err);
        }
    );
}

// ---------- admin ----------

/** Live subscription to every article, drafts included (admin only). */
export function subscribeAllNews(callback, onError) {
    return onSnapshot(
        collection(db, NEWS_COLLECTION),
        (snap) => callback(snapToList(snap)),
        (err) => {
            console.error("Error loading news (admin):", err);
            onError?.(err);
        }
    );
}

export async function getNewsById(id) {
    const snap = await getDoc(doc(db, NEWS_COLLECTION, id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Ensures the slug is unique; appends -2, -3 … if needed. */
export async function ensureUniqueSlug(baseSlug, excludeId = null) {
    const base = slugify(baseSlug) || `article-${Date.now()}`;
    const snap = await getDocs(collection(db, NEWS_COLLECTION));
    const taken = new Set(
        snap.docs.filter((d) => d.id !== excludeId).map((d) => d.data().slug)
    );
    if (!taken.has(base)) return base;
    let i = 2;
    while (taken.has(`${base}-${i}`)) i++;
    return `${base}-${i}`;
}

function normalizeForSave(data) {
    const publishDate = toDate(data.publishDate) || new Date();
    return {
        title: (data.title || "").trim(),
        slug: data.slug,
        category: (data.category || "").trim(),
        author: (data.author || "").trim(),
        summary: (data.summary || "").trim(),
        coverImage: data.coverImage || "",
        // original (uncropped) cover + crop settings, so the cover can be re-cropped later
        coverOriginal: data.coverImage ? data.coverOriginal || "" : "",
        coverEdits: data.coverImage && data.coverEdits ? data.coverEdits : null,
        contentHtml: data.contentHtml || "",
        status: data.status === "published" ? "published" : "draft",
        featured: !!data.featured,
        showOnNewsPage: data.showOnNewsPage !== false,
        showOnHomepage: data.showOnHomepage !== false,
        publishDate: Timestamp.fromDate(publishDate),
    };
}

export async function createNews(data, user) {
    const slug = await ensureUniqueSlug(data.slug || data.title);
    const payload = {
        ...normalizeForSave({ ...data, slug }),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user?.email || null,
        updatedBy: user?.email || null,
    };
    const ref = await addDoc(collection(db, NEWS_COLLECTION), payload);
    return { id: ref.id, slug };
}

export async function updateNews(id, data, user) {
    const slug = await ensureUniqueSlug(data.slug || data.title, id);
    const payload = {
        ...normalizeForSave({ ...data, slug }),
        updatedAt: serverTimestamp(),
        updatedBy: user?.email || null,
    };
    await updateDoc(doc(db, NEWS_COLLECTION, id), payload);
    return { id, slug };
}

export async function patchNews(id, fields) {
    await updateDoc(doc(db, NEWS_COLLECTION, id), { ...fields, updatedAt: serverTimestamp() });
}

export async function deleteNews(id) {
    await deleteDoc(doc(db, NEWS_COLLECTION, id));
}

export async function duplicateNews(article, user) {
    const { id, createdAt, updatedAt, ...rest } = article;
    return createNews(
        { ...rest, title: `${rest.title} (Copy)`, slug: `${rest.slug}-copy`, status: "draft", featured: false },
        user
    );
}

// ---------- image upload (Cloudinary, unsigned) ----------

export async function uploadNewsImage(file) {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const preset =
        process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_NEWS ||
        process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !preset) {
        throw new Error("Cloudinary is not configured (missing cloud name or upload preset).");
    }
    const formData = new FormData();
    // edited images arrive as unnamed Blobs → give them a filename
    const ext = (file.type || "image/jpeg").split("/")[1] || "jpg";
    formData.append("file", file, file.name || `edited-${Date.now()}.${ext}`);
    formData.append("upload_preset", preset);
    formData.append("folder", "news");

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || "Image upload failed");
    return data.secure_url;
}
