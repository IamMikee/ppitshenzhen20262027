"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import NewsForm from "@/components/news/NewsForm";
import { getNewsById, toDate } from "@/services/news";

export default function EditArticlePage({ params }) {
    const { id } = use(params);
    const [article, setArticle] = useState(undefined); // undefined = loading, null = not found
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;
        setArticle(undefined);
        getNewsById(id)
            .then((a) => {
                if (!active) return;
                setArticle(a ? { ...a, publishDate: toDate(a.publishDate) || new Date() } : null);
            })
            .catch((err) => active && setError(err.message));
        return () => {
            active = false;
        };
    }, [id]);

    if (error) {
        return <div className="text-red-300 p-6 bg-red-950/40 rounded-xl">Failed to load article: {error}</div>;
    }

    if (article === undefined) {
        return (
            <div className="flex items-center justify-center gap-2 text-gray-400 py-24">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading article…
            </div>
        );
    }

    if (article === null) {
        return (
            <div className="text-center text-white py-24">
                <p className="text-xl mb-4">This article doesn&apos;t exist (it may have been deleted).</p>
                <Link href="/ctrlpanel/news-dashboard" className="text-purple-400 hover:underline">
                    Back to the dashboard
                </Link>
            </div>
        );
    }

    return <NewsForm key={id} articleId={id} initialData={article} />;
}
