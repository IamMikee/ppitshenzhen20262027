"use client";

import { useEffect, useRef } from "react";

const DEFAULT_MESSAGE = "You have unsaved changes. If you leave now, they will be lost.\n\nLeave without saving?";

/**
 * Warns the user before they lose unsaved changes by:
 *  - closing / reloading the tab           (browser's native "Leave site?" dialog)
 *  - clicking any link on the page         (sidebar, header, back arrow, …)
 *  - pressing the browser Back button
 *
 * Returns `allowNextNavigation()` — call it right before a programmatic
 * navigation (e.g. router.replace after saving) to skip the warning once.
 */
export default function useUnsavedChangesGuard(dirty, message = DEFAULT_MESSAGE) {
    const dirtyRef = useRef(dirty);
    const bypassRef = useRef(false);
    const guardPushedRef = useRef(false);

    useEffect(() => {
        dirtyRef.current = dirty;
    }, [dirty]);

    // 1) tab close / reload / typing a new URL
    useEffect(() => {
        const onBeforeUnload = (e) => {
            if (!dirtyRef.current || bypassRef.current) return;
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", onBeforeUnload);
        return () => window.removeEventListener("beforeunload", onBeforeUnload);
    }, []);

    // 2) clicks on links — capture phase on window runs before Next.js <Link> handles the click
    useEffect(() => {
        const onClick = (e) => {
            if (!dirtyRef.current || bypassRef.current) return;
            if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            const a = e.target.closest?.("a[href]");
            if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
            const href = a.getAttribute("href");
            if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

            if (!window.confirm(message)) {
                e.preventDefault();
                e.stopPropagation();
            } else {
                bypassRef.current = true;
            }
        };
        window.addEventListener("click", onClick, true);
        return () => window.removeEventListener("click", onClick, true);
    }, [message]);

    // 3) browser Back button — keep a duplicate history entry while there are unsaved changes
    useEffect(() => {
        if (!dirty || guardPushedRef.current) return;
        window.history.pushState(window.history.state, "", window.location.href);
        guardPushedRef.current = true;
    }, [dirty]);

    useEffect(() => {
        const onPopState = () => {
            if (!guardPushedRef.current) return;
            if (!dirtyRef.current || bypassRef.current) {
                guardPushedRef.current = false;
                return;
            }
            if (window.confirm(message)) {
                bypassRef.current = true;
                guardPushedRef.current = false;
                window.history.back(); // leave for real
            } else {
                // stay: re-add the guard entry
                window.history.pushState(window.history.state, "", window.location.href);
            }
        };
        window.addEventListener("popstate", onPopState);
        return () => window.removeEventListener("popstate", onPopState);
    }, [message]);

    return function allowNextNavigation() {
        bypassRef.current = true;
    };
}
