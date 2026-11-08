"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, Clock, Newspaper, X } from "lucide-react";
import Heronews from "../../../../public/News/temporary2.png";
import { subscribePublishedNews, formatNewsDate, readingTime, isShownOnNewsPage, htmlToText } from "@/services/news";

const PAGE_SIZE = 9;

function CoverImage({ src, alt, className = "" }) {
    if (!src) {
        return (
            <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-[#61090A] to-black/60 ${className}`}>
                <Newspaper className="w-12 h-12 text-white/20" />
            </div>
        );
    }
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} loading="lazy" className={`w-full h-full object-cover ${className}`} />;
}

// lowercase, no accents, no apostrophes, punctuation → spaces ("Do's & Don'ts" → "dos donts")
function normalize(text = "") {
    return text
        .toString()
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/['’`]/g, "")
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim();
}

// a short piece of the article body around the first match
function makeSnippet(body, _bodyNorm, terms) {
    const lower = body.toLowerCase();
    let pos = -1;
    for (const t of terms) {
        pos = lower.indexOf(t);
        if (pos !== -1) break;
    }
    if (pos === -1) return body.slice(0, 140) + (body.length > 140 ? "…" : "");
    const start = Math.max(0, pos - 60);
    const end = Math.min(body.length, pos + 100);
    return `${start > 0 ? "…" : ""}${body.slice(start, end).trim()}${end < body.length ? "…" : ""}`;
}

function Highlight({ text = "", terms }) {
    if (!terms.length || !text) return text;
    const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const re = new RegExp(`(${escaped.join("|")})`, "gi");
    return text.split(re).map((part, i) =>
        i % 2 === 1 ? (
            <mark key={i} className="bg-amber-400/90 text-red-950 rounded px-0.5">
                {part}
            </mark>
        ) : (
            part
        )
    );
}

function ArrowIcon({ className = "w-4 h-4" }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
    );
}

