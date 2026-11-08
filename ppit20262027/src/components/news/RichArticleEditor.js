"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
    Bold, Italic, Underline, Strikethrough, Superscript, Subscript,
    AlignLeft, AlignCenter, AlignRight, AlignJustify,
    List, ListOrdered, IndentIncrease, IndentDecrease,
    Link, Unlink, ImagePlus, Video, Table, Minus, RemoveFormatting,
    Undo2, Redo2, CodeXml, Maximize2, Minimize2, Highlighter, Baseline,
    Quote, Trash2, Loader2, X, Wand2, ArrowUpToLine, ArrowDownToLine, ArrowLeftToLine,
    ArrowRightToLine, PaintBucket, Columns3, Rows3, Heading,
} from "lucide-react";
import { uploadNewsImage, htmlToText } from "@/services/news";
import ImageEditorModal from "./ImageEditorModal";
import { applyImageStyle, readImageState } from "./imageEditing";

// ------------------------------------------------------------------
// Toolbar options
// ------------------------------------------------------------------
const BLOCK_FORMATS = [
    { label: "Paragraph", value: "P" },
    { label: "Heading 1", value: "H1" },
    { label: "Heading 2", value: "H2" },
    { label: "Heading 3", value: "H3" },
    { label: "Heading 4", value: "H4" },
    { label: "Quote", value: "BLOCKQUOTE" },
    { label: "Code block", value: "PRE" },
];

const FONT_FAMILIES = [
    { label: "Default", value: "" },
    { label: "Montserrat", value: "Montserrat, sans-serif" },
    { label: "Poppins", value: "Poppins, sans-serif" },
    { label: "Open Sans", value: "'Open Sans', sans-serif" },
    { label: "Cinzel", value: "Cinzel, serif" },
    { label: "Georgia", value: "Georgia, serif" },
    { label: "Times New Roman", value: "'Times New Roman', serif" },
    { label: "Arial", value: "Arial, sans-serif" },
    { label: "Verdana", value: "Verdana, sans-serif" },
    { label: "Courier New", value: "'Courier New', monospace" },
];

const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px", "40px", "48px", "64px"];

const LINE_HEIGHTS = ["1", "1.25", "1.5", "1.8", "2", "2.5"];

const COLOR_SWATCHES = [
    "#ffffff", "#e5e7eb", "#9ca3af", "#000000",
    "#fbbf24", "#f59e0b", "#fcd34d", "#fef3c7",
    "#ef4444", "#dc2626", "#7E0C0E", "#f97316",
    "#22c55e", "#3b82f6", "#a855f7", "#ec4899",
];

const MARKER = "__ppit_marker__";

// ------------------------------------------------------------------
// Small reusable pieces
// ------------------------------------------------------------------
function ToolButton({ onClick, title, active, disabled, children }) {
    return (
        <button
            type="button"
            title={title}
            aria-label={title}
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()} // keep the editor selection
            onClick={onClick}
            className={`p-1.5 rounded-md transition-colors disabled:opacity-40 ${
                active ? "bg-purple-600 text-white" : "text-gray-300 hover:bg-gray-700 hover:text-white"
            }`}
        >
            {children}
        </button>
    );
}

const Divider = () => <div className="w-px h-6 bg-gray-600 mx-1" />;

function ColorPicker({ icon: Icon, title, onPick, onOpen }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        if (!open) return;
        const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, [open]);

    return (
        <div className="relative" ref={ref}>
            <ToolButton
                title={title}
                onClick={() => {
                    onOpen?.();
                    setOpen((o) => !o);
                }}
            >
                <Icon className="w-4 h-4" />
            </ToolButton>
            {open && (
                <div className="absolute z-40 top-9 left-0 bg-[#1e1e1e] border border-gray-600 rounded-lg p-3 shadow-2xl w-[188px]">
                    <div className="grid grid-cols-4 gap-2 mb-3">
                        {COLOR_SWATCHES.map((c) => (
                            <button
                                key={c}
                                type="button"
                                title={c}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                    onPick(c);
                                    setOpen(false);
                                }}
                                className="w-9 h-7 rounded border border-gray-500 hover:scale-110 transition"
                                style={{ background: c }}
                            />
                        ))}
                    </div>
                    <label className="flex items-center justify-between text-xs text-gray-300 gap-2">
                        Custom
                        <input
                            type="color"
                            className="w-10 h-7 bg-transparent cursor-pointer"
                            onChange={(e) => onPick(e.target.value)}
                        />
                    </label>
                    <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                            onPick(null);
                            setOpen(false);
                        }}
                        className="mt-2 w-full text-xs text-gray-400 hover:text-white py-1 rounded hover:bg-gray-700"
                    >
                        Reset color
                    </button>
                </div>
            )}
        </div>
    );
}

/** Minimal modal used instead of window.prompt */
function PromptDialog({ dialog, onClose }) {
    const [values, setValues] = useState({});

    useEffect(() => {
        if (dialog) {
            const init = {};
            dialog.fields.forEach((f) => (init[f.name] = f.defaultValue ?? ""));
            setValues(init);
        }
    }, [dialog]);

    if (!dialog) return null;

    const submit = (e) => {
        e.preventDefault();
        dialog.resolve(values);
        onClose();
    };
    const cancel = () => {
        dialog.resolve(null);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4" onMouseDown={cancel}>
            <form
                onSubmit={submit}
                onMouseDown={(e) => e.stopPropagation()}
                className="bg-[#1f1f1f] border border-gray-700 rounded-xl p-6 w-full max-w-md shadow-2xl text-white"
            >
                <h3 className="text-lg font-semibold mb-4">{dialog.title}</h3>
                <div className="space-y-3">
                    {dialog.fields.map((f, i) => (
                        <label key={f.name} className="block">
                            {f.type === "checkbox" ? (
                                <span className="flex items-center gap-2 text-sm text-gray-300">
                                    <input
                                        type="checkbox"
                                        checked={!!values[f.name]}
                                        onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.checked }))}
                                        className="accent-purple-600"
                                    />
                                    {f.label}
                                </span>
                            ) : (
                                <>
                                    <span className="text-sm text-gray-400">{f.label}</span>
                                    <input
                                        autoFocus={i === 0}
                                        type={f.type || "text"}
                                        value={values[f.name] ?? ""}
                                        placeholder={f.placeholder}
                                        min={f.min}
                                        max={f.max}
                                        onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                                        className="mt-1 w-full bg-[#2a2a2a] border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                                    />
                                </>
                            )}
                        </label>
                    ))}
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <button type="button" onClick={cancel} className="px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-700">
                        Cancel
                    </button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 font-semibold">
                        {dialog.submitLabel || "Insert"}
                    </button>
                </div>
            </form>
        </div>
    );
}

