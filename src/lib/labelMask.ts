/**
 * Auto-Detect label masking.
 *
 * The detector returns a rough rectangle for each label it reads. That is not
 * good enough to hide an answer from a student: a box that is a few pixels off,
 * or sized to one line of a two-line label, leaves the answer readable. These
 * helpers take each detected rectangle back to the uploaded image and:
 *
 *   1. grow the rectangle outward until every side reaches clear background,
 *      so the whole label — all lines of it — sits inside the mask;
 *   2. sample the background immediately around the label so the mask can be
 *      painted in the local background colour and disappear into the diagram;
 *   3. pick black or white answer text from the sampled background's relative
 *      luminance, so the answer stays legible on light and dark artwork alike.
 *
 * Everything is expressed as percentages of the image, so a mask keeps its
 * place when the image is displayed at any size.
 */

/** A rectangle in percentages of the image (0–100). */
export interface LabelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LabelMask extends LabelRect {
  /** Local background colour behind the label, as #rrggbb. */
  bgColor: string;
  /** Black or white — whichever reads better on bgColor. */
  fontColor: string;
}

/** Largest canvas dimension we sample from. Keeps big uploads cheap. */
const MAX_SAMPLE_EDGE = 1600;
/** Colour distance (0–441) beyond which a pixel counts as "ink", not background. */
const INK_DISTANCE = 58;
/** Minimum ink pixels on a scan line for that line to count as part of the label. */
const MIN_INK_PIXELS = 2;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Only meaningful for remote URLs; harmless for data: URLs.
    if (!src.startsWith("data:")) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image for sampling"));
    img.src = src;
  });
}

