"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    X, Check, Loader2, RotateCcw, RotateCw, FlipHorizontal2, FlipVertical2, Crop, SlidersHorizontal,
    Sparkles, Paintbrush, AlignLeft, AlignCenter, AlignRight, Undo2, AlertTriangle,
} from "lucide-react";
import {
    DEFAULT_ADJUST, DEFAULT_EDITS, DEFAULT_STYLE, FILTER_PRESETS, ASPECTS, SHADOWS,
    clamp, filterString, isIdentityEdits, centeredCrop, resizeCrop, loadImage, drawTransformed,
    renderEditedImage, guessOutputType,
} from "./imageEditing";

const ADJUST_SLIDERS = [
    { key: "brightness", label: "Brightness", min: 0, max: 200, unit: "%" },
    { key: "contrast", label: "Contrast", min: 0, max: 200, unit: "%" },
    { key: "saturate", label: "Saturation", min: 0, max: 200, unit: "%" },
    { key: "hue", label: "Hue", min: -180, max: 180, unit: "°" },
    { key: "grayscale", label: "Black & white", min: 0, max: 100, unit: "%" },
    { key: "sepia", label: "Sepia", min: 0, max: 100, unit: "%" },
    { key: "blur", label: "Blur", min: 0, max: 10, step: 0.5, unit: "" },
];

const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
const HANDLE_POS = {
    nw: "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize",
    n: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize",
    ne: "right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize",
    e: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-ew-resize",
    se: "right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize",
    s: "left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-ns-resize",
    sw: "left-0 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize",
    w: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize",
};

function Slider({ label, value, min, max, step = 1, unit = "", onChange, defaultValue }) {
    return (
        <label className="block">
            <div className="flex justify-between text-xs text-gray-300 mb-1">
                <span>{label}</span>
                <button
                    type="button"
                    className="tabular-nums text-gray-400 hover:text-white"
                    title="Reset"
                    onClick={() => defaultValue !== undefined && onChange(defaultValue)}
                >
                    {value}
                    {unit}
                </button>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full accent-purple-500"
            />
        </label>
    );
}

/**
 * Canva-style image editor.
 * mode "image": crop / adjust / filters / style (for images inside the article)
 * mode "cover": crop / adjust / filters (for the cover image)
 *
 * onApply({ edits, style, identity, editsChanged, render }) may be async; `render()` returns the baked Blob.
 */