function toEmbedUrl(raw) {
    try {
        const url = new URL(raw.trim());
        const host = url.hostname.replace(/^www\./, "");
        if (host === "youtu.be") return `https://www.youtube.com/embed/${url.pathname.slice(1)}`;
        if (host.endsWith("youtube.com")) {
            if (url.pathname.startsWith("/embed/")) return `https://www.youtube.com${url.pathname}`;
            if (url.pathname.startsWith("/shorts/")) return `https://www.youtube.com/embed/${url.pathname.split("/")[2]}`;
            const v = url.searchParams.get("v");
            if (v) return `https://www.youtube.com/embed/${v}`;
        }
        if (host === "vimeo.com") return `https://player.vimeo.com/video/${url.pathname.split("/").filter(Boolean)[0]}`;
        if (host === "player.vimeo.com") return url.href;
        if (host.endsWith("google.com") && url.pathname.includes("/maps/embed")) return url.href;
    } catch {
        /* invalid url */
    }
    return null;
}

const escapeAttr = (s = "") => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

// ------------------------------------------------------------------
// Table helpers
// ------------------------------------------------------------------
const colCount = (table) => Math.max(0, ...[...table.rows].map((r) => r.cells.length));

/** Rebuilds <colgroup> with equal widths (or the given widths in %). */
function resetColgroup(table, widths = null) {
    const n = colCount(table);
    table.querySelector(":scope > colgroup")?.remove();
    const cg = document.createElement("colgroup");
    for (let i = 0; i < n; i++) {
        const col = document.createElement("col");
        col.style.width = `${(widths ? widths[i] : 100 / n).toFixed(2)}%`;
        cg.appendChild(col);
    }
    table.insertBefore(cg, table.firstChild);
    table.style.tableLayout = "fixed";
    return cg;
}

/** Makes sure the table has a <colgroup> that matches its columns (measures current widths). */
function ensureColgroup(table) {
    const n = colCount(table);
    const cg = table.querySelector(":scope > colgroup");
    if (cg && cg.children.length === n) return cg;
    const firstRow = [...table.rows].find((r) => r.cells.length === n);
    const total = table.offsetWidth || 1;
    const widths = firstRow ? [...firstRow.cells].map((c) => (c.offsetWidth / total) * 100) : null;
    return resetColgroup(table, widths);
}

function convertCell(cell, tag) {
    if (cell.tagName === tag.toUpperCase()) return cell;
    const n = document.createElement(tag);
    n.innerHTML = cell.innerHTML;
    if (cell.getAttribute("style")) n.setAttribute("style", cell.getAttribute("style"));
    cell.replaceWith(n);
    return n;
}

const newCell = (tag = "td") => {
    const c = document.createElement(tag);
    c.innerHTML = "<br>";
    return c;
};

