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

export async function resolveStandardImageSource(source: string) {
  if (!isStorageImage(source)) return source;
  const { data, error } = await supabase.storage.from("flashcard-images").createSignedUrl(storagePathFromSource(source), 3600);
  if (error) throw error;
  return data.signedUrl;
}

export async function uploadStandardCardImage(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Only image files can be added");
  if (file.size > 10 * 1024 * 1024) throw new Error("Each image must be smaller than 10 MB");
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error("Sign in to upload pictures");
  const extension = (file.name.split(".").pop() || "jpg").replace(/[^a-z0-9]/gi, "").slice(0, 8) || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("flashcard-images").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return `storage:${path}`;
}
