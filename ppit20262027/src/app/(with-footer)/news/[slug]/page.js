"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import GuidebookImage from "../../../../../public/Home/fotoguidebook.webp";
import PPITMobile from "../../../../../public/Home/foto_tangga.webp";
import AboutImage from "../../../../../public/Home/3D_Logo.webp";

export default function ArticleDetailPage({ params }) {
    // React.use() unwraps dynamic params in Next.js 15
    const resolvedParams = React.use(params);
    const slug = resolvedParams?.slug || "dos-donts-japan";

    // Article Database Content
    const articlesData = {
        "dos-donts-japan": {
            title: "Do's & Don'ts in East Asia: Cultural Etiquette Guide for Students",
            category: "Culture & Etiquette",
            date: "October 28, 2026",
            author: "PPIT Cultural Division",
            image: GuidebookImage,
            content: [
                {
                    type: "paragraph",
                    text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
                },
                {
                    type: "heading",
                    text: "1. Always Carry Cash & Keep 1,000 Yen/RMB Bills Ready"
                },
                {
                    type: "paragraph",
                    text: "Despite the widespread adoption of digital payments, small local eateries, ticket-order machines, and public transport kiosks frequently require physical currency. Carrying cash—especially smaller notes—prevents awkward moments when automated machines cannot break large bills."
                },
                {
                    type: "heading",
                    text: "2. Carry a Small Trash Bag in Your Backpack"
                },
                {
                    type: "paragraph",
                    text: "Public garbage bins are surprisingly scarce in many urban streets. Residents and tourists are expected to carry their own rubbish home or return convenience store packaging directly to the vendor. Keeping a small plastic bag in your everyday bag makes managing trash effortless."
                },
                {
                    type: "quote",
                    text: "“Small personal efforts keep public spaces clean, punctual, and pleasant for everyone.”"
                },
                {
                    type: "heading",
                    text: "3. Mindfulness in Public Spaces & Public Transit"
                },
                {
                    type: "paragraph",
                    text: "In public transport, keeping phone calls on silent and lowering conversation volumes is deeply appreciated. Avoid standing in the middle of busy pedestrian pathways or escalator passages during rush hours."
                }
            ]
        },
        "global-health-update-2026": {
            title: "Global Health & Travel Alert: 2026 Epidemic Preparedness & Advisory",
            category: "Global News",
            date: "October 28, 2026",
            author: "International Health Taskforce",
            image: PPITMobile,
            content: [
                {
                    type: "paragraph",
                    text: "Top global health authorities have issued updated travel safety guidelines and epidemic advisories for international travelers and students traveling across regional borders."
                },
                {
                    type: "heading",
                    text: "Key Travel Safety Measures"
                },
                {
                    type: "paragraph",
                    text: "Students returning or traveling abroad are advised to monitor official government health channels, undergo routine health screenings, and maintain updated immunization records prior to airport departures."
                },
                {
                    type: "quote",
                    text: "“Early monitoring and prompt health reporting remain essential to international travel safety.”"
                }
            ]
        }
    };

    const currentArticle = articlesData[slug] || articlesData["dos-donts-japan"];

    return (
        <div className="min-h-screen bg-[#7E0C0E] text-white font-montserrat pt-10 pb-24">
            {/* Background Batik Accent */}
            <div className="absolute top-0 right-0 h-full w-[120px] sm:w-[230px] bg-[url('/Home/motif_batik_hp.webp')] sm:bg-[url('/Home/motif_batik.webp')] opacity-10 bg-repeat-y pointer-events-none z-0" />
            <div className="absolute top-0 left-0 h-full w-[120px] sm:w-[230px] scale-x-[-1] bg-[url('/Home/motif_batik_hp.webp')] sm:bg-[url('/Home/motif_batik.webp')] opacity-10 bg-repeat-y pointer-events-none z-0" />

            <article className="relative z-10 max-w-4xl mx-auto px-6 md:px-8">
                {/* Back Link */}
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

                {/* Article Header */}
                <header className="mb-8">
                    <div className="inline-block bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-4">
                        {currentArticle.category}
                    </div>
                    <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-tight mb-4">
                        {currentArticle.title}
                    </h1>
                    <div className="flex flex-wrap items-center gap-4 text-white/70 text-sm border-b border-white/15 pb-6">
                        <span>Published: <strong className="text-amber-400">{currentArticle.date}</strong></span>
                        <span>•</span>
                        <span>By: <strong className="text-white">{currentArticle.author}</strong></span>
                    </div>
                </header>

                {/* Article Main Image */}
                <div className="relative h-[300px] md:h-[480px] w-full rounded-2xl overflow-hidden mb-12 shadow-2xl border border-white/15">
                    <Image
                        src={currentArticle.image}
                        alt={currentArticle.title}
                        fill
                        className="object-cover"
                        priority
                    />
                </div>

                {/* Article Content Body */}
                <div className="space-y-6 text-white/90 text-base md:text-lg leading-relaxed">
                    {currentArticle.content.map((item, idx) => {
                        if (item.type === "heading") {
                            return (
                                <h2 key={idx} className="text-2xl md:text-3xl font-bold text-white mt-10 mb-4 border-l-4 border-amber-400 pl-4">
                                    {item.text}
                                </h2>
                            );
                        }
                        if (item.type === "quote") {
                            return (
                                <blockquote key={idx} className="my-8 p-6 bg-[#61090A] border-l-4 border-red-500 rounded-r-xl italic text-amber-300 font-medium text-lg md:text-xl shadow-lg">
                                    {item.text}
                                </blockquote>
                            );
                        }
                        return (
                            <p key={idx} className="text-white/85">
                                {item.text}
                            </p>
                        );
                    })}
                </div>

                {/* Article Share & Navigation Footer */}
                <div className="mt-16 pt-8 border-t border-white/20 flex flex-col sm:flex-row justify-between items-center gap-6">
                    <div className="text-white/70 text-sm">
                        Enjoyed this article? Share it with your fellow students!
                    </div>
                    <div className="flex items-center gap-4">
                        <Link
                            href="/news"
                            className="bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-3 rounded-lg transition duration-300 shadow-md"
                        >
                            Explore More Articles
                        </Link>
                    </div>
                </div>
            </article>
        </div>
    );
}