// ------------------------------------------------------------------
// Editor
// ------------------------------------------------------------------
export default function RichArticleEditor({ initialValue = "", onChange, placeholder = "Start writing your article…" }) {
    const editorRef = useRef(null);
    const savedRange = useRef(null);
    const [sourceMode, setSourceMode] = useState(false);
    const [sourceHtml, setSourceHtml] = useState("");
    const [fullscreen, setFullscreen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [dialog, setDialog] = useState(null);
    const [selectedImg, setSelectedImg] = useState(null);
    const [imgSettings, setImgSettings] = useState({ width: 100, align: "center", alt: "" });
    const [active, setActive] = useState({});
    const [blockFormat, setBlockFormat] = useState("P");
    const [stats, setStats] = useState({ words: 0, chars: 0 });
    const [isEmpty, setIsEmpty] = useState(true);
    const [imageEditor, setImageEditor] = useState(null); // { img, originalSrc, edits, style }
    const [activeCell, setActiveCell] = useState(null);
    const [tableWidth, setTableWidth] = useState(100);
    const [dragInfo, setDragInfo] = useState(null); // live size label while resizing a table
    const tableHover = useRef(null); // { type: "col"|"row", ... } when the mouse is on a table border
    const tableDragging = useRef(false);

    // --- init content once ---
    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.innerHTML = initialValue || "";
            refreshStats();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const refreshStats = () => {
        const el = editorRef.current;
        if (!el) return;
        const text = htmlToText(el.innerHTML);
        setStats({ words: text ? text.split(/\s+/).length : 0, chars: text.length });
        setIsEmpty(!text && !el.querySelector("img,iframe,table,hr"));
    };

    const emit = useCallback(() => {
        const el = editorRef.current;
        if (!el) return;
        // strip transient selection styling before emitting
        const clone = el.cloneNode(true);
        clone.querySelectorAll("img[data-selected]").forEach((img) => img.removeAttribute("data-selected"));
        clone.querySelectorAll("[data-active-cell]").forEach((c) => c.removeAttribute("data-active-cell"));
        onChange?.(clone.innerHTML);
        refreshStats();
    }, [onChange]);

    // --- selection tracking (so toolbar dropdowns don't lose the selection) ---
    useEffect(() => {
        const onSelChange = () => {
            const sel = window.getSelection();
            if (!sel || sel.rangeCount === 0 || !editorRef.current) return;
            const range = sel.getRangeAt(0);
            if (!editorRef.current.contains(range.commonAncestorContainer)) return;
            savedRange.current = range.cloneRange();
            const startNode = range.startContainer.nodeType === 3 ? range.startContainer.parentNode : range.startContainer;
            const cell = startNode?.closest?.("td, th");
            setActiveCell(cell && editorRef.current.contains(cell) ? cell : null);
            try {
                setActive({
                    bold: document.queryCommandState("bold"),
                    italic: document.queryCommandState("italic"),
                    underline: document.queryCommandState("underline"),
                    strikeThrough: document.queryCommandState("strikeThrough"),
                    superscript: document.queryCommandState("superscript"),
                    subscript: document.queryCommandState("subscript"),
                    insertUnorderedList: document.queryCommandState("insertUnorderedList"),
                    insertOrderedList: document.queryCommandState("insertOrderedList"),
                    justifyLeft: document.queryCommandState("justifyLeft"),
                    justifyCenter: document.queryCommandState("justifyCenter"),
                    justifyRight: document.queryCommandState("justifyRight"),
                    justifyFull: document.queryCommandState("justifyFull"),
                });
                const block = (document.queryCommandValue("formatBlock") || "p").toUpperCase();
                setBlockFormat(BLOCK_FORMATS.some((b) => b.value === block) ? block : "P");
            } catch {
                /* ignore */
            }
        };
        document.addEventListener("selectionchange", onSelChange);
        return () => document.removeEventListener("selectionchange", onSelChange);
    }, []);

    const restoreSelection = () => {
        const el = editorRef.current;
        if (!el) return;
        el.focus();
        if (savedRange.current) {
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(savedRange.current);
        }
    };

    const exec = (command, value = null, { css = true } = {}) => {
        if (command === "formatBlock" && value && !value.startsWith("<")) value = `<${value}>`;
        restoreSelection();
        document.execCommand("styleWithCSS", false, css);
        document.execCommand(command, false, value);
        emit();
    };

    /** Wrap the current selection in <span style="prop: value"> */
    const applyInlineStyle = (prop, value) => {
        restoreSelection();
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) return;
        document.execCommand("styleWithCSS", false, false);
        document.execCommand("fontName", false, MARKER);
        const el = editorRef.current;
        el.querySelectorAll(`font[face="${MARKER}"]`).forEach((font) => {
            const span = document.createElement("span");
            span.style[prop] = value;
            while (font.firstChild) span.appendChild(font.firstChild);
            font.replaceWith(span);
        });
        // Chrome sometimes produces spans instead of <font>
        el.querySelectorAll("span").forEach((span) => {
            if (span.style.fontFamily && span.style.fontFamily.includes(MARKER)) {
                span.style.fontFamily = "";
                span.style[prop] = value;
            }
        });
        emit();
    };

    /** Apply a style to the block elements touched by the selection (e.g. line-height) */
    const applyBlockStyle = (prop, value) => {
        restoreSelection();
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        const range = sel.getRangeAt(0);
        const el = editorRef.current;
        const blocks = new Set();
        const blockOf = (node) => {
            let n = node.nodeType === 3 ? node.parentNode : node;
            while (n && n !== el && !/^(P|H[1-6]|LI|BLOCKQUOTE|PRE|DIV)$/.test(n.nodeName)) n = n.parentNode;
            return n && n !== el ? n : null;
        };
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
            if (range.intersectsNode(walker.currentNode)) {
                const b = blockOf(walker.currentNode);
                if (b) blocks.add(b);
            }
        }
        if (blocks.size === 0) {
            document.execCommand("formatBlock", false, "<P>");
            const b = blockOf(sel.anchorNode);
            if (b) blocks.add(b);
        }
        blocks.forEach((b) => (b.style[prop] = value));
        emit();
    };

    const ask = (config) => new Promise((resolve) => setDialog({ ...config, resolve }));

    // --- toolbar actions ---
    const insertLink = async () => {
        const sel = window.getSelection();
        const text = sel && !sel.isCollapsed ? sel.toString() : "";
        const res = await ask({
            title: "Insert link",
            fields: [
                { name: "url", label: "URL", placeholder: "https://…" },
                ...(text ? [] : [{ name: "text", label: "Text to display", placeholder: "Link text" }]),
                { name: "newTab", label: "Open in new tab", type: "checkbox", defaultValue: true },
            ],
        });
        if (!res?.url) return;
        let url = res.url.trim();
        if (!/^(https?:|mailto:|tel:|\/|#)/i.test(url)) url = `https://${url}`;
        const target = res.newTab ? ' target="_blank" rel="noopener noreferrer"' : "";
        restoreSelection();
        if (text) {
            document.execCommand("createLink", false, url);
            if (res.newTab) {
                editorRef.current.querySelectorAll(`a[href="${CSS.escape(url)}"]`).forEach((a) => {
                    a.target = "_blank";
                    a.rel = "noopener noreferrer";
                });
            }
        } else {
            document.execCommand(
                "insertHTML",
                false,
                `<a href="${escapeAttr(url)}"${target}>${escapeAttr(res.text || url)}</a>&nbsp;`
            );
        }
        emit();
    };

    const insertImageHtml = (src, alt = "") => {
        restoreSelection();
        document.execCommand(
            "insertHTML",
            false,
            `<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" data-align="center" style="width: 100%;" /><p><br></p>`
        );
        emit();
    };

    const uploadImage = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setUploading(true);
            try {
                const url = await uploadNewsImage(file);
                insertImageHtml(url, file.name.replace(/\.[^.]+$/, ""));
            } catch (err) {
                alert(`Image upload failed: ${err.message}`);
            } finally {
                setUploading(false);
            }
        };
        input.click();
    };

    const imageFromUrl = async () => {
        const res = await ask({
            title: "Insert image from URL",
            fields: [
                { name: "url", label: "Image URL", placeholder: "https://…/image.jpg" },
                { name: "alt", label: "Alt text (description)", placeholder: "Optional" },
            ],
        });
        if (res?.url) insertImageHtml(res.url.trim(), res.alt || "");
    };

    const insertVideo = async () => {
        const res = await ask({
            title: "Embed video / map",
            fields: [{ name: "url", label: "YouTube, Vimeo, or Google Maps embed URL", placeholder: "https://youtube.com/watch?v=…" }],
            submitLabel: "Embed",
        });
        if (!res?.url) return;
        const src = toEmbedUrl(res.url);
        if (!src) return alert("Unsupported link. Use a YouTube, Vimeo, or Google Maps embed URL.");
        restoreSelection();
        document.execCommand(
            "insertHTML",
            false,
            `<iframe src="${escapeAttr(src)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe><p><br></p>`
        );
        emit();
    };

    const insertTable = async () => {
        const res = await ask({
            title: "Insert table",
            fields: [
                { name: "rows", label: "Rows (excluding header)", type: "number", defaultValue: "3", min: 1, max: 30 },
                { name: "cols", label: "Columns", type: "number", defaultValue: "3", min: 1, max: 10 },
                { name: "header", label: "Include header row", type: "checkbox", defaultValue: true },
            ],
        });
        if (!res) return;
        const rows = Math.min(30, Math.max(1, parseInt(res.rows) || 3));
        const cols = Math.min(10, Math.max(1, parseInt(res.cols) || 3));
        const colW = (100 / cols).toFixed(2);
        let html = `<table style="width: 100%; table-layout: fixed;"><colgroup>${`<col style="width: ${colW}%">`.repeat(cols)}</colgroup>`;
        if (res.header) html += `<thead><tr>${Array.from({ length: cols }, (_, i) => `<th>Header ${i + 1}</th>`).join("")}</tr></thead>`;
        html += "<tbody>";
        for (let r = 0; r < rows; r++) html += `<tr>${"<td><br></td>".repeat(cols)}</tr>`;
        html += "</tbody></table><p><br></p>";
        restoreSelection();
        document.execCommand("insertHTML", false, html);
        emit();
    };

    const clearFormatting = () => {
        exec("removeFormat");
        exec("unlink");
        exec("formatBlock", "P");
    };

    // --- image selection & settings ---
    const selectImage = (img) => {
        editorRef.current?.querySelectorAll("img[data-selected]").forEach((i) => i.removeAttribute("data-selected"));
        if (!img) {
            setSelectedImg(null);
            return;
        }
        img.setAttribute("data-selected", "true");
        setSelectedImg(img);
        setImgSettings({
            width: parseInt(img.style.width) || 100,
            align: img.getAttribute("data-align") || "center",
            alt: img.getAttribute("alt") || "",
        });
    };

    const updateImage = (patch) => {
        if (!selectedImg) return;
        const next = { ...imgSettings, ...patch };
        setImgSettings(next);
        selectedImg.style.width = `${next.width}%`;
        selectedImg.style.height = "auto";
        selectedImg.setAttribute("data-align", next.align);
        selectedImg.setAttribute("alt", next.alt);
        emit();
    };

    const removeImage = () => {
        selectedImg?.remove();
        setSelectedImg(null);
        emit();
    };

    // --- full image editor (crop / filters / style) ---
    const openImageEditor = (img = selectedImg) => {
        if (!img) return;
        setImageEditor({ img, ...readImageState(img) });
    };

    const applyImageEdit = async ({ edits, style, identity, editsChanged, render }) => {
        const { img, originalSrc } = imageEditor;
        if (identity) {
            img.setAttribute("src", originalSrc);
            img.removeAttribute("data-original-src");
        } else if (editsChanged || !img.getAttribute("data-original-src")) {
            const blob = await render();
            const url = await uploadNewsImage(blob);
            img.setAttribute("src", url);
            img.setAttribute("data-original-src", originalSrc);
        }
        const { radius, borderWidth, borderColor, shadow, opacity, width } = style;
        img.setAttribute(
            "data-edits",
            JSON.stringify({ edits: identity ? null : edits, style: { radius, borderWidth, borderColor, shadow, opacity, width } })
        );
        applyImageStyle(img, style);
        setImageEditor(null);
        emit();
        selectImage(img);
    };

    // --- active table cell highlight ---
    useEffect(() => {
        const el = editorRef.current;
        el?.querySelectorAll("[data-active-cell]").forEach((c) => c.removeAttribute("data-active-cell"));
        if (activeCell && el?.contains(activeCell)) {
            activeCell.setAttribute("data-active-cell", "true");
            const t = activeCell.closest("table");
            setTableWidth(parseFloat(t?.style.width) || 100);
        }
    }, [activeCell]);

    const activeTable = activeCell?.closest("table") || null;

    const tableOp = (fn) => {
        if (!activeCell || !editorRef.current.contains(activeCell)) return;
        const table = activeCell.closest("table");
        const next = fn(table, activeCell);
        setActiveCell(next && editorRef.current.contains(next) ? next : null);
        emit();
    };

    const insertRow = (after) =>
        tableOp((table, cell) => {
            const row = cell.parentElement;
            const tr = document.createElement("tr");
            for (let i = 0; i < colCount(table); i++) tr.appendChild(newCell("td"));
            if (row.parentElement.tagName === "THEAD") {
                const body = table.tBodies[0] || table.appendChild(document.createElement("tbody"));
                body.insertBefore(tr, body.firstChild);
            } else {
                row.parentElement.insertBefore(tr, after ? row.nextSibling : row);
            }
            return tr.cells[Math.min(cell.cellIndex, tr.cells.length - 1)];
        });

    const insertCol = (after) =>
        tableOp((table, cell) => {
            const idx = cell.cellIndex;
            [...table.rows].forEach((row) => {
                const ref = row.cells[idx];
                const c = newCell(row.parentElement.tagName === "THEAD" ? "th" : "td");
                row.insertBefore(c, ref ? (after ? ref.nextSibling : ref) : null);
            });
            resetColgroup(table);
            return cell;
        });

    const deleteRow = () =>
        tableOp((table, cell) => {
            if (table.rows.length <= 1) {
                table.remove();
                return null;
            }
            const row = cell.parentElement;
            const section = row.parentElement;
            const rowIdx = row.rowIndex;
            row.remove();
            if (!section.rows.length) section.remove();
            const target = table.rows[Math.min(rowIdx, table.rows.length - 1)];
            return target?.cells[Math.min(cell.cellIndex, target.cells.length - 1)] || null;
        });

    const deleteCol = () =>
        tableOp((table, cell) => {
            const idx = cell.cellIndex;
            if (colCount(table) <= 1) {
                table.remove();
                return null;
            }
            const row = cell.parentElement;
            [...table.rows].forEach((r) => r.cells[idx]?.remove());
            resetColgroup(table);
            return row.cells[Math.min(idx, row.cells.length - 1)] || null;
        });

    const toggleHeaderRow = () =>
        tableOp((table, cell) => {
            const rowIdx = cell.parentElement.rowIndex;
            const colIdx = cell.cellIndex;
            if (table.tHead) {
                const body = table.tBodies[0] || table.appendChild(document.createElement("tbody"));
                [...table.tHead.rows].reverse().forEach((r) => {
                    [...r.cells].forEach((c) => convertCell(c, "td"));
                    body.insertBefore(r, body.firstChild);
                });
                table.tHead.remove();
            } else {
                const first = table.rows[0];
                if (!first) return cell;
                const thead = table.createTHead();
                [...first.cells].forEach((c) => convertCell(c, "th"));
                thead.appendChild(first);
            }
            return table.rows[rowIdx]?.cells[colIdx] || null;
        });

    const setCellColor = (color) =>
        tableOp((table, cell) => {
            cell.style.backgroundColor = color || "";
            return cell;
        });

    const equalizeColumns = () =>
        tableOp((table, cell) => {
            resetColgroup(table);
            [...table.rows].forEach((r) => (r.style.height = ""));
            return cell;
        });

    const changeTableWidth = (v) => {
        if (!activeTable) return;
        setTableWidth(v);
        activeTable.style.width = `${v}%`;
        activeTable.style.marginLeft = v < 100 ? "auto" : "";
        activeTable.style.marginRight = v < 100 ? "auto" : "";
        emit();
    };

    const deleteTable = () =>
        tableOp((table) => {
            table.remove();
            return null;
        });

    // --- drag table borders to resize (real time) ---
    const EDGE = 5;
    const handleEditorMouseMove = (e) => {
        if (tableDragging.current || sourceMode) return;
        const el = editorRef.current;
        const cell = e.target.closest?.("td, th");
        let hover = null;
        if (cell && el.contains(cell)) {
            const r = cell.getBoundingClientRect();
            const table = cell.closest("table");
            const row = cell.parentElement;
            if (r.right - e.clientX <= EDGE) hover = { type: "col", table, index: cell.cellIndex };
            else if (e.clientX - r.left <= EDGE && cell.cellIndex > 0) hover = { type: "col", table, index: cell.cellIndex - 1 };
            else if (r.bottom - e.clientY <= EDGE) hover = { type: "row", table, row };
            else if (e.clientY - r.top <= EDGE && row.rowIndex > 0) hover = { type: "row", table, row: table.rows[row.rowIndex - 1] };
        }
        tableHover.current = hover;
        el.style.cursor = hover ? (hover.type === "col" ? "col-resize" : "row-resize") : "";
    };

    const handleEditorMouseDown = (e) => {
        const hover = tableHover.current;
        if (!hover || e.button !== 0) return;
        e.preventDefault();
        tableDragging.current = true;
        document.body.style.cursor = hover.type === "col" ? "col-resize" : "row-resize";
        document.body.style.userSelect = "none";
        const startX = e.clientX;
        const startY = e.clientY;
        const { table } = hover;
        let onMove;

        if (hover.type === "row") {
            const startH = hover.row.offsetHeight;
            onMove = (ev) => {
                const h = Math.max(28, Math.round(startH + ev.clientY - startY));
                hover.row.style.height = `${h}px`;
                setDragInfo({ x: ev.clientX, y: ev.clientY, text: `Row height: ${h}px` });
            };
        } else {
            const cg = ensureColgroup(table);
            const cols = [...cg.children];
            const widths = cols.map((c) => parseFloat(c.style.width) || 100 / cols.length);
            const i = hover.index;
            const tablePx = table.offsetWidth || 1;
            if (i < cols.length - 1) {
                // move the border between column i and i+1
                const pair = widths[i] + widths[i + 1];
                onMove = (ev) => {
                    const delta = ((ev.clientX - startX) / tablePx) * 100;
                    const a = Math.min(pair - 5, Math.max(5, widths[i] + delta));
                    cols[i].style.width = `${a.toFixed(2)}%`;
                    cols[i + 1].style.width = `${(pair - a).toFixed(2)}%`;
                    setDragInfo({ x: ev.clientX, y: ev.clientY, text: `${Math.round(a)}% | ${Math.round(pair - a)}%` });
                };
            } else {
                // last column's right edge → resize the whole table
                const startPct = parseFloat(table.style.width) || 100;
                const parentPx = tablePx / (startPct / 100);
                onMove = (ev) => {
                    const pct = Math.min(100, Math.max(20, startPct + ((ev.clientX - startX) / parentPx) * 100));
                    table.style.width = `${pct.toFixed(1)}%`;
                    table.style.marginLeft = pct < 100 ? "auto" : "";
                    table.style.marginRight = pct < 100 ? "auto" : "";
                    setTableWidth(Math.round(pct));
                    setDragInfo({ x: ev.clientX, y: ev.clientY, text: `Table width: ${Math.round(pct)}%` });
                };
            }
        }

        const onUp = () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
            tableDragging.current = false;
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
            setDragInfo(null);
            emit();
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    };

    const handleEditorClick = (e) => {
        if (e.target.tagName === "IMG") selectImage(e.target);
        else if (selectedImg) selectImage(null);
    };

    const handleEditorDoubleClick = (e) => {
        if (e.target.tagName === "IMG") {
            selectImage(e.target);
            openImageEditor(e.target);
        }
    };

    const handleKeyDown = (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
            e.preventDefault();
            insertLink();
        }
        if (selectedImg && (e.key === "Delete" || e.key === "Backspace")) {
            e.preventDefault();
            removeImage();
        }
        // Tab inside lists = indent
        if (e.key === "Tab" && (active.insertUnorderedList || active.insertOrderedList)) {
            e.preventDefault();
            exec(e.shiftKey ? "outdent" : "indent");
        }
    };

    // Strip messy styles (e.g. from Word / Google Docs) on paste, keep basic structure
    const handlePaste = (e) => {
        const html = e.clipboardData.getData("text/html");
        if (!html) return; // plain text: default behaviour is fine
        e.preventDefault();
        const tmp = document.createElement("div");
        tmp.innerHTML = html;
        tmp.querySelectorAll("script,style,meta,link,title,o\\:p").forEach((n) => n.remove());
        tmp.querySelectorAll("*").forEach((n) => {
            n.removeAttribute("class");
            n.removeAttribute("id");
            n.removeAttribute("style");
            [...n.attributes].forEach((a) => a.name.startsWith("on") && n.removeAttribute(a.name));
        });
        document.execCommand("insertHTML", false, tmp.innerHTML);
        emit();
    };

    // --- source mode ---
    const toggleSource = () => {
        if (!sourceMode) {
            selectImage(null);
            setSourceHtml(editorRef.current.innerHTML);
            setSourceMode(true);
        } else {
            editorRef.current.innerHTML = sourceHtml;
            setSourceMode(false);
            emit();
        }
    };

    // Esc exits fullscreen
    useEffect(() => {
        if (!fullscreen) return;
        const onKey = (e) => e.key === "Escape" && !dialog && setFullscreen(false);
        document.addEventListener("keydown", onKey);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = "";
        };
    }, [fullscreen, dialog]);

    const selectClass =
        "bg-[#2a2a2a] border border-gray-600 text-gray-200 text-sm rounded-md px-2 py-1 focus:outline-none focus:border-purple-500";

    return (
        <div
            className={`border border-gray-700 rounded-xl bg-[#1e1e1e] ${
                fullscreen ? "fixed inset-0 z-[60] rounded-none flex flex-col overflow-hidden" : "relative"
            }`}
        >
            {/* ---------------- TOOLBAR ---------------- */}
            <div
                className={`flex flex-wrap items-center gap-1 p-2 border-b border-gray-700 bg-[#1e1e1e] rounded-t-xl ${
                    fullscreen ? "" : "sticky top-[78px] z-30"
                }`}
            >
                <select
                    title="Text style"
                    value={blockFormat}
                    disabled={sourceMode}
                    onChange={(e) => exec("formatBlock", e.target.value)}
                    className={selectClass}
                >
                    {BLOCK_FORMATS.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                </select>
                <select
                    title="Font"
                    defaultValue=""
                    disabled={sourceMode}
                    onChange={(e) => {
                        if (e.target.value) applyInlineStyle("fontFamily", e.target.value);
                        else exec("removeFormat");
                        e.target.value = "";
                    }}
                    className={`${selectClass} w-[118px]`}
                >
                    <option value="" disabled hidden>Font</option>
                    {FONT_FAMILIES.map((f) => (
                        <option key={f.label} value={f.value} style={{ fontFamily: f.value || undefined }}>{f.label}</option>
                    ))}
                </select>
                <select
                    title="Font size"
                    defaultValue=""
                    disabled={sourceMode}
                    onChange={(e) => {
                        if (e.target.value) applyInlineStyle("fontSize", e.target.value);
                        e.target.value = "";
                    }}
                    className={`${selectClass} w-[78px]`}
                >
                    <option value="" disabled hidden>Size</option>
                    {FONT_SIZES.map((s) => (
                        <option key={s} value={s}>{s.replace("px", "")}</option>
                    ))}
                </select>
                <select
                    title="Line spacing"
                    defaultValue=""
                    disabled={sourceMode}
                    onChange={(e) => {
                        if (e.target.value) applyBlockStyle("lineHeight", e.target.value);
                        e.target.value = "";
                    }}
                    className={`${selectClass} w-[92px]`}
                >
                    <option value="" disabled hidden>Spacing</option>
                    {LINE_HEIGHTS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>

                <Divider />

                <ToolButton title="Bold (Ctrl+B)" active={active.bold} disabled={sourceMode} onClick={() => exec("bold")}>
                    <Bold className="w-4 h-4" />
                </ToolButton>
                <ToolButton title="Italic (Ctrl+I)" active={active.italic} disabled={sourceMode} onClick={() => exec("italic")}>
                    <Italic className="w-4 h-4" />
                </ToolButton>
                <ToolButton title="Underline (Ctrl+U)" active={active.underline} disabled={sourceMode} onClick={() => exec("underline")}>
                    <Underline className="w-4 h-4" />
                </ToolButton>
                <ToolButton title="Strikethrough" active={active.strikeThrough} disabled={sourceMode} onClick={() => exec("strikeThrough")}>
                    <Strikethrough className="w-4 h-4" />
                </ToolButton>
                <ToolButton title="Superscript" active={active.superscript} disabled={sourceMode} onClick={() => exec("superscript")}>
                    <Superscript className="w-4 h-4" />
                </ToolButton>
                <ToolButton title="Subscript" active={active.subscript} disabled={sourceMode} onClick={() => exec("subscript")}>
                    <Subscript className="w-4 h-4" />
                </ToolButton>

                <Divider />

                <ColorPicker
                    icon={Baseline}
                    title="Text color"
                    onPick={(c) => (c ? exec("foreColor", c) : exec("foreColor", "rgba(255,255,255,0.88)"))}
                />
                <ColorPicker
                    icon={Highlighter}
                    title="Highlight color"
                    onPick={(c) => exec("hiliteColor", c || "transparent")}
                />

                <Divider />

                <ToolButton title="Align left" active={active.justifyLeft} disabled={sourceMode} onClick={() => exec("justifyLeft")}>
                    <AlignLeft className="w-4 h-4" />
                </ToolButton>
                <ToolButton title="Align center" active={active.justifyCenter} disabled={sourceMode} onClick={() => exec("justifyCenter")}>
                    <AlignCenter className="w-4 h-4" />
                </ToolButton>
                <ToolButton title="Align right" active={active.justifyRight} disabled={sourceMode} onClick={() => exec("justifyRight")}>
                    <AlignRight className="w-4 h-4" />
                </ToolButton>
                <ToolButton title="Justify" active={active.justifyFull} disabled={sourceMode} onClick={() => exec("justifyFull")}>
                    <AlignJustify className="w-4 h-4" />
                </ToolButton>

                <Divider />

                <ToolButton title="Bulleted list" active={active.insertUnorderedList} disabled={sourceMode} onClick={() => exec("insertUnorderedList")}>
                    <List className="w-4 h-4" />
                </ToolButton>
                <ToolButton title="Numbered list" active={active.insertOrderedList} disabled={sourceMode} onClick={() => exec("insertOrderedList")}>
                    <ListOrdered className="w-4 h-4" />
                </ToolButton>
                <ToolButton title="Decrease indent" disabled={sourceMode} onClick={() => exec("outdent")}>
                    <IndentDecrease className="w-4 h-4" />
                </ToolButton>
                <ToolButton title="Increase indent" disabled={sourceMode} onClick={() => exec("indent")}>
                    <IndentIncrease className="w-4 h-4" />
                </ToolButton>
                <ToolButton title="Quote" disabled={sourceMode} active={blockFormat === "BLOCKQUOTE"} onClick={() => exec("formatBlock", blockFormat === "BLOCKQUOTE" ? "P" : "BLOCKQUOTE")}>
                    <Quote className="w-4 h-4" />
                </ToolButton>

                <Divider />

                <ToolButton title="Insert link (Ctrl+K)" disabled={sourceMode} onClick={insertLink}>
                    <Link className="w-4 h-4" />
                </ToolButton>
                <ToolButton title="Remove link" disabled={sourceMode} onClick={() => exec("unlink")}>
                    <Unlink className="w-4 h-4" />
                </ToolButton>
                <ToolButton title="Upload image" disabled={sourceMode || uploading} onClick={uploadImage}>
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                </ToolButton>
                <ToolButton title="Image from URL" disabled={sourceMode} onClick={imageFromUrl}>
                    <span className="text-[11px] font-bold leading-4 px-0.5">URL</span>
                </ToolButton>
                <ToolButton title="Embed YouTube / Vimeo / Map" disabled={sourceMode} onClick={insertVideo}>
                    <Video className="w-4 h-4" />
                </ToolButton>
                <ToolButton title="Insert table" disabled={sourceMode} onClick={insertTable}>
                    <Table className="w-4 h-4" />
                </ToolButton>
                <ToolButton title="Horizontal line" disabled={sourceMode} onClick={() => exec("insertHorizontalRule")}>
                    <Minus className="w-4 h-4" />
                </ToolButton>

                <Divider />

                <ToolButton title="Clear formatting" disabled={sourceMode} onClick={clearFormatting}>
                    <RemoveFormatting className="w-4 h-4" />
                </ToolButton>
                <ToolButton title="Undo (Ctrl+Z)" disabled={sourceMode} onClick={() => exec("undo")}>
                    <Undo2 className="w-4 h-4" />
                </ToolButton>
                <ToolButton title="Redo (Ctrl+Y)" disabled={sourceMode} onClick={() => exec("redo")}>
                    <Redo2 className="w-4 h-4" />
                </ToolButton>

                <div className="ml-auto flex items-center gap-1">
                    <ToolButton title={sourceMode ? "Back to visual editor" : "Edit HTML source"} active={sourceMode} onClick={toggleSource}>
                        <CodeXml className="w-4 h-4" />
                    </ToolButton>
                    <ToolButton title={fullscreen ? "Exit fullscreen (Esc)" : "Fullscreen"} onClick={() => setFullscreen((f) => !f)}>
                        {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </ToolButton>
                </div>
            </div>

            {/* ---------------- IMAGE SETTINGS BAR ---------------- */}
            {selectedImg && !sourceMode && (
                <div className="flex flex-wrap items-center gap-4 px-3 py-2 bg-purple-950/40 border-b border-purple-800 text-sm text-gray-200">
                    <span className="font-semibold text-purple-300">Image</span>
                    <button
                        type="button"
                        onClick={() => openImageEditor()}
                        className="inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold px-3 py-1 rounded-md"
                    >
                        <Wand2 className="w-4 h-4" /> Edit image
                    </button>
                    <label className="flex items-center gap-2">
                        Width
                        <input
                            type="range"
                            min="10"
                            max="100"
                            step="5"
                            value={imgSettings.width}
                            onChange={(e) => updateImage({ width: parseInt(e.target.value) })}
                            className="accent-purple-500"
                        />
                        <span className="w-10 text-right">{imgSettings.width}%</span>
                    </label>
                    <div className="flex items-center gap-1">
                        {[
                            { v: "left", I: AlignLeft, t: "Float left (text wraps)" },
                            { v: "center", I: AlignCenter, t: "Center" },
                            { v: "right", I: AlignRight, t: "Float right (text wraps)" },
                        ].map(({ v, I, t }) => (
                            <ToolButton key={v} title={t} active={imgSettings.align === v} onClick={() => updateImage({ align: v })}>
                                <I className="w-4 h-4" />
                            </ToolButton>
                        ))}
                    </div>
                    <input
                        value={imgSettings.alt}
                        onChange={(e) => updateImage({ alt: e.target.value })}
                        placeholder="Alt text (for accessibility)"
                        className="bg-[#2a2a2a] border border-gray-600 rounded-md px-2 py-1 text-sm flex-1 min-w-[160px]"
                    />
                    <button type="button" onClick={removeImage} className="flex items-center gap-1 text-red-400 hover:text-red-300">
                        <Trash2 className="w-4 h-4" /> Remove
                    </button>
                    <button type="button" onClick={() => selectImage(null)} className="text-gray-400 hover:text-white" title="Close">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* ---------------- TABLE BAR ---------------- */}
            {activeTable && !selectedImg && !sourceMode && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 bg-sky-950/40 border-b border-sky-800 text-sm text-gray-200">
                    <span className="font-semibold text-sky-300">Table</span>
                    <div className="flex items-center gap-0.5">
                        <Rows3 className="w-4 h-4 text-gray-500 mr-1" />
                        <ToolButton title="Insert row above" onClick={() => insertRow(false)}>
                            <ArrowUpToLine className="w-4 h-4" />
                        </ToolButton>
                        <ToolButton title="Insert row below" onClick={() => insertRow(true)}>
                            <ArrowDownToLine className="w-4 h-4" />
                        </ToolButton>
                        <ToolButton title="Delete row" onClick={deleteRow}>
                            <Trash2 className="w-4 h-4 text-red-400" />
                        </ToolButton>
                    </div>
                    <div className="flex items-center gap-0.5">
                        <Columns3 className="w-4 h-4 text-gray-500 mr-1" />
                        <ToolButton title="Insert column left" onClick={() => insertCol(false)}>
                            <ArrowLeftToLine className="w-4 h-4" />
                        </ToolButton>
                        <ToolButton title="Insert column right" onClick={() => insertCol(true)}>
                            <ArrowRightToLine className="w-4 h-4" />
                        </ToolButton>
                        <ToolButton title="Delete column" onClick={deleteCol}>
                            <Trash2 className="w-4 h-4 text-red-400" />
                        </ToolButton>
                    </div>
                    <ToolButton title="Toggle header row" active={!!activeTable.tHead} onClick={toggleHeaderRow}>
                        <Heading className="w-4 h-4" />
                    </ToolButton>
                    <ColorPicker icon={PaintBucket} title="Cell background" onPick={setCellColor} />
                    <label className="flex items-center gap-2">
                        Width
                        <input
                            type="range"
                            min="20"
                            max="100"
                            value={tableWidth}
                            onChange={(e) => changeTableWidth(parseInt(e.target.value))}
                            className="accent-sky-500 w-28"
                        />
                        <span className="w-10 text-right tabular-nums">{tableWidth}%</span>
                    </label>
                    <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={equalizeColumns}
                        className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-xs"
                    >
                        Even columns
                    </button>
                    <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={deleteTable}
                        className="flex items-center gap-1 text-red-400 hover:text-red-300 ml-auto"
                    >
                        <Trash2 className="w-4 h-4" /> Delete table
                    </button>
                    <span className="w-full text-xs text-gray-400">
                        Tip: drag a column or row border to resize it. Drag the table&apos;s right edge to change its width.
                    </span>
                </div>
            )}

            {/* ---------------- CANVAS ---------------- */}
            <div className={`relative bg-[#7E0C0E] ${fullscreen ? "flex-1 overflow-y-auto" : ""}`}>
                <div className={`${fullscreen ? "max-w-4xl mx-auto" : ""} relative`}>
                    <div
                        ref={editorRef}
                        contentEditable={!sourceMode}
                        suppressContentEditableWarning
                        onInput={emit}
                        onClick={handleEditorClick}
                        onDoubleClick={handleEditorDoubleClick}
                        onMouseMove={handleEditorMouseMove}
                        onMouseDown={handleEditorMouseDown}
                        onMouseLeave={() => {
                            if (!tableDragging.current) {
                                tableHover.current = null;
                                if (editorRef.current) editorRef.current.style.cursor = "";
                            }
                        }}
                        onKeyDown={handleKeyDown}
                        onPaste={handlePaste}
                        onBlur={emit}
                        className={`news-content news-editor font-montserrat p-6 md:p-10 min-h-[520px] focus:outline-none ${
                            sourceMode ? "hidden" : ""
                        }`}
                    />
                    {isEmpty && !sourceMode && (
                        <div className="absolute top-6 md:top-10 left-6 md:left-10 text-white/40 pointer-events-none select-none font-montserrat">
                            {placeholder}
                        </div>
                    )}
                    {sourceMode && (
                        <textarea
                            value={sourceHtml}
                            onChange={(e) => setSourceHtml(e.target.value)}
                            spellCheck={false}
                            className="w-full min-h-[520px] bg-[#111] text-green-300 font-mono text-sm p-4 focus:outline-none"
                        />
                    )}
                </div>
            </div>

            {/* ---------------- STATUS BAR ---------------- */}
            <div className="flex justify-between items-center px-4 py-2 text-xs text-gray-400 border-t border-gray-700 rounded-b-xl">
                <span>
                    {stats.words} words · {stats.chars} characters · ~{Math.max(1, Math.round(stats.words / 200))} min read
                </span>
                <span className="hidden sm:inline">
                    Tip: double-click an image to crop/edit it · drag table borders to resize · Ctrl+K for links
                </span>
            </div>

            <PromptDialog dialog={dialog} onClose={() => setDialog(null)} />

            {imageEditor && (
                <ImageEditorModal
                    mode="image"
                    src={imageEditor.originalSrc}
                    initialEdits={imageEditor.edits}
                    initialStyle={imageEditor.style}
                    onCancel={() => setImageEditor(null)}
                    onApply={applyImageEdit}
                />
            )}

            {dragInfo && (
                <div
                    className="fixed z-[100] pointer-events-none bg-black/85 text-white text-xs font-semibold px-2 py-1 rounded shadow-lg"
                    style={{ left: dragInfo.x + 14, top: dragInfo.y + 14 }}
                >
                    {dragInfo.text}
                </div>
            )}

            <style jsx global>{`
                .news-editor img {
                    cursor: pointer;
                }
                .news-editor img[data-selected] {
                    outline: 3px solid #a855f7;
                    outline-offset: 3px;
                }
                .news-editor iframe {
                    pointer-events: none;
                }
                .news-editor td[data-active-cell],
                .news-editor th[data-active-cell] {
                    outline: 2px solid #38bdf8;
                    outline-offset: -2px;
                }
            `}</style>
        </div>
    );
}
