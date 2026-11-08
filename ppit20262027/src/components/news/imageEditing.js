/*
 * Image editing helpers used by ImageEditorModal.
 *
 * "edits" = the destructive part (baked into a new image file):
 *   { rotate: 0|90|180|270, flipH, flipV, crop: {x,y,w,h} (0..1, in rotated space), aspect, adjust: {...} }
 * "style" = the non-destructive part (CSS on the <img> in the article):
 *   { width, align, radius, borderWidth, borderColor, shadow, opacity, alt }
 */

export const DEFAULT_ADJUST = {
    brightness: 100, // %
    contrast: 100, // %
    saturate: 100, // %
    hue: 0, // deg
    grayscale: 0, // %
    sepia: 0, // %
    blur: 0, // px at 1000px image width
};

export const DEFAULT_EDITS = {
    rotate: 0,
    flipH: false,
    flipV: false,
    crop: { x: 0, y: 0, w: 1, h: 1 },
    aspect: "free",
    adjust: { ...DEFAULT_ADJUST },
};

export const DEFAULT_STYLE = {
    width: 100,
    align: "center",
    radius: 12,
    borderWidth: 0,
    borderColor: "#ffffff",
    shadow: "none",
    opacity: 100,
    alt: "",
};

export const SHADOWS = {
    none: "",
    soft: "0 4px 14px rgba(0,0,0,0.25)",
    medium: "0 10px 30px rgba(0,0,0,0.4)",
    strong: "0 20px 50px rgba(0,0,0,0.6)",
};

export const FILTER_PRESETS = [
    { name: "Original", adjust: {} },
    { name: "B&W", adjust: { grayscale: 100, contrast: 110 } },
    { name: "Noir", adjust: { grayscale: 100, contrast: 150, brightness: 90 } },
    { name: "Sepia", adjust: { sepia: 80 } },
    { name: "Vintage", adjust: { sepia: 40, contrast: 90, brightness: 105, saturate: 80 } },
    { name: "Warm", adjust: { sepia: 25, saturate: 130, hue: -10 } },
    { name: "Vivid", adjust: { saturate: 150, contrast: 110 } },
    { name: "Fade", adjust: { contrast: 85, brightness: 110, saturate: 80 } },
    { name: "Dramatic", adjust: { contrast: 140, brightness: 90, saturate: 90 } },
    { name: "Bright", adjust: { brightness: 125, contrast: 105 } },
    { name: "Cool", adjust: { hue: 15, saturate: 110, brightness: 102 } },
    { name: "Soft", adjust: { blur: 1.5, brightness: 105, contrast: 95 } },
];

export const ASPECTS = [
    { label: "Free", value: "free" },
    { label: "Original", value: "original" },
    { label: "1:1", value: 1 },
    { label: "16:9", value: 16 / 9 },
    { label: "4:3", value: 4 / 3 },
    { label: "3:2", value: 3 / 2 },
    { label: "4:5", value: 4 / 5 },
    { label: "3:4", value: 3 / 4 },
    { label: "9:16", value: 9 / 16 },
];

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export function filterString(adjust, blurScale = 1) {
    const a = { ...DEFAULT_ADJUST, ...adjust };
    const parts = [];
    if (a.brightness !== 100) parts.push(`brightness(${a.brightness}%)`);
    if (a.contrast !== 100) parts.push(`contrast(${a.contrast}%)`);
    if (a.saturate !== 100) parts.push(`saturate(${a.saturate}%)`);
    if (a.hue !== 0) parts.push(`hue-rotate(${a.hue}deg)`);
    if (a.grayscale !== 0) parts.push(`grayscale(${a.grayscale}%)`);
    if (a.sepia !== 0) parts.push(`sepia(${a.sepia}%)`);
    if (a.blur > 0) parts.push(`blur(${(a.blur * blurScale).toFixed(2)}px)`);
    return parts.join(" ") || "none";
}

export function isIdentityEdits(edits) {
    if (!edits) return true;
    const { rotate, flipH, flipV, crop, adjust } = edits;
    const fullCrop = crop.x <= 0.0005 && crop.y <= 0.0005 && crop.w >= 0.9995 && crop.h >= 0.9995;
    const plainAdjust = Object.keys(DEFAULT_ADJUST).every((k) => (adjust?.[k] ?? DEFAULT_ADJUST[k]) === DEFAULT_ADJUST[k]);
    return rotate % 360 === 0 && !flipH && !flipV && fullCrop && plainAdjust;
}

