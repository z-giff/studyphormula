import { supabase } from "@/integrations/supabase/client";
import type { PreparedPicture } from "@/lib/pictureFiles";

export type StandardCardSide = "front" | "back";
export type StandardImageFit = "contain" | "cover";
export type StandardTextFlow = "overlap" | "avoid";

export interface StandardCardImage {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fit: StandardImageFit;
  textFlow: StandardTextFlow;
  zIndex: number;
}

export interface StandardCardLayout {
  version: 1;
  front: StandardCardImage[];
  back: StandardCardImage[];
}

/** A card face is this many times as wide as it is tall (the PDF draws cards at this ratio too). */
export const STANDARD_CARD_RATIO = 1.75;

/** The most pictures one side of a card holds. */
export const MAX_PICTURES_PER_SIDE = 12;

export const emptyStandardCardLayout = (): StandardCardLayout => ({ version: 1, front: [], back: [] });

const clamp = (value: unknown, min: number, max: number, fallback: number) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};

export const isStorageImage = (source: string) => source.startsWith("storage:");
export const storagePathFromSource = (source: string) => source.slice("storage:".length);

/** A picture saved inside the card itself, as a data: URL, the way cards stored uploads before storage. */
export const isInlinePicture = (source: string) => /^data:image\//i.test(source);

// A link stays a sensible length. An inline picture is often hundreds of
// kilobytes long, and cutting one short destroys it, so it keeps its length.
const MAX_LINK_LENGTH = 4096;
const MAX_INLINE_LENGTH = 16 * 1024 * 1024;

const cleanSource = (source: string) => {
  const trimmed = source.trim();
  return trimmed.slice(0, isInlinePicture(trimmed) ? MAX_INLINE_LENGTH : MAX_LINK_LENGTH);
};

const parseImage = (value: unknown, index: number): StandardCardImage | null => {
  if (!value || typeof value !== "object") return null;
  const image = value as Partial<StandardCardImage>;
  if (typeof image.src !== "string" || !image.src.trim()) return null;
  return {
    id: typeof image.id === "string" ? image.id : `image-${index}`,
    src: cleanSource(image.src),
    x: clamp(image.x, 0, 100, 25),
    y: clamp(image.y, 0, 100, 25),
    width: clamp(image.width, 5, 100, 50),
    height: clamp(image.height, 5, 100, 50),
    rotation: clamp(image.rotation, -180, 180, 0),
    fit: image.fit === "cover" ? "cover" : "contain",
    textFlow: image.textFlow === "avoid" ? "avoid" : "overlap",
    zIndex: clamp(image.zIndex, 0, 1000, index),
  };
};

const parseSide = (value: unknown) =>
  Array.isArray(value) ? value.map(parseImage).filter((image): image is StandardCardImage => image !== null) : [];

export const getStandardCardLayout = (interactiveData: unknown, legacyImageUrl?: string | null): StandardCardLayout => {
  const raw = interactiveData && typeof interactiveData === "object" ? interactiveData as { standardLayout?: unknown } : {};
  const layout = raw.standardLayout as { version?: unknown; front?: unknown; back?: unknown } | undefined;
  if (layout?.version === 1) {
    return { version: 1, front: parseSide(layout.front), back: parseSide(layout.back) };
  }
  return legacyImageUrl ? {
    version: 1,
    front: [],
    back: [{ id: "legacy-image", src: legacyImageUrl, x: 25, y: 8, width: 50, height: 42, rotation: 0, fit: "contain", textFlow: "avoid", zIndex: 0 }],
  } : emptyStandardCardLayout();
};

export const withStandardCardLayout = (interactiveData: unknown, layout: StandardCardLayout) => ({
  ...(interactiveData && typeof interactiveData === "object" ? interactiveData as object : {}),
  standardLayout: layout,
});

/** The card with every picture whose source is `from` pointing at `to` instead. */
export const replacePictureSource = (layout: StandardCardLayout, from: string, to: string): StandardCardLayout => {
  const swap = (image: StandardCardImage) => image.src === from ? { ...image, src: to } : image;
  return { ...layout, front: layout.front.map(swap), back: layout.back.map(swap) };
};

export const topZIndex = (images: StandardCardImage[]) => images.reduce((top, image) => Math.max(top, image.zIndex), -1);

export interface PictureSize {
  width: number;
  height: number;
}

export interface PictureFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

// New pictures go side by side in a band across the top of the card, each
// sized to its own shape and kept clear of the text, which moves below them:
// where a card's single picture has always sat.
const NEW_PICTURE_BAND = { left: 6, right: 94, top: 7, bottom: 49 };
const NEW_PICTURE_GAP = 3;
const round = (value: number) => Math.round(value * 100) / 100;

