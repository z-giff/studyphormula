/**
 * Getting a picture ready for a regular card before it is uploaded.
 *
 * Every picture is decoded in the browser first, so a file no browser can show
 * (an iPhone HEIC photo, a PDF renamed .png) is refused here with a reason
 * instead of being stored and appearing broken on the card. It is then shrunk
 * to the size a card can use and encoded again, which also drops the location
 * and camera details phone photos carry.
 */

/** Largest file taken in. Bigger photos are usually camera RAW exports. */
export const MAX_PICTURE_INPUT_BYTES = 40 * 1024 * 1024;

/**
 * Longest side of a stored picture, in pixels: sharp on a full-screen card
 * and on a one-card-per-page PDF, a fraction of a phone photo's size.
 */
export const MAX_PICTURE_EDGE = 2048;

// Decoding more than this can run a phone out of memory
const MAX_PICTURE_PIXELS = 50_000_000;
// A GIF stays as it is, so it keeps moving, up to this size
const MAX_KEPT_GIF_BYTES = 8 * 1024 * 1024;
// What one stored picture may weigh, whatever it started as
const MAX_STORED_BYTES = 8 * 1024 * 1024;
// An opaque picture kept lossless (a screenshot, a diagram) up to this size;
// past it, it was a photo saved as PNG and a photo format serves it better
const MAX_LOSSLESS_BYTES = 1.5 * 1024 * 1024;
const PHOTO_QUALITY = 0.86;

export interface PreparedPicture {
  blob: Blob;
  /** File extension for the stored name, matching the encoded type. */
  extension: string;
  width: number;
  height: number;
}

/** A problem with the file itself, which trying again won't fix. */
export class PictureFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PictureFileError";
  }
}

interface Decoded {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
}

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const isHeic = (blob: Blob, name: string) => /^image\/hei[cf]/i.test(blob.type) || /\.hei[cf]$/i.test(name);

const isSvg = (blob: Blob, name: string) => blob.type === "image/svg+xml" || /\.svg$/i.test(name);

// Formats that can be see-through; a JPEG never is
const canBeTransparent = (blob: Blob) => !/^image\/jpe?g$/i.test(blob.type);