export default function ImageEditorModal({
    src,
    mode = "image",
    initialEdits = null,
    initialStyle = null,
    defaultAspect = null,
    blobType = "",
    title,
    onCancel,
    onApply,
}) {
    const [image, setImage] = useState(null); // { img, tainted }
    const [loadError, setLoadError] = useState("");
    const [edits, setEdits] = useState(() => initialEdits || { ...DEFAULT_EDITS, adjust: { ...DEFAULT_ADJUST } });
    const [style, setStyle] = useState(() => ({ ...DEFAULT_STYLE, ...(initialStyle || {}) }));
    const [tab, setTab] = useState("crop");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [displayW, setDisplayW] = useState(600);
    const initialEditsJson = useRef(JSON.stringify(initialEdits || null));
    const stageRef = useRef(null);
    const wrapperRef = useRef(null);
    const displayCanvasRef = useRef(null);

    // ---------- load ----------
    useEffect(() => {
        let alive = true;
        loadImage(src)
            .then((res) => {
                if (!alive) return;
                setImage(res);
                if (res.tainted) setTab(mode === "image" ? "style" : "crop");
            })
            .catch(() => alive && setLoadError("This image could not be loaded."));
        return () => {
            alive = false;
        };
    }, [src, mode]);

    // rotated/flipped low-res preview
    const preview = useMemo(
        () => (image ? drawTransformed(image.img, edits, 1400) : null),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [image, edits.rotate, edits.flipH, edits.flipV]
    );

    const ratioToRn = useCallback(
        (aspect) => {
            if (!preview || aspect === "free") return null;
            if (aspect === "original") return 1;
            return (aspect * preview.height) / preview.width;
        },
        [preview]
    );
    const rn = ratioToRn(edits.aspect);

    // apply default aspect (cover) once the image is known
    const appliedDefault = useRef(false);
    useEffect(() => {
        if (!preview || appliedDefault.current) return;
        appliedDefault.current = true;
        if (!initialEdits && defaultAspect) {
            const r = (defaultAspect * preview.height) / preview.width;
            setEdits((e) => ({ ...e, aspect: defaultAspect, crop: centeredCrop(r) }));
        }
    }, [preview, initialEdits, defaultAspect]);

    // ---------- display canvas (full in crop tab, cropped elsewhere) ----------
    useEffect(() => {
        const host = stageRef.current;
        if (!host || !preview) return;
        let canvas = preview;
        if (tab !== "crop") {
            const { x, y, w, h } = edits.crop;
            canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.round(w * preview.width));
            canvas.height = Math.max(1, Math.round(h * preview.height));
            canvas
                .getContext("2d")
                .drawImage(preview, x * preview.width, y * preview.height, w * preview.width, h * preview.height, 0, 0, canvas.width, canvas.height);
        }
        canvas.style.display = "block";
        canvas.style.maxWidth = "100%";
        canvas.style.maxHeight = "calc(100vh - 210px)";
        canvas.style.userSelect = "none";
        host.replaceChildren(canvas);
        displayCanvasRef.current = canvas;
        const ro = new ResizeObserver(() => setDisplayW(canvas.clientWidth || 600));
        ro.observe(canvas);
        return () => ro.disconnect();
    }, [preview, tab, edits.crop]);

    // live CSS preview of filters + style
    useEffect(() => {
        const c = displayCanvasRef.current;
        if (!c || !preview) return;
        // blur is defined relative to the original image width → convert to on-screen pixels
        const { naturalWidth: nw, naturalHeight: nh } = image.img;
        const rotFullW = edits.rotate % 180 ? nh : nw;
        const shownW = tab === "crop" ? rotFullW : edits.crop.w * rotFullW;
        const blurScale = (nw / 1000) * (displayW / Math.max(1, shownW));
        c.style.filter = filterString(edits.adjust, blurScale);
        const styled = mode === "image" && tab !== "crop";
        c.style.borderRadius = styled && style.radius ? `${style.radius}px` : "";
        c.style.border = styled && style.borderWidth ? `${style.borderWidth}px solid ${style.borderColor}` : "";
        c.style.boxShadow = styled ? SHADOWS[style.shadow] || "" : "";
        c.style.opacity = styled && style.opacity < 100 ? String(style.opacity / 100) : "";
    });

    // ---------- crop dragging ----------
    const startDrag = (e, handle) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = wrapperRef.current.getBoundingClientRect();
        const start = { ...edits.crop };
        const sx = e.clientX;
        const sy = e.clientY;
        const move = (ev) => {
            const dx = (ev.clientX - sx) / rect.width;
            const dy = (ev.clientY - sy) / rect.height;
            let next;
            if (handle === "move") {
                next = { ...start, x: clamp(start.x + dx, 0, 1 - start.w), y: clamp(start.y + dy, 0, 1 - start.h) };
            } else {
                next = resizeCrop(start, handle, dx, dy, rn);
            }
            setEdits((ed) => ({ ...ed, crop: next }));
        };
        const up = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
    };

    const setAspect = (aspect) => {
        setEdits((e) => ({ ...e, aspect, crop: centeredCrop(ratioToRn(aspect)) }));
    };

    const rotate = (dir) => {
        setEdits((e) => {
            const rot = (e.rotate + (dir > 0 ? 90 : 270)) % 360;
            // new rotated dimensions are swapped → recompute crop for the aspect
            const nextRn =
                e.aspect === "free" ? null : e.aspect === "original" ? 1 : preview ? (e.aspect * preview.width) / preview.height : null;
            return { ...e, rotate: rot, crop: centeredCrop(nextRn) };
        });
    };

    const setAdjust = (key, value) => setEdits((e) => ({ ...e, adjust: { ...e.adjust, [key]: value } }));
    const setStyleKey = (patch) => setStyle((s) => ({ ...s, ...patch }));

    const resetAll = () => {
        setEdits({ ...DEFAULT_EDITS, adjust: { ...DEFAULT_ADJUST } });
        setStyle({ ...DEFAULT_STYLE, alt: style.alt });
    };

    // ---------- apply ----------
    const apply = async () => {
        setBusy(true);
        setError("");
        try {
            await onApply({
                edits,
                style,
                identity: isIdentityEdits(edits),
                editsChanged: JSON.stringify(edits) !== initialEditsJson.current,
                render: () => renderEditedImage(image.img, edits, { type: guessOutputType(src, blobType) }),
            });
        } catch (err) {
            console.error(err);
            setError(
                err?.name === "SecurityError"
                    ? "This image's website doesn't allow editing. Download it and upload it instead."
                    : err.message || "Something went wrong."
            );
            setBusy(false);
        }
    };

    useEffect(() => {
        const onKey = (e) => e.key === "Escape" && !busy && onCancel();
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [busy, onCancel]);

    const tainted = image?.tainted;
    const tabs = [
        { key: "crop", label: "Crop", icon: Crop, disabled: tainted },
        { key: "adjust", label: "Adjust", icon: SlidersHorizontal, disabled: tainted },
        { key: "filters", label: "Filters", icon: Sparkles, disabled: tainted },
        ...(mode === "image" ? [{ key: "style", label: "Style", icon: Paintbrush }] : []),
    ];
    const btn = "flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition";
    const activeAdjustKey = JSON.stringify({ ...DEFAULT_ADJUST, ...edits.adjust });

    return (
        <div className="fixed inset-0 z-[95] bg-black/90 flex flex-col text-white font-montserrat">
            {/* top bar */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10 bg-[#161616]">
                <h2 className="font-semibold">{title || (mode === "cover" ? "Edit cover image" : "Edit image")}</h2>
                <div className="flex items-center gap-2">
                    <button type="button" onClick={resetAll} disabled={busy || !image} className={`${btn} text-gray-300 hover:bg-white/10`}>
                        <Undo2 className="w-4 h-4" /> Reset all
                    </button>
                    <button type="button" onClick={onCancel} disabled={busy} className={`${btn} bg-white/10 hover:bg-white/20`}>
                        <X className="w-4 h-4" /> Cancel
                    </button>
                    <button
                        type="button"
                        onClick={apply}
                        disabled={busy || !image || (mode === "cover" && tainted)}
                        className={`${btn} bg-purple-600 hover:bg-purple-500 font-semibold disabled:opacity-50`}
                    >
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        {busy ? "Applying…" : "Apply"}
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row min-h-0">
                {/* stage */}
                <div className="flex-1 flex items-center justify-center p-6 min-h-0 overflow-hidden bg-[repeating-conic-gradient(#222_0%_25%,#1a1a1a_0%_50%)] bg-[length:24px_24px]">
                    {loadError ? (
                        <p className="text-red-300">{loadError}</p>
                    ) : !image ? (
                        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    ) : (
                        <div ref={wrapperRef} className="relative inline-block max-w-full touch-none">
                            <div ref={stageRef} />
                            {tab === "crop" && (
                                <div className="absolute inset-0 overflow-hidden">
                                    <div
                                        onPointerDown={(e) => startDrag(e, "move")}
                                        className="absolute border-2 border-white cursor-move"
                                        style={{
                                            left: `${edits.crop.x * 100}%`,
                                            top: `${edits.crop.y * 100}%`,
                                            width: `${edits.crop.w * 100}%`,
                                            height: `${edits.crop.h * 100}%`,
                                            boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
                                        }}
                                    >
                                        {/* rule of thirds */}
                                        <div className="absolute inset-0 pointer-events-none">
                                            <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/40" />
                                            <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/40" />
                                            <div className="absolute top-1/3 left-0 right-0 h-px bg-white/40" />
                                            <div className="absolute top-2/3 left-0 right-0 h-px bg-white/40" />
                                        </div>
                                        {HANDLES.map((h) => (
                                            <div
                                                key={h}
                                                onPointerDown={(e) => startDrag(e, h)}
                                                className={`absolute w-3.5 h-3.5 bg-white rounded-sm shadow ${HANDLE_POS[h]}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* side panel */}
                <div className="w-full lg:w-80 bg-[#1b1b1b] border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col max-h-[45vh] lg:max-h-none">
                    <div className="flex border-b border-white/10">
                        {tabs.map(({ key, label, icon: Icon, disabled }) => (
                            <button
                                key={key}
                                type="button"
                                disabled={disabled}
                                onClick={() => setTab(key)}
                                className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs transition disabled:opacity-30 ${
                                    tab === key ? "text-purple-300 border-b-2 border-purple-500 bg-white/5" : "text-gray-400 hover:text-white"
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                {label}
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-5">
                        {tainted && (
                            <p className="text-xs text-orange-300 flex gap-2">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                {mode === "cover"
                                    ? "This image's website doesn't allow editing. Download it and upload it instead."
                                    : "This image's website doesn't allow cropping or filters. You can still change its style. To crop it, download and re-upload it."}
                            </p>
                        )}
                        {error && <p className="text-xs text-red-300 bg-red-950/50 rounded p-2">{error}</p>}

                        {tab === "crop" && !tainted && (
                            <>
                                <div>
                                    <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Aspect ratio</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        {ASPECTS.map((a) => (
                                            <button
                                                key={a.label}
                                                type="button"
                                                onClick={() => setAspect(a.value)}
                                                className={`${btn} ${edits.aspect === a.value ? "bg-purple-600" : "bg-white/5 hover:bg-white/10"}`}
                                            >
                                                {a.label}
                                            </button>
                                        ))}
                                    </div>
                                    {mode === "cover" && (
                                        <p className="text-xs text-gray-500 mt-2">16:9 fits the website cards and banners best.</p>
                                    )}
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Rotate & flip</p>
                                    <div className="grid grid-cols-4 gap-2">
                                        <button type="button" title="Rotate left" onClick={() => rotate(-1)} className={`${btn} bg-white/5 hover:bg-white/10`}>
                                            <RotateCcw className="w-4 h-4" />
                                        </button>
                                        <button type="button" title="Rotate right" onClick={() => rotate(1)} className={`${btn} bg-white/5 hover:bg-white/10`}>
                                            <RotateCw className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            title="Mirror horizontally"
                                            onClick={() => setEdits((e) => ({ ...e, flipH: !e.flipH }))}
                                            className={`${btn} ${edits.flipH ? "bg-purple-600" : "bg-white/5 hover:bg-white/10"}`}
                                        >
                                            <FlipHorizontal2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            title="Mirror vertically"
                                            onClick={() => setEdits((e) => ({ ...e, flipV: !e.flipV }))}
                                            className={`${btn} ${edits.flipV ? "bg-purple-600" : "bg-white/5 hover:bg-white/10"}`}
                                        >
                                            <FlipVertical2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setEdits((e) => ({ ...e, crop: centeredCrop(rn) }))}
                                    className={`${btn} w-full bg-white/5 hover:bg-white/10`}
                                >
                                    Reset crop
                                </button>
                                <p className="text-xs text-gray-500">Drag the box to move it. Drag the corners or edges to resize it.</p>
                            </>
                        )}

                        {tab === "adjust" && !tainted && (
                            <>
                                {ADJUST_SLIDERS.map((s) => (
                                    <Slider
                                        key={s.key}
                                        {...s}
                                        value={edits.adjust[s.key] ?? DEFAULT_ADJUST[s.key]}
                                        defaultValue={DEFAULT_ADJUST[s.key]}
                                        onChange={(v) => setAdjust(s.key, v)}
                                    />
                                ))}
                                <button
                                    type="button"
                                    onClick={() => setEdits((e) => ({ ...e, adjust: { ...DEFAULT_ADJUST } }))}
                                    className={`${btn} w-full bg-white/5 hover:bg-white/10`}
                                >
                                    Reset adjustments
                                </button>
                            </>
                        )}

                        {tab === "filters" && !tainted && (
                            <div className="grid grid-cols-3 gap-3">
                                {FILTER_PRESETS.map((p) => {
                                    const adj = { ...DEFAULT_ADJUST, ...p.adjust };
                                    const isActive = JSON.stringify(adj) === activeAdjustKey;
                                    return (
                                        <button
                                            key={p.name}
                                            type="button"
                                            onClick={() => setEdits((e) => ({ ...e, adjust: adj }))}
                                            className={`rounded-lg overflow-hidden border-2 text-xs ${
                                                isActive ? "border-purple-500" : "border-transparent hover:border-white/30"
                                            }`}
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={src}
                                                alt=""
                                                className="w-full aspect-square object-cover"
                                                style={{ filter: filterString(adj, 0.1) }}
                                            />
                                            <span className="block py-1 bg-black/40">{p.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {tab === "style" && mode === "image" && (
                            <>
                                <Slider
                                    label="Width in article"
                                    value={style.width}
                                    min={10}
                                    max={100}
                                    step={5}
                                    unit="%"
                                    defaultValue={100}
                                    onChange={(v) => setStyleKey({ width: v })}
                                />
                                <div>
                                    <p className="text-xs text-gray-300 mb-1">Position</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { v: "left", I: AlignLeft, t: "Left (text wraps)" },
                                            { v: "center", I: AlignCenter, t: "Center" },
                                            { v: "right", I: AlignRight, t: "Right (text wraps)" },
                                        ].map(({ v, I, t }) => (
                                            <button
                                                key={v}
                                                type="button"
                                                title={t}
                                                onClick={() => setStyleKey({ align: v })}
                                                className={`${btn} ${style.align === v ? "bg-purple-600" : "bg-white/5 hover:bg-white/10"}`}
                                            >
                                                <I className="w-4 h-4" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <Slider
                                    label="Rounded corners"
                                    value={style.radius}
                                    min={0}
                                    max={200}
                                    unit="px"
                                    defaultValue={DEFAULT_STYLE.radius}
                                    onChange={(v) => setStyleKey({ radius: v })}
                                />
                                <div className="flex items-end gap-3">
                                    <div className="flex-1">
                                        <Slider
                                            label="Border"
                                            value={style.borderWidth}
                                            min={0}
                                            max={20}
                                            unit="px"
                                            defaultValue={0}
                                            onChange={(v) => setStyleKey({ borderWidth: v })}
                                        />
                                    </div>
                                    <input
                                        type="color"
                                        value={style.borderColor}
                                        onChange={(e) => setStyleKey({ borderColor: e.target.value })}
                                        className="w-10 h-8 bg-transparent cursor-pointer"
                                        title="Border color"
                                    />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-300 mb-1">Shadow</p>
                                    <div className="grid grid-cols-4 gap-2">
                                        {Object.keys(SHADOWS).map((k) => (
                                            <button
                                                key={k}
                                                type="button"
                                                onClick={() => setStyleKey({ shadow: k })}
                                                className={`${btn} capitalize px-1 ${style.shadow === k ? "bg-purple-600" : "bg-white/5 hover:bg-white/10"}`}
                                            >
                                                {k}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <Slider
                                    label="Transparency"
                                    value={style.opacity}
                                    min={10}
                                    max={100}
                                    unit="%"
                                    defaultValue={100}
                                    onChange={(v) => setStyleKey({ opacity: v })}
                                />
                                <label className="block">
                                    <span className="text-xs text-gray-300">Alt text (describes the image for screen readers)</span>
                                    <input
                                        value={style.alt}
                                        onChange={(e) => setStyleKey({ alt: e.target.value })}
                                        className="mt-1 w-full bg-[#2a2a2a] border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                                    />
                                </label>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
