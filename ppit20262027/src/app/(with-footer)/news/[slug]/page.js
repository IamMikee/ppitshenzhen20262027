"use client";
import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ArticleView from "@/components/news/ArticleView";
import { subscribePublishedNews, formatNewsDate, isShownOnNewsPage } from "@/services/news";

export default function ArticleDetailPage({ params }) {
    const { slug } = use(params);
    const [articles, setArticles] = useState(null); // null = loading
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        const unsub = subscribePublishedNews(setArticles, () => {
            setFailed(true);
            setArticles([]);
        });
        return () => unsub();
    }, []);

    const article = useMemo(() => articles?.find((a) => a.slug === decodeURIComponent(slug)), [articles, slug]);

    const related = useMemo(() => {
        if (!article || !articles) return [];
        const others = articles.filter((a) => a.id !== article.id && isShownOnNewsPage(a));
        const sameCat = others.filter((a) => a.category === article.category);
        return [...sameCat, ...others.filter((a) => a.category !== article.category)].slice(0, 3);
    }, [articles, article]);

    useEffect(() => {
        if (article?.title) document.title = `${article.title} | PPIT Shenzhen`;
    }, [article]);

    return (
        <div className="relative min-h-screen bg-[#7E0C0E] text-white font-montserrat pt-28 pb-24 overflow-hidden">
            <div className="absolute top-0 right-0 h-full w-[120px] sm:w-[230px] bg-[url('/Home/motif_batik_hp.webp')] sm:bg-[url('/Home/motif_batik.webp')] opacity-10 bg-repeat-y pointer-events-none z-0" />
            <div className="absolute top-0 left-0 h-full w-[120px] sm:w-[230px] scale-x-[-1] bg-[url('/Home/motif_batik_hp.webp')] sm:bg-[url('/Home/motif_batik.webp')] opacity-10 bg-repeat-y pointer-events-none z-0" />

            {articles === null ? (
                <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-8 animate-pulse">
                    <div className="h-4 w-48 bg-white/10 rounded mb-8" />
                    <div className="h-6 w-32 bg-white/10 rounded-full mb-4" />
                    <div className="h-12 w-full bg-white/10 rounded mb-3" />
                    <div className="h-12 w-2/3 bg-white/10 rounded mb-8" />
                    <div className="h-[400px] w-full bg-white/10 rounded-2xl" />
                </div>
            ) : !article ? (
                <div className="relative z-10 max-w-2xl mx-auto px-6 text-center py-24">
                    <h1 className="text-4xl font-extrabold mb-4">Article not found</h1>
                    <p className="text-white/70 mb-8">
                        {failed
                            ? "We couldn't load this article right now. Please try again later."
                            : "This article may have been moved or removed."}
                    </p>
                    <Link href="/news" className="bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-3 rounded-lg transition">
                        Back to News & Events
                    </Link>
                </div>
            ) : (
                <ArticleView article={article}>
                    {related.length > 0 && (
                        <section className="mt-20">
                            <h2 className="text-2xl font-bold uppercase tracking-wider mb-8 flex items-center gap-3">
                                <span>More News</span>
                                <div className="flex-1 h-[1px] bg-white/15" />
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {related.map((a) => (
                                    <Link
                                        key={a.id}
                                        href={`/news/${a.slug}`}
                                        className="bg-[#61090A] border border-white/15 rounded-xl overflow-hidden hover:border-amber-400/50 transition group"
                                    >
                                        <div className="h-36 bg-black/40 overflow-hidden">
                                            {a.coverImage && (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={a.coverImage}
                                                    alt={a.title}
                                                    loading="lazy"
                                                    className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500"
                                                />
                                            )}
                                        </div>
                                        <div className="p-4">
                                            <span className="text-amber-400 text-xs font-semibold">{formatNewsDate(a.publishDate)}</span>
                                            <h3 className="font-bold leading-snug line-clamp-2 group-hover:text-amber-300 transition">
                                                {a.title}
                                            </h3>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}
                </ArticleView>
            )}
        </div>
    );
}