// An SVG without a width and height of its own has no natural size in an
// <img>, so read its viewBox for the shape and draw it at full size.
async function svgSize(blob: Blob): Promise<{ width: number; height: number } | null> {
  const text = await blob.text().catch(() => "");
  const viewBox = /viewBox\s*=\s*["']\s*[-\d.e]+[\s,]+[-\d.e]+[\s,]+([\d.e]+)[\s,]+([\d.e]+)\s*["']/i.exec(text);
  if (!viewBox) return null;
  const width = Number(viewBox[1]);
  const height = Number(viewBox[2]);
  if (!(width > 0 && height > 0)) return null;
  const scale = MAX_PICTURE_EDGE / Math.max(width, height);
  return { width: width * scale, height: height * scale };
}

async function decode(blob: Blob, name: string): Promise<Decoded> {
  // createImageBitmap is the quick path, but it can't read SVG
  if (typeof createImageBitmap === "function" && !isSvg(blob, name)) {
    try {
      const bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
    } catch {
      // Fall back to an <img>, which reads a few more formats in some browsers
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    let { naturalWidth: width, naturalHeight: height } = image;
    if ((!width || !height) && isSvg(blob, name)) {
      const size = await svgSize(blob);
      if (size) ({ width, height } = size);
    }
    if (!width || !height) throw new Error("No size");
    return { source: image, width, height, release: () => URL.revokeObjectURL(url) };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

const toBlob = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

// Draw at most maxEdge on the long side. Big reductions go in halves, which
// keeps fine lines in diagrams and text from turning to noise.
function drawScaled(decoded: Decoded, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(decoded.width, decoded.height));
  const width = Math.max(1, Math.round(decoded.width * scale));
  const height = Math.max(1, Math.round(decoded.height * scale));

  let source: CanvasImageSource = decoded.source;
  let sourceWidth = decoded.width;
  let sourceHeight = decoded.height;
  while (sourceWidth / 2 > width && sourceHeight / 2 > height) {
    const step = document.createElement("canvas");
    step.width = Math.round(sourceWidth / 2);
    step.height = Math.round(sourceHeight / 2);
    const stepContext = step.getContext("2d");
    if (!stepContext) break;
    stepContext.imageSmoothingQuality = "high";
    stepContext.drawImage(source, 0, 0, step.width, step.height);
    source = step;
    sourceWidth = step.width;
    sourceHeight = step.height;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("This browser can't prepare pictures");
  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, width, height);
  return { canvas, context, width, height };
}

function hasTransparency(context: CanvasRenderingContext2D, width: number, height: number) {
  const { data } = context.getImageData(0, 0, width, height);
  for (let index = 3; index < data.length; index += 4) {
    if (data[index] < 255) return true;
  }
  return false;
}

// A photo format the browser can write: WebP where it can (a third smaller),
// JPEG otherwise. Safari quietly writes PNG when asked for WebP, so the type
// that came back is checked.
async function encodeLossy(canvas: HTMLCanvasElement, transparent: boolean): Promise<Blob | null> {
  const webp = await toBlob(canvas, "image/webp", PHOTO_QUALITY);
  if (webp?.type === "image/webp") return webp;
  // JPEG has no transparency: leave a see-through picture as PNG
  return transparent ? null : toBlob(canvas, "image/jpeg", PHOTO_QUALITY);
}

async function encode(canvas: HTMLCanvasElement, transparent: boolean, keepLossless: boolean): Promise<Blob> {
  if (transparent || keepLossless) {
    const png = await toBlob(canvas, "image/png");
    if (png && png.size <= MAX_LOSSLESS_BYTES) return png;
    const smaller = await encodeLossy(canvas, transparent);
    if (smaller && (!png || smaller.size < png.size)) return smaller;
    if (png) return png;
  }
  const photo = await encodeLossy(canvas, transparent);
  if (photo) return photo;
  const png = await toBlob(canvas, "image/png");
  if (!png) throw new Error("This browser couldn't save the picture");
  return png;
}

const describe = (name: string) => name.trim() || "The picture";

/**
 * Decode, check, shrink and re-encode one picture for a card. Throws a
 * PictureFileError, with a message for the person adding it, when the file
 * can't be used.
 */
export async function preparePicture(blob: Blob, name = ""): Promise<PreparedPicture> {
  const label = describe(name);
  if (blob.size > MAX_PICTURE_INPUT_BYTES) {
    throw new PictureFileError(`${label} is over ${MAX_PICTURE_INPUT_BYTES / 1024 / 1024} MB. Pick a smaller picture.`);
  }
  if (blob.type && !blob.type.startsWith("image/")) {
    throw new PictureFileError(`${label} isn't a picture. Add a JPG, PNG, GIF or WebP file.`);
  }

  let decoded: Decoded;
  try {
    decoded = await decode(blob, name);
  } catch {
    if (isHeic(blob, name)) {
      throw new PictureFileError(`${label} is an iPhone HEIC photo, which web browsers can't show. Save it as JPG or PNG, then add it again.`);
    }
    throw new PictureFileError(`${label} couldn't be opened. It may be damaged, or in a format browsers can't show: try saving it as JPG or PNG.`);
  }

  try {
    if (decoded.width * decoded.height > MAX_PICTURE_PIXELS) {
      throw new PictureFileError(`${label} is too big to open (${decoded.width} × ${decoded.height} pixels). Pick a picture under 50 megapixels.`);
    }

    // A GIF may be animated, and drawing it would keep only its first frame
    if (blob.type === "image/gif" && blob.size <= MAX_KEPT_GIF_BYTES) {
      return { blob, extension: "gif", width: decoded.width, height: decoded.height };
    }

    const keepLossless = /^image\/(png|gif|bmp|svg\+xml)$/i.test(blob.type) || isSvg(blob, name);
    let edge = MAX_PICTURE_EDGE;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const { canvas, context, width, height } = drawScaled(decoded, edge);
      const transparent = canBeTransparent(blob) && hasTransparency(context, width, height);
      const encoded = await encode(canvas, transparent, keepLossless);
      if (encoded.size <= MAX_STORED_BYTES) {
        return { blob: encoded, extension: EXTENSIONS[encoded.type] || "png", width, height };
      }
      edge = Math.round(edge * 0.75);
    }
    throw new PictureFileError(`${label} is too detailed to store. Try a smaller picture.`);
  } finally {
    decoded.release();
  }
}

/** Every picture file in a paste, in order. */
export function picturesFromClipboard(data: DataTransfer | null): File[] {
  if (!data) return [];
  const fromItems = Array.from(data.items ?? [])
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null);
  if (fromItems.length) return fromItems;
  return Array.from(data.files ?? []).filter((file) => file.type.startsWith("image/"));
}

/** A readable file name for a picture fetched from a link. */
export function pictureNameFromLink(link: string): string {
  try {
    const last = new URL(link).pathname.split("/").filter(Boolean).pop();
    return last ? decodeURIComponent(last).slice(0, 80) : "The linked picture";
  } catch {
    return "The linked picture";
  }
}