/** Largest crop rect centered in the image with normalized ratio rn (= w/h in normalized units). */
export function centeredCrop(rn) {
    if (!rn) return { x: 0, y: 0, w: 1, h: 1 };
    let w = 1;
    let h = 1 / rn;
    if (h > 1) {
        h = 1;
        w = rn;
    }
    return { x: (1 - w) / 2, y: (1 - h) / 2, w, h };
}

/** Resize a crop rect by dragging a handle (n, s, e, w, ne, nw, se, sw), optionally keeping ratio rn. */
export function resizeCrop(start, handle, dx, dy, rn, MIN = 0.04) {
    let x1 = start.x;
    let y1 = start.y;
    let x2 = start.x + start.w;
    let y2 = start.y + start.h;
    const W = handle.includes("w");
    const E = handle.includes("e");
    const N = handle.includes("n");
    const S = handle.includes("s");
    if (W) x1 = clamp(x1 + dx, 0, x2 - MIN);
    if (E) x2 = clamp(x2 + dx, x1 + MIN, 1);
    if (N) y1 = clamp(y1 + dy, 0, y2 - MIN);
    if (S) y2 = clamp(y2 + dy, y1 + MIN, 1);
    if (!rn) return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };

    let w = x2 - x1;
    let h = y2 - y1;
    const horiz = W || E;
    const vert = N || S;
    if (horiz && !vert) h = w / rn;
    else if (vert && !horiz) w = h * rn;
    else if (w / h > rn) h = w / rn;
    else w = h * rn;

    const ax = W ? x2 : E ? x1 : start.x + start.w / 2;
    const ay = N ? y2 : S ? y1 : start.y + start.h / 2;
    const maxW = W ? ax : E ? 1 - ax : 2 * Math.min(ax, 1 - ax);
    const maxH = N ? ay : S ? 1 - ay : 2 * Math.min(ay, 1 - ay);
    const s = Math.min(1, maxW / w, maxH / h);
    w *= s;
    h *= s;
    return {
        x: W ? ax - w : E ? ax : ax - w / 2,
        y: N ? ay - h : S ? ay : ay - h / 2,
        w,
        h,
    };
}

/** Loads an image. Tries CORS first (needed to export), falls back to a "tainted" load (preview only). */
export function loadImage(src) {
    const load = (cors) =>
        new Promise((resolve, reject) => {
            const img = new Image();
            if (cors && !src.startsWith("blob:") && !src.startsWith("data:")) img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error("Could not load image"));
            img.src = src;
        });
    return load(true)
        .then((img) => ({ img, tainted: false }))
        .catch(() => load(false).then((img) => ({ img, tainted: true })));
}

/** Draws the image rotated/flipped onto a new canvas, scaled so its longest side ≤ maxSide. */
export function drawTransformed(img, { rotate = 0, flipH = false, flipV = false }, maxSide = Infinity, filter = "none") {
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const scale = Math.min(1, maxSide / Math.max(nw, nh));
    const w = Math.round(nw * scale);
    const h = Math.round(nh * scale);
    const quarter = rotate % 180 !== 0;
    const canvas = document.createElement("canvas");
    canvas.width = quarter ? h : w;
    canvas.height = quarter ? w : h;
    const ctx = canvas.getContext("2d");
    if (filter !== "none") ctx.filter = filter;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotate * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    return canvas;
}

let filterSupport = null;
function canvasFilterSupported() {
    if (filterSupport === null) {
        const ctx = document.createElement("canvas").getContext("2d");
        ctx.filter = "blur(1px)";
        filterSupport = ctx.filter === "blur(1px)";
    }
    return filterSupport;
}