export default function NewsPage() {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [search, setSearch] = useState("");
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

    useEffect(() => {
        const unsub = subscribePublishedNews(
            (list) => {
                setArticles(list.filter(isShownOnNewsPage));
                setLoading(false);
            },
            () => {
                setFailed(true);
                setLoading(false);
            }
        );
        return () => unsub();
    }, []);

    const categories = useMemo(
        () => ["All", ...Array.from(new Set(articles.map((a) => a.category).filter(Boolean)))],
        [articles]
    );

    const featuredArticle = useMemo(() => articles.find((a) => a.featured) || articles[0], [articles]);

    // ---------- search ----------
    const searchRef = useRef(null);
    const terms = useMemo(() => normalize(search).split(" ").filter(Boolean), [search]);
    const isSearching = terms.length > 0;

    // pre-computed, normalized text of every article (title, summary, body, …)
    const index = useMemo(
        () =>
            articles.map((a) => {
                const body = htmlToText(a.contentHtml || "");
                return {
                    article: a,
                    body,
                    title: normalize(a.title),
                    summary: normalize(a.summary),
                    meta: normalize(`${a.category || ""} ${a.author || ""} ${formatNewsDate(a.publishDate)}`),
                    bodyNorm: normalize(body),
                };
            }),
        [articles]
    );

    const results = useMemo(() => {
        const inCategory = (a) => selectedCategory === "All" || a.category === selectedCategory;
        if (!isSearching) {
            return index
                .filter(({ article: a }) => inCategory(a))
                // the featured article has its own banner unless a category is picked
                .filter(({ article: a }) => selectedCategory !== "All" || a.id !== featuredArticle?.id)
                .map((e) => ({ ...e, score: 0, snippet: null }));
        }
        return index
            .filter(({ article: a }) => inCategory(a))
            .map((e) => {
                let score = 0;
                for (const t of terms) {
                    // every word must appear somewhere (any order)
                    const inTitle = e.title.includes(t);
                    const inSummary = e.summary.includes(t);
                    const inMeta = e.meta.includes(t);
                    const inBody = e.bodyNorm.includes(t);
                    if (!inTitle && !inSummary && !inMeta && !inBody) return null;
                    score += (inTitle ? 10 : 0) + (inSummary ? 4 : 0) + (inMeta ? 3 : 0) + (inBody ? 1 : 0);
                }
                if (e.title.includes(terms.join(" "))) score += 15; // exact phrase in title
                const matchedInBodyOnly = !terms.some((t) => e.title.includes(t) || e.summary.includes(t));
                return { ...e, score, snippet: matchedInBodyOnly ? makeSnippet(e.body, e.bodyNorm, terms) : null };
            })
            .filter(Boolean)
            .sort((x, y) => y.score - x.score);
    }, [index, terms, isSearching, selectedCategory, featuredArticle]);

    // keep ?q= in the URL (shareable + survives refresh)
    useEffect(() => {
        const q = new URLSearchParams(window.location.search).get("q");
        if (q) setSearch(q);
    }, []);
    useEffect(() => {
        const url = new URL(window.location.href);
        if (search.trim()) url.searchParams.set("q", search.trim());
        else url.searchParams.delete("q");
        window.history.replaceState(window.history.state, "", url);
    }, [search]);

    // "/" focuses the search box, Esc clears it
    useEffect(() => {
        const onKey = (e) => {
            const typing = ["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName);
            if (e.key === "/" && !typing) {
                e.preventDefault();
                searchRef.current?.focus();
                searchRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, []);

    const clearSearch = () => {
        setSearch("");
        searchRef.current?.focus();
    };

    useEffect(() => setVisibleCount(PAGE_SIZE), [selectedCategory, search]);

    return (
        <div className="bg-[#7E0C0E] text-white font-montserrat min-h-screen">
            {/* ========================================== */}
            {/*              HERO SECTION                  */}
            {/* ========================================== */}
            <div className="relative font-montserrat">
                <div className="relative h-[85vh] md:h-[111.5vh] flex flex-col justify-center items-center text-center px-4 overflow-hidden -top-10">
                    <Image
                        src={Heronews}
                        alt="News & Events Hero"
                        className="w-full h-full object-cover absolute inset-0 brightness-10"
                        priority
                        quality={90}
                    />

                    <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
                        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white tracking-tight uppercase drop-shadow-2xl mb-3">
                            News &amp; Events
                        </h1>
                        <div className="w-24 h-1 bg-amber-400 mt-6 rounded-full"></div>
                    </div>

                    <div className="absolute inset-x-0 bottom-12 flex flex-col items-center z-10">
                        <p className="text-xl sm:text-2xl md:text-3xl text-amber-400 font-semibold tracking-wide drop-shadow-md">
                            See what&apos;s happening!
                        </p>
                        <Link
                            href="#latest-news"
                            className="animate-bounce drop-shadow-lg !smooth-scroll text-white hover:text-amber-400 transition-colors"
                            aria-label="Scroll down to latest news"
                        >
                            <svg width="56" height="100" viewBox="0 0 24 24" fill="none" className="stroke-current">
                                <path d="M7 10L12 15L17 10" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </Link>
                    </div>

                    <div className="absolute -bottom-1 left-0 w-full h-[120px] pointer-events-none overflow-hidden z-10">
                        <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="w-full h-full">
                            <path
                                d="M0 96L48 106.7C96 117 192 139 288 160C384 181 480 181 576 160C672 139 768 96 864 80C960 64 1056 75 1152 96C1248 117 1344 149 1392 165.3L1440 181V320H0V96Z"
                                fill="#7E0C0E"
                            />
                        </svg>
                    </div>
                </div>
            </div>

            {/* ========================================== */}
            {/*            MAIN CONTENT CONTAINER          */}
            {/* ========================================== */}
            <div id="latest-news" className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 pb-24 scroll-mt-24">
                <div className="absolute top-0 right-0 h-full w-[120px] sm:w-[230px] bg-[url('/Home/motif_batik_hp.webp')] sm:bg-[url('/Home/motif_batik.webp')] opacity-10 bg-repeat-y pointer-events-none z-0" />
                <div className="absolute top-0 left-0 h-full w-[120px] sm:w-[230px] scale-x-[-1] bg-[url('/Home/motif_batik_hp.webp')] sm:bg-[url('/Home/motif_batik.webp')] opacity-10 bg-repeat-y pointer-events-none z-0" />

                {loading ? (
                    <LoadingState />
                ) : failed ? (
                    <EmptyState text="We couldn't load the news right now. Please try again later." />
                ) : articles.length === 0 ? (
                    <EmptyState text="No news yet — stay tuned for upcoming events and stories!" />
                ) : (
                    <>
                        {/* FEATURED / LATEST NEWS BANNER */}
                        {featuredArticle && (
                            <div className="mb-16 relative z-10">
                                <h2 className="text-sm font-bold tracking-[0.2em] text-white/70 uppercase mb-4">
                                    {featuredArticle.featured ? "Featured" : "Latest News / Event"}
                                </h2>
                                <Link
                                    href={`/news/${featuredArticle.slug}`}
                                    className="bg-[#61090A] border border-white/15 rounded-2xl overflow-hidden shadow-2xl grid grid-cols-1 lg:grid-cols-12 group hover:border-amber-400/40 transition duration-300"
                                >
                                    <div className="lg:col-span-7 relative min-h-[260px] lg:min-h-[420px] bg-black/40 overflow-hidden">
                                        <div className="absolute inset-0">
                                            <CoverImage
                                                src={featuredArticle.coverImage}
                                                alt={featuredArticle.title}
                                                className="group-hover:scale-105 transition-transform duration-700 opacity-90"
                                            />
                                        </div>
                                        {featuredArticle.category && (
                                            <div className="absolute top-4 left-4 bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
                                                {featuredArticle.category}
                                            </div>
                                        )}
                                    </div>
                                    <div className="lg:col-span-5 p-8 md:p-10 flex flex-col justify-between bg-gradient-to-b from-[#61090A] to-[#4c0708]">
                                        <div>
                                            <span className="text-amber-400 text-sm font-semibold flex items-center gap-3 mb-2">
                                                {formatNewsDate(featuredArticle.publishDate)}
                                                <span className="text-white/50 font-normal inline-flex items-center gap-1">
                                                    <Clock className="w-3.5 h-3.5" /> {readingTime(featuredArticle.contentHtml)} min read
                                                </span>
                                            </span>
                                            <h3 className="text-2xl md:text-3xl font-bold leading-snug text-white mb-4">
                                                {featuredArticle.title}
                                            </h3>
                                            <p className="text-white/80 text-sm md:text-base leading-relaxed mb-6 line-clamp-5">
                                                {featuredArticle.summary}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="inline-flex items-center gap-3 bg-red-600 group-hover:bg-red-500 text-white font-bold px-6 py-3 rounded-lg shadow-lg transition duration-300 group-hover:scale-105">
                                                <span>Read More</span>
                                                <ArrowIcon className="w-5 h-5" />
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        )}

                        {/* FILTERS */}
                        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-10 pb-4 border-b border-white/10">
                            <div className="flex flex-wrap items-center gap-3">
                                {categories.map((cat) => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`px-5 py-2 rounded-full text-sm font-semibold transition duration-200 ${
                                            selectedCategory === cat
                                                ? "bg-amber-400 text-red-950 font-bold shadow-md"
                                                : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
                                        }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ALL NEWS & EVENTS GRID */}
                        <div className="relative z-10">
                            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
                                <h2 className="flex-1 min-w-0 text-2xl font-bold uppercase tracking-wider text-white flex items-center gap-3">
                                <span>
                                    {isSearching
                                        ? `${results.length} result${results.length === 1 ? "" : "s"} for “${search.trim()}”`
                                        : selectedCategory === "All"
                                        ? "All News & Events"
                                        : selectedCategory}
                                    {isSearching && selectedCategory !== "All" && (
                                        <span className="text-white/50 normal-case font-medium text-base"> in {selectedCategory}</span>
                                    )}
                                </span>
                                    <div className="flex-1 h-[1px] bg-white/15 min-w-[2rem]"></div>
                                </h2>
                                <div className="relative w-full md:w-80 shrink-0">
                                    <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none" />
                                    <input
                                        ref={searchRef}
                                        type="search"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        onKeyDown={(e) => e.key === "Escape" && setSearch("")}
                                        placeholder="Search news & events…"
                                        aria-label="Search news and events"
                                        className="w-full bg-white/10 border border-white/20 rounded-full pl-10 pr-10 py-2.5 text-sm text-white placeholder-white/50 focus:outline-none focus:border-amber-400 focus:bg-white/15 transition [&::-webkit-search-cancel-button]:hidden"
                                    />
                                    {search ? (
                                        <button
                                            type="button"
                                            onClick={clearSearch}
                                            aria-label="Clear search"
                                            title="Clear search (Esc)"
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/15"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    ) : (
                                        <kbd className="hidden md:block absolute right-4 top-1/2 -translate-y-1/2 text-[11px] text-white/50 border border-white/25 rounded px-1.5">
                                            /
                                        </kbd>
                                    )}
                                </div>
                            </div>

                            {results.length === 0 ? (
                                <div className="text-center py-16">
                                    <Search className="w-10 h-10 mx-auto text-white/30 mb-3" />
                                    <p className="text-white/80 text-lg mb-1">
                                        {isSearching ? <>No articles match &ldquo;{search.trim()}&rdquo;.</> : "No articles in this category yet."}
                                    </p>
                                    {isSearching && (
                                        <p className="text-white/50 text-sm mb-6">Try fewer or different words, or check the spelling.</p>
                                    )}
                                    <div className="flex justify-center gap-3">
                                        {isSearching && (
                                            <button
                                                type="button"
                                                onClick={clearSearch}
                                                className="px-5 py-2 rounded-full bg-amber-400 text-red-950 font-bold hover:bg-amber-300"
                                            >
                                                Clear search
                                            </button>
                                        )}
                                        {selectedCategory !== "All" && (
                                            <button
                                                type="button"
                                                onClick={() => setSelectedCategory("All")}
                                                className="px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 font-semibold"
                                            >
                                                Show all categories
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {results.slice(0, visibleCount).map(({ article, snippet }) => (
                                        <Link
                                            key={article.id}
                                            href={`/news/${article.slug}`}
                                            className="bg-[#61090A] border border-white/15 rounded-xl overflow-hidden shadow-xl flex flex-col justify-between hover:border-amber-400/50 hover:shadow-2xl hover:-translate-y-1 transition duration-300 group"
                                        >
                                            <div>
                                                <div className="relative h-48 w-full bg-black/40 overflow-hidden">
                                                    <CoverImage
                                                        src={article.coverImage}
                                                        alt={article.title}
                                                        className="group-hover:scale-105 transition-transform duration-500 opacity-90"
                                                    />
                                                    {article.category && (
                                                        <div className="absolute top-3 left-3 bg-red-700/90 text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                                            {article.category}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="p-6">
                                                    <span className="text-amber-400 text-xs font-semibold block mb-2">
                                                        {formatNewsDate(article.publishDate)}
                                                    </span>
                                                    <h3 className="text-xl font-bold text-white mb-3 line-clamp-2 leading-snug group-hover:text-amber-300 transition duration-200">
                                                        <Highlight text={article.title} terms={terms} />
                                                    </h3>
                                                    <p className="text-white/75 text-sm line-clamp-3 leading-relaxed mb-4">
                                                        <Highlight text={snippet || article.summary} terms={terms} />
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="px-6 pb-6 pt-4 border-t border-white/10 flex justify-between items-center">
                                                <span className="text-white/50 text-xs inline-flex items-center gap-1">
                                                    <Clock className="w-3.5 h-3.5" /> {readingTime(article.contentHtml)} min read
                                                </span>
                                                <span className="inline-flex items-center gap-2 bg-red-600 group-hover:bg-red-500 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition duration-300">
                                                    <span>Read More</span>
                                                    <ArrowIcon />
                                                </span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}

                            {results.length > visibleCount && (
                                <div className="flex justify-center mt-12">
                                    <button
                                        onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                                        className="px-8 py-3 rounded-full border-2 border-amber-400 text-amber-400 font-bold hover:bg-amber-400 hover:text-red-950 transition"
                                    >
                                        Load more
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function LoadingState() {
    return (
        <div className="relative z-10 animate-pulse">
            <div className="h-4 w-40 bg-white/10 rounded mb-4" />
            <div className="h-[420px] bg-white/10 rounded-2xl mb-16" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[0, 1, 2].map((i) => (
                    <div key={i} className="h-[400px] bg-white/10 rounded-xl" />
                ))}
            </div>
        </div>
    );
}

function EmptyState({ text }) {
    return (
        <div className="relative z-10 text-center py-24">
            <Newspaper className="w-14 h-14 mx-auto text-white/30 mb-4" />
            <p className="text-white/70 text-lg">{text}</p>
        </div>
    );
}
