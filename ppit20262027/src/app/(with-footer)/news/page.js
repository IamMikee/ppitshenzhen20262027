"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Heronews from "../../../../public/News/temporary2.png";
import News from "../../../../public/News/temporary1.png";

export default function NewsPage() {
    const [selectedCategory, setSelectedCategory] = useState("All");

    const categories = ["All", "Culture & Etiquette", "Global News", "Campus & Events", "Workshops"];

    const articles = [
        {
            id: "dos-donts-japan",
            title: "Essential Do's & Don'ts in East Asia: Cultural Etiquette Guide for Students",
            category: "Culture & Etiquette",
            date: "October 28, 2026",
            author: "PPIT Shenzhen Cultural Division",
            summary: "From dining etiquette and public transit manners to managing trash and carrying cash, here is what every student living abroad in Asia needs to know.",
            image: News,
            featured: true,
        },
        {
            id: "global-health-update-2026",
            title: "Global Health & Travel Alert: 2026 Epidemic Preparedness & Advisory",
            category: "Global News",
            date: "October 28, 2026",
            author: "International Student Support",
            summary: "Health officials issue international health protocols and travel safety guidelines as regional disease surveillance expands globally.",
            image: News,
            featured: false,
        },
        {
            id: "shenzhen-cup-2026",
            title: "Shenzhen Cup 2026: Annual Sports & Cultural Championship Kickoff",
            category: "Campus & Events",
            date: "October 14, 2026",
            author: "Sports & Youth Bureau",
            summary: "Get ready for the biggest annual student tournament hosted by PPIT Shenzhen, bringing together talent, sportsmanship, and student camaraderie.",
            image: News,
            featured: false,
        },
        {
            id: "career-talkshow-2026",
            title: "Academic & Career Development Talkshow with Tech Industry Leaders",
            category: "Campus & Events",
            date: "September 28, 2026",
            author: "Academic Relations",
            summary: "An inspiring career development talkshow connecting Indonesian students with tech industry leaders and internship opportunities in Greater Bay Area.",
            image: News,
            featured: false,
        },
        {
            id: "av-engineering-workshop",
            title: "Audiovisual & Stage Engineering Workshop Series Initiated",
            category: "Workshops",
            date: "September 15, 2026",
            author: "Media & Tech Team",
            summary: "Hands-on training session covering digital sound consoles, stage lighting, and multimedia infrastructure for student committee members.",
            image: News,
            featured: false,
        }
    ];

    const featuredArticle = articles.find((a) => a.featured) || articles[0];
    const filteredArticles = selectedCategory === "All" 
        ? articles.filter(a => a.id !== featuredArticle.id)
        : articles.filter(a => a.category === selectedCategory && a.id !== featuredArticle.id);

    return (
        <div className="bg-[#7E0C0E] text-white font-montserrat min-h-screen">
            {/* ========================================== */}
            {/*              HERO SECTION                  */}
            {/* ========================================== */}
            <div className="relative font-montserrat">
                <div className="relative h-[85vh] md:h-[111.5vh] flex flex-col justify-center items-center text-center px-4 overflow-hidden -top-10">
                    {/* Background Images with Hero Overlay */}
                    <Image
                        src={Heronews}
                        alt="News & Events Hero"
                        className="sm:hidden block w-full h-full object-cover absolute inset-0 brightness-10"
                        priority
                        quality={90}
                    />
                    <Image
                        src={Heronews}
                        alt="News & Events Hero"
                        className="lg:block hidden w-full h-full object-cover absolute inset-0 brightness-10"
                        priority
                        quality={100}
                    />
                    <Image
                        src={Heronews}
                        alt="News & Events Hero"
                        className="lg:hidden sm:block hidden w-full h-full object-cover absolute inset-0 brightness-10"
                        quality={75}
                    />

                    {/* Hero Title & Subtitle */}
                    <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
                        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white tracking-tight uppercase drop-shadow-2xl mb-3">
                            News &amp; Events
                        </h1>
                        <div className="w-24 h-1 bg-amber-400 mt-6 rounded-full"></div>
                    </div>

                    {/* Scroll Down Arrow Indicator ("V") */}
                    <div className="absolute inset-x-0 bottom-12 flex flex-col items-center z-10">
                        <p className="text-xl sm:text-2xl md:text-3xl text-amber-400 font-semibold tracking-wide drop-shadow-md">
                            See what's happening!
                        </p>
                        <Link
                            href="#latest-news"
                            className="animate-bounce drop-shadow-lg !smooth-scroll text-white hover:text-amber-400 transition-colors"
                            aria-label="Scroll down to latest news"
                        >
                            <svg
                                width="56"
                                height="100"
                                viewBox="0 0 24 24"
                                fill="none"
                                className="stroke-current"
                            >
                                <path
                                    d="M7 10L12 15L17 10"
                                    strokeWidth="3.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </Link>
                    </div>

                    {/* Red Wave Transition matching Main Page */}
                    <div className="absolute -bottom-1 left-0 w-full h-[120px] pointer-events-none overflow-hidden z-10">
                        <svg
                            viewBox="0 0 1440 320"
                            preserveAspectRatio="none"
                            className="w-full h-full"
                        >
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
            <div id="latest-news" className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 pb-24">
                {/* Background Motif Accent Overlay */}
                <div className="absolute top-0 right-0 h-full w-[120px] sm:w-[230px] bg-[url('/Home/motif_batik_hp.webp')] sm:bg-[url('/Home/motif_batik.webp')] opacity-10 bg-repeat-y pointer-events-none z-0" />
                <div className="absolute top-0 left-0 h-full w-[120px] sm:w-[230px] scale-x-[-1] bg-[url('/Home/motif_batik_hp.webp')] sm:bg-[url('/Home/motif_batik.webp')] opacity-10 bg-repeat-y pointer-events-none z-0" />

                {/* FEATURED / LATEST NEWS BANNER */}
                <div className="mb-16 relative z-10">
                    <h2 className="text-sm font-bold tracking-[0.2em] text-white/70 uppercase mb-4">
                        Latest News / Event
                    </h2>
                    <div className="bg-[#61090A] border border-white/15 rounded-2xl overflow-hidden shadow-2xl grid grid-cols-1 lg:grid-cols-12 group hover:border-amber-400/40 transition duration-300">
                        <div className="lg:col-span-7 relative min-h-[300px] lg:min-h-[420px] bg-black/40 overflow-hidden">
                            <Image
                                src={featuredArticle.image}
                                alt={featuredArticle.title}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-700 opacity-90"
                                priority
                            />
                            <div className="absolute top-4 left-4 bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider backdrop-blur-md">
                                {featuredArticle.category}
                            </div>
                        </div>
                        <div className="lg:col-span-5 p-8 md:p-10 flex flex-col justify-between bg-gradient-to-b from-[#61090A] to-[#4c0708]">
                            <div>
                                <span className="text-amber-400 text-sm font-semibold block mb-2">
                                    {featuredArticle.date}
                                </span>
                                <h3 className="text-2xl md:text-3xl font-bold leading-snug text-white mb-4">
                                    {featuredArticle.title}
                                </h3>
                                <p className="text-white/80 text-sm md:text-base leading-relaxed mb-6">
                                    {featuredArticle.summary}
                                </p>
                            </div>
                            <div>
                                <Link
                                    href={`/news/${featuredArticle.id}`}
                                    className="inline-flex items-center gap-3 bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-3 rounded-lg shadow-lg transition duration-300 hover:scale-105"
                                >
                                    <span>Learn More</span>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CATEGORY FILTER TABS */}
                <div className="relative z-10 flex flex-wrap items-center gap-3 mb-10 pb-4 border-b border-white/10">
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

                {/* ALL NEWS & EVENTS GRID */}
                <div className="relative z-10">
                    <h2 className="text-2xl font-bold uppercase tracking-wider mb-8 text-white flex items-center gap-3">
                        <span>All News &amp; Events</span>
                        <div className="flex-1 h-[1px] bg-white/15"></div>
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredArticles.map((article) => (
                            <div
                                key={article.id}
                                className="bg-[#61090A] border border-white/15 rounded-xl overflow-hidden shadow-xl flex flex-col justify-between hover:border-amber-400/50 hover:shadow-2xl transition duration-300 group"
                            >
                                <div>
                                    <div className="relative h-48 w-full bg-black/40 overflow-hidden">
                                        <Image
                                            src={article.image}
                                            alt={article.title}
                                            fill
                                            className="object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                                        />
                                        <div className="absolute top-3 left-3 bg-red-700/90 text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-md">
                                            {article.category}
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <span className="text-amber-400 text-xs font-semibold block mb-2">
                                            {article.date}
                                        </span>
                                        <h3 className="text-xl font-bold text-white mb-3 line-clamp-2 leading-snug group-hover:text-amber-300 transition duration-200">
                                            {article.title}
                                        </h3>
                                        <p className="text-white/75 text-sm line-clamp-3 leading-relaxed mb-4">
                                            {article.summary}
                                        </p>
                                    </div>
                                </div>
                                <div className="p-6 pt-0 border-t border-white/10 flex justify-end">
                                    <Link
                                        href={`/news/${article.id}`}
                                        className="mt-4 inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition duration-300 hover:shadow-lg hover:shadow-red-900/50"
                                    >
                                        <span>Learn More</span>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                        </svg>
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}