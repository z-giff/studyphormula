import { supabase } from "@/integrations/supabase/client";

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

export const emptyStandardCardLayout = (): StandardCardLayout => ({ version: 1, front: [], back: [] });

const clamp = (value: unknown, min: number, max: number, fallback: number) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};

const parseImage = (value: unknown, index: number): StandardCardImage | null => {
  if (!value || typeof value !== "object") return null;
  const image = value as Partial<StandardCardImage>;
  if (typeof image.src !== "string" || !image.src.trim()) return null;
  return {
    id: typeof image.id === "string" ? image.id : `image-${index}`,
    src: image.src.trim().slice(0, 4096),
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

export const getStandardCardLayout = (interactiveData: unknown, legacyImageUrl?: string | null): StandardCardLayout => {
  const raw = interactiveData && typeof interactiveData === "object" ? interactiveData as any : {};
  const layout = raw.standardLayout;
  if (layout?.version === 1) {
    return {
      version: 1,
      front: Array.isArray(layout.front) ? layout.front.map(parseImage).filter(Boolean) as StandardCardImage[] : [],
      back: Array.isArray(layout.back) ? layout.back.map(parseImage).filter(Boolean) as StandardCardImage[] : [],
    };
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

export const isStorageImage = (source: string) => source.startsWith("storage:");
export const storagePathFromSource = (source: string) => source.slice("storage:".length);

// Uploaded pictures, one folder per user: "<user id>/<random>.<ext>"
const PICTURES_BUCKET = "flashcard-images";

export async function resolveStandardImageSource(source: string) {
  if (!isStorageImage(source)) return source;
  const { data, error } = await supabase.storage.from(PICTURES_BUCKET).createSignedUrl(storagePathFromSource(source), 3600);
  if (error) throw error;
  return data.signedUrl;
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

export async function uploadStandardCardImage(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Only image files can be added");
  if (file.size > 10 * 1024 * 1024) throw new Error("Each image must be smaller than 10 MB");
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error("Sign in to upload pictures");
  const extension = (file.name.split(".").pop() || "jpg").replace(/[^a-z0-9]/gi, "").slice(0, 8) || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(PICTURES_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return `storage:${path}`;
}
