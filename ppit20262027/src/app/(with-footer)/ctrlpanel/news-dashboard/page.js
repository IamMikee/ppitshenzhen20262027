"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    Plus, Search, Pencil, Trash2, Copy, ExternalLink, Star, Eye, EyeOff, Loader2, Newspaper, Home,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import {
    subscribeAllNews, deleteNews, patchNews, duplicateNews, formatNewsDate, toDate,
    isShownOnNewsPage, isShownOnHomepage,
} from "@/services/news";

const FILTERS = [
    { key: "all", label: "All" },
    { key: "published", label: "Published" },
    { key: "draft", label: "Drafts" },
    { key: "featured", label: "Featured" },
];

export default function NewsDashboardPage() {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");
    const [busyId, setBusyId] = useState(null);

    useEffect(() => {
        const unsub = subscribeAllNews(
            (list) => {
                setArticles(list);
                setLoading(false);
            },
            (err) => {
                setError(
                    err?.code === "permission-denied"
                        ? "Firestore denied access to the 'news' collection. Update your Firestore security rules (see setup notes)."
                        : err.message
                );
                setLoading(false);
            }
        );
        return () => unsub();
    }, []);

    const counts = useMemo(
        () => ({
            all: articles.length,
            published: articles.filter((a) => a.status === "published").length,
            draft: articles.filter((a) => a.status !== "published").length,
            featured: articles.filter((a) => a.featured).length,
        }),
        [articles]
    );

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        return articles.filter((a) => {
            if (filter === "published" && a.status !== "published") return false;
            if (filter === "draft" && a.status === "published") return false;
            if (filter === "featured" && !a.featured) return false;
            if (!q) return true;
            return [a.title, a.category, a.author, a.summary].some((v) => v?.toLowerCase().includes(q));
        });
    }, [articles, search, filter]);

    const run = async (id, fn) => {
        setBusyId(id);
        try {
            await fn();
        } catch (err) {
            alert(`Action failed: ${err.message}`);
        } finally {
            setBusyId(null);
        }
    };

    const handleDelete = (a) => {
        if (!confirm(`Delete "${a.title}" permanently? This cannot be undone.`)) return;
        run(a.id, () => deleteNews(a.id));
    };

    const togglePublish = (a) =>
        run(a.id, () => patchNews(a.id, { status: a.status === "published" ? "draft" : "published" }));

    const setVisibility = (a, field, value) => run(a.id, () => patchNews(a.id, { [field]: value }));

    const toggleFeatured = (a) => run(a.id, () => patchNews(a.id, { featured: !a.featured }));

    const handleDuplicate = (a) => run(a.id, () => duplicateNews(a, auth.currentUser));

    return (
        <div className="text-white font-montserrat">
            {/* Header */}
            <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
                        <Newspaper className="w-8 h-8 text-purple-400" /> News & Events
                    </h1>
                    <p className="text-gray-400 mt-1">
                        Create, edit and publish articles. Published articles appear instantly on <code>/news</code> and the homepage carousel.
                    </p>
                </div>
                <Link
                    href="/ctrlpanel/news-dashboard/new"
                    className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 px-5 py-3 rounded-lg font-semibold shadow-lg transition"
                >
                    <Plus className="w-5 h-5" /> New Article
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                    { label: "Total", value: counts.all, color: "text-white" },
                    { label: "Published", value: counts.published, color: "text-green-400" },
                    { label: "Drafts", value: counts.draft, color: "text-yellow-400" },
                    { label: "Featured", value: counts.featured, color: "text-amber-400" },
                ].map((s) => (
                    <div key={s.label} className="bg-[#1f1f1f] border border-gray-700 rounded-xl p-4">
                        <div className="text-gray-400 text-sm">{s.label}</div>
                        <div className={`text-3xl font-bold ${s.color}`}>{loading ? "–" : s.value}</div>
                    </div>
                ))}
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between mb-4">
                <div className="flex flex-wrap gap-2">
                    {FILTERS.map((f) => (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            className={`px-4 py-1.5 rounded-full text-sm transition ${
                                filter === f.key ? "bg-purple-600 text-white" : "bg-[#2a2a2a] text-gray-300 hover:bg-gray-700"
                            }`}
                        >
                            {f.label} <span className="opacity-60">({counts[f.key]})</span>
                        </button>
                    ))}
                </div>
                <div className="relative md:w-72">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search articles…"
                        className="w-full bg-[#2a2a2a] border border-gray-600 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                    />
                </div>
            </div>

            {error && (
                <div className="mb-4 p-4 rounded-lg bg-red-900/50 border border-red-700 text-red-200 text-sm">{error}</div>
            )}

            {/* List */}
            <div className="bg-[#1f1f1f] border border-gray-700 rounded-xl overflow-hidden">
                {loading ? (
                    <div className="flex justify-center items-center py-20 text-gray-400 gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" /> Loading articles…
                    </div>
                ) : visible.length === 0 ? (
                    <div className="text-center py-20 px-6">
                        <Newspaper className="w-12 h-12 mx-auto text-gray-600 mb-3" />
                        <p className="text-gray-400 mb-4">
                            {articles.length === 0 ? "No articles yet. Write your first one!" : "No articles match your filters."}
                        </p>
                        {articles.length === 0 && (
                            <Link
                                href="/ctrlpanel/news-dashboard/new"
                                className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg font-semibold"
                            >
                                <Plus className="w-4 h-4" /> New Article
                            </Link>
                        )}
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-700">
                        {visible.map((a) => {
                            const published = a.status === "published";
                            const busy = busyId === a.id;
                            const updated = toDate(a.updatedAt);
                            return (
                                <li key={a.id} className={`flex flex-col sm:flex-row gap-4 p-4 hover:bg-[#252525] transition ${busy ? "opacity-60" : ""}`}>
                                    <Link
                                        href={`/ctrlpanel/news-dashboard/${a.id}/edit`}
                                        className="relative shrink-0 w-full sm:w-40 aspect-video rounded-lg overflow-hidden bg-black/40 border border-gray-700"
                                    >
                                        {a.coverImage ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={a.coverImage} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-600">
                                                <Newspaper className="w-8 h-8" />
                                            </div>
                                        )}
                                    </Link>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <span
                                                className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                                    published ? "bg-green-900/60 text-green-300" : "bg-yellow-900/60 text-yellow-300"
                                                }`}
                                            >
                                                {published ? "Published" : "Draft"}
                                            </span>
                                            {a.featured && (
                                                <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-900/60 text-amber-300 inline-flex items-center gap-1">
                                                    <Star className="w-3 h-3" /> Featured
                                                </span>
                                            )}
                                            {a.category && <span className="text-xs text-gray-400">{a.category}</span>}
                                        </div>
                                        <Link
                                            href={`/ctrlpanel/news-dashboard/${a.id}/edit`}
                                            className="font-semibold text-lg hover:text-purple-300 line-clamp-1"
                                        >
                                            {a.title || "Untitled"}
                                        </Link>
                                        <p className="text-sm text-gray-400 line-clamp-1">{a.summary}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {formatNewsDate(a.publishDate)}
                                            {a.author && ` · ${a.author}`}
                                            {updated && ` · edited ${updated.toLocaleString()}`}
                                            {a.updatedBy && ` by ${a.updatedBy}`}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-2 text-sm">
                                            <label className="inline-flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white">
                                                <input
                                                    type="checkbox"
                                                    disabled={busy}
                                                    checked={isShownOnNewsPage(a)}
                                                    onChange={(e) => setVisibility(a, "showOnNewsPage", e.target.checked)}
                                                    className="accent-purple-500 w-4 h-4"
                                                />
                                                <Newspaper className="w-3.5 h-3.5" /> News page
                                            </label>
                                            <label className="inline-flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white">
                                                <input
                                                    type="checkbox"
                                                    disabled={busy}
                                                    checked={isShownOnHomepage(a)}
                                                    onChange={(e) => setVisibility(a, "showOnHomepage", e.target.checked)}
                                                    className="accent-purple-500 w-4 h-4"
                                                />
                                                <Home className="w-3.5 h-3.5" /> Homepage carousel
                                            </label>
                                            {!published && (
                                                <span className="text-xs text-yellow-500/80">(only takes effect once published)</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex sm:flex-col md:flex-row items-center gap-1 shrink-0 self-start sm:self-center">
                                        {busy ? (
                                            <Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-3" />
                                        ) : (
                                            <>
                                                <IconBtn title="Edit" href={`/ctrlpanel/news-dashboard/${a.id}/edit`}>
                                                    <Pencil className="w-4 h-4" />
                                                </IconBtn>
                                                <IconBtn title={published ? "Unpublish" : "Publish"} onClick={() => togglePublish(a)}>
                                                    {published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </IconBtn>
                                                <IconBtn title={a.featured ? "Unfeature" : "Feature"} onClick={() => toggleFeatured(a)}>
                                                    <Star className={`w-4 h-4 ${a.featured ? "fill-amber-400 text-amber-400" : ""}`} />
                                                </IconBtn>
                                                <IconBtn title="Duplicate" onClick={() => handleDuplicate(a)}>
                                                    <Copy className="w-4 h-4" />
                                                </IconBtn>
                                                {published && (
                                                    <IconBtn title="View on site" href={`/news/${a.slug}`} external>
                                                        <ExternalLink className="w-4 h-4" />
                                                    </IconBtn>
                                                )}
                                                <IconBtn title="Delete" danger onClick={() => handleDelete(a)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </IconBtn>
                                            </>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}

function IconBtn({ title, onClick, href, external, danger, children }) {
    const cls = `p-2 rounded-lg transition ${
        danger ? "text-red-400 hover:bg-red-950/60" : "text-gray-300 hover:bg-gray-700 hover:text-white"
    }`;
    if (href) {
        return external ? (
            <a href={href} target="_blank" rel="noopener noreferrer" title={title} aria-label={title} className={cls}>
                {children}
            </a>
        ) : (
            <Link href={href} title={title} aria-label={title} className={cls}>
                {children}
            </Link>
        );
    }
    return (
        <button type="button" onClick={onClick} title={title} aria-label={title} className={cls}>
            {children}
        </button>
    );
}