interface Sampler {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/** Euclidean RGB distance between a pixel and a colour. */
function distanceTo(s: Sampler, x: number, y: number, rgb: number[]): number {
  const i = (y * s.width + x) * 4;
  // Transparent pixels carry no colour information — treat them as background.
  if (s.data[i + 3] < 200) return 0;
  const dr = s.data[i] - rgb[0];
  const dg = s.data[i + 1] - rgb[1];
  const db = s.data[i + 2] - rgb[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

interface PixelRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * The most common colour in a band just outside `rect` — i.e. the background
 * the label is sitting on. Colours are bucketed before counting so that noise
 * and gradients still agree on one dominant bucket; the returned value is the
 * true average of the winning bucket rather than its rounded centre.
 */
function sampleBackground(s: Sampler, rect: PixelRect, band: number): number[] | null {
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();

  const add = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= s.width || y >= s.height) return;
    const i = (y * s.width + x) * 4;
    if (s.data[i + 3] < 200) return;
    const key = ((s.data[i] >> 4) << 8) | ((s.data[i + 1] >> 4) << 4) | (s.data[i + 2] >> 4);
    const entry = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    entry.n += 1;
    entry.r += s.data[i];
    entry.g += s.data[i + 1];
    entry.b += s.data[i + 2];
    buckets.set(key, entry);
  };

  for (let x = rect.left - band; x < rect.right + band; x++) {
    for (let k = 1; k <= band; k++) {
      add(x, rect.top - k);
      add(x, rect.bottom - 1 + k);
    }
  }
  for (let y = rect.top; y < rect.bottom; y++) {
    for (let k = 1; k <= band; k++) {
      add(rect.left - k, y);
      add(rect.right - 1 + k, y);
    }
  }

  let best: { n: number; r: number; g: number; b: number } | null = null;
  for (const entry of buckets.values()) {
    if (!best || entry.n > best.n) best = entry;
  }
  if (!best) return null;
  return [
    Math.round(best.r / best.n),
    Math.round(best.g / best.n),
    Math.round(best.b / best.n),
  ];
}

function inkInRow(s: Sampler, y: number, left: number, right: number, bg: number[]): number {
  if (y < 0 || y >= s.height) return 0;
  let n = 0;
  for (let x = Math.max(0, left); x < Math.min(s.width, right); x++) {
    if (distanceTo(s, x, y, bg) > INK_DISTANCE) n += 1;
  }
  return n;
}

function inkInColumn(s: Sampler, x: number, top: number, bottom: number, bg: number[]): number {
  if (x < 0 || x >= s.width) return 0;
  let n = 0;
  for (let y = Math.max(0, top); y < Math.min(s.height, bottom); y++) {
    if (distanceTo(s, x, y, bg) > INK_DISTANCE) n += 1;
  }
  return n;
}

/**
 * Walk one edge outward. Every scan line carrying ink extends the label; the
 * walk only stops once `clearRun` consecutive empty lines prove we have left
 * the text behind. That run is sized from the label's own height, so the gap
 * between two wrapped lines is crossed while real whitespace ends the search.
 * `maxExpand` bounds how far a stray diagram line can drag the mask.
 */
function growEdge(
  s: Sampler,
  bg: number[],
  edge: "top" | "bottom" | "left" | "right",
  rect: PixelRect,
  clearRun: number,
  maxExpand: number,
): number {
  const vertical = edge === "top" || edge === "bottom";
  const step = edge === "top" || edge === "left" ? -1 : 1;
  let cursor = edge === "top" ? rect.top : edge === "bottom" ? rect.bottom - 1 : edge === "left" ? rect.left : rect.right - 1;
  let found = cursor;
  let clear = 0;

  for (let moved = 0; moved < maxExpand; moved++) {
    cursor += step;
    const ink = vertical
      ? inkInRow(s, cursor, rect.left, rect.right, bg)
      : inkInColumn(s, cursor, rect.top, rect.bottom, bg);

    if (ink >= MIN_INK_PIXELS) {
      found = cursor;
      clear = 0;
    } else {
      clear += 1;
      if (clear >= clearRun) break;
    }
  }
  return found;
}

/** WCAG relative luminance of an sRGB colour. */
function relativeLuminance([r, g, b]: number[]): number {
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * Black or white, whichever contrasts more with `rgb`. The crossover sits at
 * luminance 0.179, where contrast against white and against black is equal.
 */
export function readableTextColor(rgb: number[]): string {
  return relativeLuminance(rgb) > 0.1791 ? "#000000" : "#FFFFFF";
}

const toHex = ([r, g, b]: number[]) =>
  `#${[r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0")).join("")}`;

/**
 * Refine one detected rectangle against the image pixels.
 * Returns null when the region cannot be analysed.
 */
function maskForRect(s: Sampler, rect: LabelRect): LabelMask | null {
  const px = {
    left: Math.round((rect.x / 100) * s.width),
    top: Math.round((rect.y / 100) * s.height),
    right: Math.round(((rect.x + rect.width) / 100) * s.width),
    bottom: Math.round(((rect.y + rect.height) / 100) * s.height),
  };
  px.left = clamp(px.left, 0, s.width - 1);
  px.top = clamp(px.top, 0, s.height - 1);
  px.right = clamp(px.right, px.left + 1, s.width);
  px.bottom = clamp(px.bottom, px.top + 1, s.height);

  const baseHeight = px.bottom - px.top;

  // First estimate: the ring around the detector's guess.
  const firstBg = sampleBackground(s, px, 3);
  if (!firstBg) return null;

  // How far an edge may travel, and how much clear space ends the walk. Both
  // scale with the label so small and large text behave the same way.
  const maxExpand = Math.max(10, Math.round(baseHeight * 1.25));
  const clearRun = Math.max(3, Math.round(baseHeight * 0.5));

  const grown: PixelRect = { ...px };
  // Two passes: growing vertically can reveal a longer line, which in turn can
  // reveal more rows (a wrapped label that is wider on its second line).
  for (let pass = 0; pass < 2; pass++) {
    grown.top = growEdge(s, firstBg, "top", grown, clearRun, maxExpand);
    grown.bottom = growEdge(s, firstBg, "bottom", grown, clearRun, maxExpand) + 1;
    grown.left = growEdge(s, firstBg, "left", grown, clearRun, maxExpand);
    grown.right = growEdge(s, firstBg, "right", grown, clearRun, maxExpand) + 1;
  }

  // A little breathing room so no anti-aliased edge of a letter survives.
  const height = grown.bottom - grown.top;
  const padY = Math.max(2, Math.round(height * 0.16));
  const padX = Math.max(3, Math.round(height * 0.22));

  const padded: PixelRect = {
    left: clamp(grown.left - padX, 0, s.width - 1),
    top: clamp(grown.top - padY, 0, s.height - 1),
    right: clamp(grown.right + padX, 1, s.width),
    bottom: clamp(grown.bottom + padY, 1, s.height),
  };

  // Re-sample now that the rectangle is centred on the label: the ring is
  // cleaner, so the colour is a better match for the surrounding artwork.
  const bg = sampleBackground(s, padded, 3) ?? firstBg;

  return {
    x: (padded.left / s.width) * 100,
    y: (padded.top / s.height) * 100,
    width: ((padded.right - padded.left) / s.width) * 100,
    height: ((padded.bottom - padded.top) / s.height) * 100,
    bgColor: toHex(bg),
    fontColor: readableTextColor(bg),
  };
}

/**
 * Analyse every detected rectangle against the uploaded image.
 * Resolves to one mask per input rectangle, or null where analysis failed
 * (unreadable image, cross-origin canvas) so the caller can fall back.
 */
export async function buildLabelMasks(
  imageUrl: string,
  rects: LabelRect[],
): Promise<(LabelMask | null)[]> {
  if (rects.length === 0) return [];

  try {
    const img = await loadImage(imageUrl);
    const naturalW = img.naturalWidth || img.width;
    const naturalH = img.naturalHeight || img.height;
    if (!naturalW || !naturalH) return rects.map(() => null);

    const scale = Math.min(1, MAX_SAMPLE_EDGE / Math.max(naturalW, naturalH));
    const width = Math.max(1, Math.round(naturalW * scale));
    const height = Math.max(1, Math.round(naturalH * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return rects.map(() => null);
    ctx.drawImage(img, 0, 0, width, height);

    // Throws on a cross-origin image the browser refused to expose.
    const imageData = ctx.getImageData(0, 0, width, height);
    const sampler: Sampler = { data: imageData.data, width, height };

    return rects.map((rect) => {
      try {
        return maskForRect(sampler, rect);
      } catch {
        return null;
      }
    });
  } catch (error) {
    console.warn("Label masking unavailable, falling back to detector bounds:", error);
    return rects.map(() => null);
  }
}
