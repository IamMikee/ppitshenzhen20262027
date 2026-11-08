"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, Clock, User, Share2, Check } from "lucide-react";
import ArticleContent from "./ArticleContent";
import { formatNewsDate, readingTime } from "@/services/news";

/** Full article layout, shared by /news/[slug] and the dashboard preview. */
export default function ArticleView({ article, preview = false, children }) {
    const [copied, setCopied] = useState(false);

    const share = async () => {
        const url = window.location.href;
        try {
            if (navigator.share) {
                await navigator.share({ title: article.title, text: article.summary, url });
                return;
            }
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            /* user cancelled */
        }
    };

    return (
        <article className="relative z-10 max-w-4xl mx-auto px-6 md:px-8">
            {!preview && (
                <div className="mb-8">
                    <Link
                        href="/news"
                        className="inline-flex items-center gap-2 text-amber-400 hover:text-white font-semibold text-sm transition duration-200"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to All News & Events
                    </Link>
                </div>
            )}

            <header className="mb-8">
                {article.category && (
                    <div className="inline-block bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-4">
                        {article.category}
                    </div>
                )}
                <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-tight mb-4 break-words">
                    {article.title || "Untitled article"}
                </h1>
                {article.summary && (
                    <p className="text-lg md:text-xl text-white/75 leading-relaxed mb-6">{article.summary}</p>
                )}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-white/70 text-sm border-b border-white/15 pb-6">
                    <span className="inline-flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-amber-400" />
                        <strong className="text-amber-400">{formatNewsDate(article.publishDate) || "—"}</strong>
                    </span>
                    {article.author && (
                        <span className="inline-flex items-center gap-1.5">
                            <User className="w-4 h-4" />
                            <strong className="text-white">{article.author}</strong>
                        </span>
                    )}
                    <span className="inline-flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        {readingTime(article.contentHtml)} min read
                    </span>
                </div>
            </header>

            {article.coverImage && (
                <div className="relative h-[260px] sm:h-[360px] md:h-[480px] w-full rounded-2xl overflow-hidden mb-12 shadow-2xl border border-white/15 bg-black/30">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={article.coverImage} alt={article.title} className="w-full h-full object-cover" />
                </div>
            )}

            <ArticleContent html={article.contentHtml} />

            <div className="mt-16 pt-8 border-t border-white/20 flex flex-col sm:flex-row justify-between items-center gap-6">
                <div className="text-white/70 text-sm">Enjoyed this article? Share it with your fellow students!</div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={share}
                        className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-5 py-3 rounded-lg transition duration-300"
                    >
                        {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                        {copied ? "Link copied!" : "Share"}
                    </button>
                    {!preview && (
                        <Link
                            href="/news"
                            className="bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-3 rounded-lg transition duration-300 shadow-md"
                        >
                            Explore More Articles
                        </Link>
                    )}
                </div>
            </div>

            {children}
        </article>
    );
}
