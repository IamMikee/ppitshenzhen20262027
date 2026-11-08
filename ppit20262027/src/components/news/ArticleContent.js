"use client";

import { useEffect, useState } from "react";

const ALLOWED_IFRAME_HOSTS = [
    "www.youtube.com",
    "youtube.com",
    "www.youtube-nocookie.com",
    "player.vimeo.com",
    "www.google.com", // google maps embeds
    "maps.google.com",
];

let purifierPromise = null;

function getPurifier() {
    if (!purifierPromise) {
        purifierPromise = import("dompurify").then(({ default: DOMPurify }) => {
            DOMPurify.addHook("uponSanitizeElement", (node, data) => {
                if (data.tagName === "iframe") {
                    try {
                        const url = new URL(node.getAttribute("src") || "", window.location.href);
                        if (url.protocol !== "https:" || !ALLOWED_IFRAME_HOSTS.includes(url.hostname)) {
                            node.parentNode?.removeChild(node);
                        }
                    } catch {
                        node.parentNode?.removeChild(node);
                    }
                }
            });
            DOMPurify.addHook("afterSanitizeAttributes", (node) => {
                if (node.tagName === "A" && node.getAttribute("target") === "_blank") {
                    node.setAttribute("rel", "noopener noreferrer");
                }
            });
            return DOMPurify;
        });
    }
    return purifierPromise;
}

export async function sanitizeArticleHtml(html) {
    const DOMPurify = await getPurifier();
    return DOMPurify.sanitize(html || "", {
        ADD_TAGS: ["iframe"],
        ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "target", "data-align"],
    });
}

/** Renders the article body (sanitized) with the shared .news-content typography. */
export default function ArticleContent({ html, className = "" }) {
    const [clean, setClean] = useState(null);

    useEffect(() => {
        let active = true;
        sanitizeArticleHtml(html).then((out) => active && setClean(out));
        return () => {
            active = false;
        };
    }, [html]);

    if (clean === null) {
        return (
            <div className="space-y-3 animate-pulse">
                <div className="h-4 bg-white/10 rounded w-full" />
                <div className="h-4 bg-white/10 rounded w-11/12" />
                <div className="h-4 bg-white/10 rounded w-4/5" />
            </div>
        );
    }

    return <div className={`news-content ${className}`} dangerouslySetInnerHTML={{ __html: clean }} />;
}
