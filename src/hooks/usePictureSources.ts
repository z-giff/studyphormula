import { useEffect, useState } from "react";
import { resolveStandardImageSource, type StandardCardImage } from "@/lib/standardCardLayout";

/**
 * Signed addresses for a card's stored pictures, by source. A picture that
 * can't be opened (deleted, no longer shared) is left out, and the rest still show.
 */
export function usePictureSources(images: StandardCardImage[]) {
  const key = [...new Set(images.map((image) => image.src))].join("\n");
  const [sources, setSources] = useState<Record<string, string>>({});
  useEffect(() => {
    let active = true;
    const wanted = key ? key.split("\n") : [];
    Promise.allSettled(wanted.map((src) => resolveStandardImageSource(src))).then((results) => {
      if (!active) return;
      setSources(Object.fromEntries(results.flatMap((result, index) =>
        result.status === "fulfilled" ? [[wanted[index], result.value]] : [])));
    });
    return () => {
      active = false;
    };
  }, [key]);
  return sources;
}