// Pictures squeezed smaller than this beside the ones already there would be
// too small to see; they go on top instead
const MIN_BESIDE_SCALE = 0.45;

/**
 * Where pictures added together land, as card percentages: in a row in the
 * widest stretch of the band the pictures already on that side leave free.
 * When there's no room beside them, the row goes across the middle, nudged
 * down and across so it doesn't cover the last pictures exactly.
 */
export function frameNewPictures(sizes: PictureSize[], existing: PictureFrame[] = []): PictureFrame[] {
  if (!sizes.length) return [];
  const { left, right, top, bottom } = NEW_PICTURE_BAND;
  const bandHeight = bottom - top;
  const gaps = NEW_PICTURE_GAP * (sizes.length - 1);
  // Each picture's width, as a percentage of the card's, at the band's full height
  const fullWidths = sizes.map(({ width, height }) => {
    const aspect = Math.min(8, Math.max(1 / 8, width / Math.max(1, height)));
    return bandHeight * aspect / STANDARD_CARD_RATIO;
  });
  const fullRow = fullWidths.reduce((sum, width) => sum + width, 0);

  // Stretches of the band that no picture already covers
  const taken = existing
    .filter((frame) => frame.y < bottom && frame.y + frame.height > top)
    .map((frame) => [frame.x - NEW_PICTURE_GAP, frame.x + frame.width + NEW_PICTURE_GAP])
    .sort((a, b) => a[0] - b[0]);
  const free: Array<[number, number]> = [];
  let cursor = left;
  for (const [start, end] of taken) {
    if (start > cursor) free.push([cursor, Math.min(start, right)]);
    cursor = Math.max(cursor, end);
  }
  if (cursor < right) free.push([cursor, right]);
  let best: { start: number; end: number; scale: number } | null = null;
  for (const [start, end] of free) {
    const scale = Math.min(1, (end - start - gaps) / fullRow);
    // A tie goes to the later stretch, so pictures read left to right
    if (!best || scale >= best.scale) best = { start, end, scale };
  }

  const beside = best && best.scale >= MIN_BESIDE_SCALE ? best : null;
  const start = beside ? beside.start : left;
  const end = beside ? beside.end : right;
  const scale = beside ? beside.scale : Math.min(1, (right - left - gaps) / fullRow);
  const nudge = beside ? 0 : (existing.length % 4) * 3;
  const height = bandHeight * scale;
  const widths = fullWidths.map((width) => width * scale);
  const rowWidth = widths.reduce((sum, width) => sum + width, 0) + gaps;
  let x = start + (end - start - rowWidth) / 2 + nudge;
  const y = top + (bandHeight - height) / 2 + nudge;
  return widths.map((width) => {
    const frame = { x: round(Math.min(x, 100 - width)), y: round(y), width: round(width), height: round(height) };
    x += width + NEW_PICTURE_GAP;
    return frame;
  });
}

/** A picture ready to go on a card, in its frame, above everything already there. */
export const newStandardCardImage = (src: string, frame: PictureFrame, zIndex: number): StandardCardImage => ({
  id: crypto.randomUUID(),
  src,
  ...frame,
  rotation: 0,
  fit: "contain",
  textFlow: "avoid",
  zIndex,
});

// Uploaded pictures, one folder per user: "<user id>/<random>.<ext>"
const PICTURES_BUCKET = "flashcard-images";

// A signed link to a stored picture lasts an hour and is reused until five
// minutes before it runs out. A picture shown again (the next card in the
// deck, every frame of a drag in the editor) keeps the same address, so it
// comes from the browser's cache instead of downloading and flickering again.
// Links asked for together are signed in one request.
const SIGNED_URL_SECONDS = 60 * 60;
const SIGNED_URL_REUSE_MARGIN = 5 * 60 * 1000;
const SIGN_BATCH = 100;

interface Waiting {
  resolve: (url: string) => void;
  reject: (error: unknown) => void;
}

const signedUrls = new Map<string, { url: string; expiresAt: number }>();
let signQueue: Map<string, Waiting[]> | null = null;

// Another account's links shouldn't outlive it in this tab
supabase.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_OUT" || event === "SIGNED_IN") signedUrls.clear();
});