// --- manual colour-matrix fallback for browsers without ctx.filter (e.g. older Safari) ---
function saturateMatrix(s) {
    return [
        0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s,
        0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s,
        0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s,
    ];
}
function sepiaMatrix(a) {
    const i = 1 - a;
    return [
        0.393 + 0.607 * i, 0.769 - 0.769 * i, 0.189 - 0.189 * i,
        0.349 - 0.349 * i, 0.686 + 0.314 * i, 0.168 - 0.168 * i,
        0.272 - 0.272 * i, 0.534 - 0.534 * i, 0.131 + 0.869 * i,
    ];
}
function hueMatrix(deg) {
    const r = (deg * Math.PI) / 180;
    const c = Math.cos(r);
    const s = Math.sin(r);
    return [
        0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928,
        0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.14, 0.072 - c * 0.072 - s * 0.283,
        0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072,
    ];
}
function applyAdjustManually(canvas, adjust) {
    const a = { ...DEFAULT_ADJUST, ...adjust };
    const steps = [];
    if (a.brightness !== 100) { const b = a.brightness / 100; steps.push({ m: [b, 0, 0, 0, b, 0, 0, 0, b], o: 0 }); }
    if (a.contrast !== 100) { const c = a.contrast / 100; steps.push({ m: [c, 0, 0, 0, c, 0, 0, 0, c], o: (0.5 - 0.5 * c) * 255 }); }
    if (a.saturate !== 100) steps.push({ m: saturateMatrix(a.saturate / 100), o: 0 });
    if (a.hue !== 0) steps.push({ m: hueMatrix(a.hue), o: 0 });
    if (a.grayscale !== 0) steps.push({ m: saturateMatrix(1 - a.grayscale / 100), o: 0 });
    if (a.sepia !== 0) steps.push({ m: sepiaMatrix(a.sepia / 100), o: 0 });
    if (!steps.length) return;
    const ctx = canvas.getContext("2d");
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const px = data.data;
    for (let i = 0; i < px.length; i += 4) {
        let r = px[i], g = px[i + 1], b = px[i + 2];
        for (const { m, o } of steps) {
            const nr = m[0] * r + m[1] * g + m[2] * b + o;
            const ng = m[3] * r + m[4] * g + m[5] * b + o;
            const nb = m[6] * r + m[7] * g + m[8] * b + o;
            r = clamp(nr, 0, 255); g = clamp(ng, 0, 255); b = clamp(nb, 0, 255);
        }
        px[i] = r; px[i + 1] = g; px[i + 2] = b;
    }
    ctx.putImageData(data, 0, 0);
}

/** Bakes edits into a new image Blob (max 2400px on the longest side). */
export async function renderEditedImage(img, edits, { maxSide = 2400, type = "image/jpeg" } = {}) {
    const supported = canvasFilterSupported();
    const fullW = img.naturalWidth;
    const blurScale = fullW / 1000;
    const filter = supported ? filterString(edits.adjust, blurScale) : "none";
    const rotated = drawTransformed(img, edits, Infinity, filter);

    const { x, y, w, h } = edits.crop;
    const sx = Math.round(x * rotated.width);
    const sy = Math.round(y * rotated.height);
    const sw = Math.max(1, Math.round(w * rotated.width));
    const sh = Math.max(1, Math.round(h * rotated.height));
    const scale = Math.min(1, maxSide / Math.max(sw, sh));

    const out = document.createElement("canvas");
    out.width = Math.round(sw * scale);
    out.height = Math.round(sh * scale);
    const ctx = out.getContext("2d");
    if (type === "image/jpeg") {
        ctx.fillStyle = "#ffffff"; // JPEG has no transparency
        ctx.fillRect(0, 0, out.width, out.height);
    }
    ctx.drawImage(rotated, sx, sy, sw, sh, 0, 0, out.width, out.height);
    if (!supported) applyAdjustManually(out, edits.adjust);

    return new Promise((resolve, reject) => {
        try {
            out.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Export failed"))), type, 0.92);
        } catch (err) {
            reject(err);
        }
    });
}

export function guessOutputType(src = "", blobType = "") {
    const t = blobType || "";
    if (/png|gif|webp|svg/.test(t) || /\.(png|gif|webp|svg)(\?|$)/i.test(src)) return "image/png";
    return "image/jpeg";
}

/** Applies the non-destructive style to an <img> element. */
export function applyImageStyle(img, style) {
    const s = { ...DEFAULT_STYLE, ...style };
    img.style.width = `${s.width}%`;
    img.style.height = "auto";
    img.style.borderRadius = `${s.radius || 0}px`; // explicit 0 overrides the default rounded corners
    img.style.border = s.borderWidth ? `${s.borderWidth}px solid ${s.borderColor}` : "";
    img.style.boxShadow = SHADOWS[s.shadow] || "";
    img.style.opacity = s.opacity < 100 ? String(s.opacity / 100) : "";
    img.setAttribute("data-align", s.align);
    img.setAttribute("alt", s.alt || "");
}

export function readImageState(img) {
    let saved = {};
    try {
        saved = JSON.parse(img.getAttribute("data-edits") || "{}");
    } catch {
        saved = {};
    }
    const style = {
        ...DEFAULT_STYLE,
        ...(saved.style || {}),
        width: parseInt(img.style.width) || saved.style?.width || 100,
        align: img.getAttribute("data-align") || "center",
        alt: img.getAttribute("alt") || "",
    };
    return {
        originalSrc: img.getAttribute("data-original-src") || img.getAttribute("src"),
        edits: saved.edits ? { ...DEFAULT_EDITS, ...saved.edits, adjust: { ...DEFAULT_ADJUST, ...saved.edits.adjust } } : null,
        style,
    };
}