async function signQueuedPaths() {
  const queue = signQueue;
  signQueue = null;
  if (!queue) return;
  const paths = [...queue.keys()];
  for (let start = 0; start < paths.length; start += SIGN_BATCH) {
    const batch = paths.slice(start, start + SIGN_BATCH);
    const expiresAt = Date.now() + SIGNED_URL_SECONDS * 1000;
    try {
      const { data, error } = await supabase.storage.from(PICTURES_BUCKET).createSignedUrls(batch, SIGNED_URL_SECONDS);
      if (error) throw error;
      const signed = new Map((data ?? []).map((item) => [item.path, item]));
      for (const path of batch) {
        const item = signed.get(path);
        const url = item?.error ? null : item?.signedUrl;
        const waiting = queue.get(path) ?? [];
        if (url) {
          signedUrls.set(path, { url, expiresAt });
          waiting.forEach(({ resolve }) => resolve(url));
        } else {
          const failure = new Error(item?.error || `Couldn't open the picture ${path}`);
          waiting.forEach(({ reject }) => reject(failure));
        }
      }
    } catch (error) {
      batch.forEach((path) => (queue.get(path) ?? []).forEach(({ reject }) => reject(error)));
    }
  }
}

function signedUrlFor(path: string): Promise<string> {
  const cached = signedUrls.get(path);
  if (cached && cached.expiresAt - SIGNED_URL_REUSE_MARGIN > Date.now()) return Promise.resolve(cached.url);
  return new Promise((resolve, reject) => {
    if (!signQueue) {
      signQueue = new Map();
      setTimeout(() => void signQueuedPaths(), 0);
    }
    const waiting = signQueue.get(path);
    if (waiting) waiting.push({ resolve, reject });
    else signQueue.set(path, [{ resolve, reject }]);
  });
}

export async function resolveStandardImageSource(source: string) {
  if (!isStorageImage(source)) return source;
  return signedUrlFor(storagePathFromSource(source));
}

// Copy one stored picture into the user's own folder. Null if it can't be read.
async function copyStandardCardImage(path: string, userId: string): Promise<string | null> {
  const extension = (path.split(".").pop() || "jpg").replace(/[^a-z0-9]/gi, "").slice(0, 8) || "jpg";
  const target = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(PICTURES_BUCKET).copy(path, target);
  if (error) {
    console.warn(`Couldn't copy picture ${path}:`, error.message);
    return null;
  }
  return `storage:${target}`;
}

/**
 * A copy of someone else's card still shows their uploaded pictures from their
 * storage, readable only while they share it. This copies each such picture
 * into `userId`'s own folder and returns the card's interactive_data pointing
 * at the copies, or null when nothing needed copying. Pass the same `copies`
 * for every card of one set, so a picture used on several cards is copied
 * once. A picture that can't be copied keeps its old source.
 */
export async function copyForeignStandardCardImages(
  interactiveData: unknown,
  userId: string,
  copies: Map<string, Promise<string | null>>,
): Promise<object | null> {
  const layout = getStandardCardLayout(interactiveData);
  let changed = false;

  const ownCopy = async (image: StandardCardImage): Promise<StandardCardImage> => {
    const path = isStorageImage(image.src) ? storagePathFromSource(image.src) : null;
    if (!path || path.startsWith(`${userId}/`)) return image;
    if (!copies.has(path)) copies.set(path, copyStandardCardImage(path, userId));
    const copied = await copies.get(path);
    if (!copied) return image;
    changed = true;
    return { ...image, src: copied };
  };

  const front = await Promise.all(layout.front.map(ownCopy));
  const back = await Promise.all(layout.back.map(ownCopy));
  return changed ? withStandardCardLayout(interactiveData, { version: 1, front, back }) : null;
}

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

/**
 * Every picture the user has uploaded, as data URLs keyed by storage path
 * ("<user id>/<file>", as cards refer to them after "storage:"). For the data
 * export.
 */
export async function exportOwnStandardCardImages(userId: string): Promise<Record<string, string>> {
  const bucket = supabase.storage.from(PICTURES_BUCKET);
  const pictures: Record<string, string> = {};
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data: objects, error } = await bucket.list(userId, { limit: pageSize, offset });
    if (error) throw error;
    // Folders list with no id; uploads sit straight in the user's folder
    for (const object of objects.filter((o) => o.id)) {
      const path = `${userId}/${object.name}`;
      const { data: blob, error: downloadError } = await bucket.download(path);
      if (downloadError) throw downloadError;
      pictures[path] = await blobToDataUrl(blob);
    }
    if (objects.length < pageSize) return pictures;
  }
}

/** The signed-in user, whose folder new pictures go in. */
export async function currentPictureOwner(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) throw new Error("Sign in to add pictures");
  return userId;
}

/** Store a prepared picture in the user's folder, and return the source a card refers to it by. */
export async function uploadStandardCardPicture(picture: PreparedPicture, userId: string) {
  const path = `${userId}/${crypto.randomUUID()}.${picture.extension}`;
  const { error } = await supabase.storage.from(PICTURES_BUCKET).upload(path, picture.blob, {
    contentType: picture.blob.type || "application/octet-stream",
    // Every upload gets a new name, so a stored picture never changes
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw error;
  return `storage:${path}`;
}
