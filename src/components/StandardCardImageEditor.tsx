import { useEffect, useMemo, useRef, useState, type Dispatch, type DragEvent as ReactDragEvent, type SetStateAction } from "react";
import Moveable from "react-moveable";
import { AlertCircle, ArrowDown, ArrowUp, Clipboard, Copy, ImageOff, ImagePlus, Link, Loader2, RotateCw, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { PictureFileError, pictureNameFromLink, picturesFromClipboard, preparePicture, type PreparedPicture } from "@/lib/pictureFiles";
import {
  MAX_PICTURES_PER_SIDE,
  currentPictureOwner,
  frameNewPictures,
  isInlinePicture,
  newStandardCardImage,
  replacePictureSource,
  resolveStandardImageSource,
  topZIndex,
  uploadStandardCardPicture,
  type PictureFrame,
  type PictureSize,
  type StandardCardImage,
  type StandardCardLayout,
  type StandardCardSide,
} from "@/lib/standardCardLayout";

interface Props {
  term: string;
  definition: string;
  color: string;
  layout: StandardCardLayout;
  /**
   * Gets a new layout, or an update to apply to the latest one: an upload
   * that finishes later must not undo what was changed while it ran.
   */
  onChange: Dispatch<SetStateAction<StandardCardLayout>>;
  disabled?: boolean;
  /** True while pictures are still uploading; saving then would leave them off the card. */
  onBusyChange?: (busy: boolean) => void;
}

interface PendingUpload {
  id: string;
  side: StandardCardSide;
  name: string;
  picture: PreparedPicture;
  /** The prepared picture from this browser, shown until the stored one is signed. */
  preview: string;
  frame: PictureFrame;
}

interface Problem {
  id: string;
  message: string;
  /** A picture that didn't upload, kept so it can be tried again. */
  retry?: Omit<PendingUpload, "id" | "frame">;
}

interface IncomingPicture {
  blob: Blob;
  name: string;
}

const PARALLEL_UPLOADS = 3;
const PASTE_KEYS = typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent) ? "⌘V" : "Ctrl+V";

const isTypingTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target instanceof HTMLTextAreaElement) return true;
  return target instanceof HTMLInputElement && !["button", "checkbox", "color", "file", "radio", "range", "reset", "submit"].includes(target.type);
};

const draggedTypes = (event: DragEvent | ReactDragEvent) => Array.from(event.dataTransfer?.types ?? []);
const isPictureDrag = (event: DragEvent | ReactDragEvent) => {
  const types = draggedTypes(event);
  return types.includes("Files") || types.includes("text/uri-list");
};

const failureReason = (error: unknown) => {
  const message = error instanceof Error ? error.message : "";
  if (!navigator.onLine || /failed to fetch|network|load failed/i.test(message)) return "The connection dropped.";
  if (/too large|maximum allowed size|exceeded/i.test(message)) return "It's too large for storage.";
  if (/mime|content.?type/i.test(message)) return "Storage won't take this kind of file.";
  return message ? `${message}.` : "Something went wrong.";
};

// Ask the site for the linked picture, so Phormula can keep its own copy.
// Null when the site doesn't allow other sites to read its pictures.
async function fetchLinkedPicture(link: string): Promise<Blob | null> {
  try {
    const response = await fetch(link, { mode: "cors", credentials: "omit", referrerPolicy: "no-referrer" });
    if (!response.ok) return null;
    const blob = await response.blob();
    return blob.type === "" || blob.type.startsWith("image/") ? blob : null;
  } catch {
    return null;
  }
}

const measureLinkedPicture = (link: string) =>
  new Promise<PictureSize>((resolve, reject) => {
    const image = new Image();
    image.referrerPolicy = "no-referrer";
    image.onload = () => image.naturalWidth && image.naturalHeight
      ? resolve({ width: image.naturalWidth, height: image.naturalHeight })
      : reject(new Error("No size"));
    image.onerror = () => reject(new Error("Not a picture"));
    image.src = link;
  });

export const StandardCardImageEditor = ({ term, definition, color, layout, onChange, disabled, onBusyChange }: Props) => {
  const [side, setSide] = useState<StandardCardSide>("front");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // What each picture source is shown from: a signed link, or this browser's copy of one just uploaded
  const [sources, setSources] = useState<Record<string, string>>({});
  const [unavailable, setUnavailable] = useState<Record<string, true>>({});
  const [url, setUrl] = useState("");
  const [preparing, setPreparing] = useState(0);
  const [uploads, setUploads] = useState<PendingUpload[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [linking, setLinking] = useState(false);
  const [draggedCount, setDraggedCount] = useState<number | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);
  const previews = useRef(new Set<string>());
  const requested = useRef(new Set<string>());
  const movingInline = useRef(new Set<string>());
  const dragDepth = useRef(0);
  const latest = useRef({ layout, uploads });
  latest.current = { layout, uploads };
  const images = layout[side];
  const selected = images.find((image) => image.id === selectedId) || null;
  const target = selectedId ? document.querySelector(`[data-standard-image="${selectedId}"]`) as HTMLElement | null : null;
  const busy = preparing > 0 || uploads.length > 0;

  useEffect(() => {
    mounted.current = true;
    const urls = previews.current;
    return () => {
      mounted.current = false;
      urls.forEach((preview) => URL.revokeObjectURL(preview));
      urls.clear();
    };
  }, []);

  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);
  useEffect(() => () => onBusyChange?.(false), [onBusyChange]);

  // Sign each stored picture once; the signed links are shared and reused (see standardCardLayout)
  const allSources = useMemo(() => [...new Set([...layout.front, ...layout.back].map((image) => image.src))], [layout]);
  useEffect(() => {
    allSources.filter((src) => !requested.current.has(src)).forEach((src) => {
      requested.current.add(src);
      resolveStandardImageSource(src)
        .then((address) => mounted.current && setSources((current) => current[src] ? current : { ...current, [src]: address }))
        .catch(() => mounted.current && setUnavailable((current) => ({ ...current, [src]: true })));
    });
  }, [allSources]);

  const report = (message: string, retry?: Problem["retry"]) => {
    if (mounted.current) setProblems((current) => [...current, { id: crypto.randomUUID(), message, retry }]);
  };

  const dismiss = (problem: Problem) => {
    setProblems((current) => current.filter((item) => item.id !== problem.id));
    if (problem.retry) {
      URL.revokeObjectURL(problem.retry.preview);
      previews.current.delete(problem.retry.preview);
    }
  };

  const uploadingFrames = (which: StandardCardSide) =>
    latest.current.uploads.filter((upload) => upload.side === which).map((upload) => upload.frame);
  // Where the pictures on a side are, counting ones still uploading
  const framesOn = (which: StandardCardSide): PictureFrame[] => [...latest.current.layout[which], ...uploadingFrames(which)];
  const picturesOn = (which: StandardCardSide) => framesOn(which).length;

  const upload = async (item: PendingUpload, owner: string) => {
    try {
      const src = await uploadStandardCardPicture(item.picture, owner);
      if (mounted.current) {
        requested.current.add(src);
        setSources((current) => ({ ...current, [src]: item.preview }));
      }
      // Still applied if the editor closed meanwhile: the card keeps the picture
      onChange((current) => {
        const onSide = current[item.side];
        return { ...current, [item.side]: [...onSide, newStandardCardImage(src, item.frame, topZIndex(onSide) + 1)] };
      });
    } catch (error) {
      report(`${item.name} didn't upload. ${failureReason(error)}`, { side: item.side, name: item.name, picture: item.picture, preview: item.preview });
    } finally {
      if (mounted.current) setUploads((current) => current.filter((pending) => pending.id !== item.id));
    }
  };

  const uploadAll = async (items: PendingUpload[], owner: string) => {
    let next = 0;
    const worker = async () => {
      while (next < items.length) await upload(items[next++], owner);
    };
    await Promise.all(Array.from({ length: Math.min(PARALLEL_UPLOADS, items.length) }, worker));
  };

  const addPictures = async (incoming: IncomingPicture[]) => {
    if (disabled || !incoming.length) return;
    const onSide = side;
    const room = MAX_PICTURES_PER_SIDE - picturesOn(onSide);
    if (room <= 0) {
      report(`The ${onSide} of a card holds up to ${MAX_PICTURES_PER_SIDE} pictures.`);
      return;
    }
    if (incoming.length > room) {
      report(`Only ${room} of those ${incoming.length} pictures were added: the ${onSide} of a card holds up to ${MAX_PICTURES_PER_SIDE}.`);
    }
    const accepted = incoming.slice(0, room);

    let owner: string;
    try {
      owner = await currentPictureOwner();
    } catch (error) {
      report(error instanceof Error ? error.message : "Sign in to add pictures");
      return;
    }

    setPreparing((count) => count + accepted.length);
    const ready: Array<{ name: string; picture: PreparedPicture }> = [];
    for (const { blob, name } of accepted) {
      try {
        ready.push({ name: name || "The picture", picture: await preparePicture(blob, name) });
      } catch (error) {
        report(error instanceof PictureFileError ? error.message : `${name || "The picture"} couldn't be opened. ${failureReason(error)}`);
      } finally {
        if (mounted.current) setPreparing((count) => count - 1);
      }
    }
    if (!ready.length || !mounted.current) return;

    const frames = frameNewPictures(ready.map(({ picture }) => picture), framesOn(onSide));
    const items = ready.map(({ name, picture }, index): PendingUpload => {
      const preview = URL.createObjectURL(picture.blob);
      previews.current.add(preview);
      return { id: crypto.randomUUID(), side: onSide, name, picture, preview, frame: frames[index] };
    });
    setUploads((current) => [...current, ...items]);
    await uploadAll(items, owner);
  };

  const retry = async (problem: Problem) => {
    const failed = problem.retry;
    if (!failed || disabled) return;
    setProblems((current) => current.filter((item) => item.id !== problem.id));
    let owner: string;
    try {
      owner = await currentPictureOwner();
    } catch (error) {
      report(error instanceof Error ? error.message : "Sign in to add pictures", failed);
      return;
    }
    const [frame] = frameNewPictures([failed.picture], framesOn(failed.side));
    const item: PendingUpload = { ...failed, id: crypto.randomUUID(), frame };
    setUploads((current) => [...current, item]);
    await upload(item, owner);
  };

  // A picture's own address, from a link someone pasted or a picture dragged
  // in from another site. Phormula keeps its own copy when the site allows it;
  // otherwise the card links to the picture where it is.
  const addFromLink = async (raw: string) => {
    const link = raw.trim();
    if (!/^https?:\/\//i.test(link) || disabled) return;
    const onSide = side;
    setLinking(true);
    try {
      const blob = await fetchLinkedPicture(link);
      if (blob) {
        setUrl("");
        await addPictures([{ blob, name: pictureNameFromLink(link) }]);
        return;
      }
      const size = await measureLinkedPicture(link);
      if (picturesOn(onSide) >= MAX_PICTURES_PER_SIDE) {
        report(`The ${onSide} of a card holds up to ${MAX_PICTURES_PER_SIDE} pictures.`);
        return;
      }
      const stillUploading = uploadingFrames(onSide);
      onChange((current) => {
        const onSideImages = current[onSide];
        const [frame] = frameNewPictures([size], [...onSideImages, ...stillUploading]);
        return { ...current, [onSide]: [...onSideImages, newStandardCardImage(link, frame, topZIndex(onSideImages) + 1)] };
      });
      setUrl("");
      toast.warning(`Linked, not copied: ${new URL(link).hostname} doesn't let other sites keep a copy. The picture disappears if it's taken down there, and may be missing from PDF exports.`);
    } catch {
      report("That link doesn't lead to a picture a browser can show. Use the picture's own address (right-click it, then Copy image address).");
    } finally {
      if (mounted.current) setLinking(false);
    }
  };

  const addPicturesNow = useRef(addPictures);
  const addFromLinkNow = useRef(addFromLink);
  useEffect(() => {
    addPicturesNow.current = addPictures;
    addFromLinkNow.current = addFromLink;
  });

  // Paste anywhere while the editor is open. Text copied from Word or
  // PowerPoint carries a picture of itself too: in a text field, that paste
  // stays text.
  useEffect(() => {
    if (disabled) return;
    const onPaste = (event: ClipboardEvent) => {
      const files = picturesFromClipboard(event.clipboardData);
      if (!files.length) return;
      if (isTypingTarget(event.target) && event.clipboardData?.types.includes("text/plain")) return;
      event.preventDefault();
      void addPicturesNow.current(files.map((file) => ({ blob: file, name: /^image\.\w+$/i.test(file.name) ? "The pasted picture" : file.name })));
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [disabled]);

  // A file dropped just outside the drop area would otherwise open in the tab
  // and throw the card away
  useEffect(() => {
    const guard = (event: DragEvent) => {
      if (!draggedTypes(event).includes("Files") || event.defaultPrevented) return;
      event.preventDefault();
      if (event.type === "dragover" && event.dataTransfer) event.dataTransfer.dropEffect = "none";
    };
    window.addEventListener("dragover", guard);
    window.addEventListener("drop", guard);
    return () => {
      window.removeEventListener("dragover", guard);
      window.removeEventListener("drop", guard);
    };
  }, []);

  // Cards made before pictures went to storage kept theirs inside the card, as
  // data: URLs. Opening one here moves them into storage, so the card only
  // carries a reference; if that fails, the picture stays where it is.
  useEffect(() => {
    if (disabled) return;
    const inline = allSources.filter((src) => isInlinePicture(src) && !movingInline.current.has(src));
    if (!inline.length) return;
    inline.forEach((src) => movingInline.current.add(src));
    void (async () => {
      let owner: string;
      try {
        owner = await currentPictureOwner();
      } catch {
        return;
      }
      for (const src of inline) {
        try {
          const blob = await (await fetch(src)).blob();
          const stored = await uploadStandardCardPicture(await preparePicture(blob), owner);
          if (mounted.current) {
            requested.current.add(stored);
            setSources((current) => ({ ...current, [stored]: current[src] ?? src }));
          }
          onChange((current) => replacePictureSource(current, src, stored));
        } catch (error) {
          console.warn("Couldn't move a picture saved inside the card into storage:", error);
        }
      }
    })();
  }, [allSources, disabled, onChange]);

  const pasteFromClipboard = async () => {
    if (!navigator.clipboard?.read) {
      toast.info(`Press ${PASTE_KEYS} to paste a picture`);
      return;
    }
    try {
      const items = await navigator.clipboard.read();
      const pasted: IncomingPicture[] = [];
      for (const item of items) {
        const type = item.types.find((value) => value.startsWith("image/"));
        if (type) pasted.push({ blob: await item.getType(type), name: "The pasted picture" });
      }
      if (pasted.length) await addPictures(pasted);
      else toast.info("There's no picture on the clipboard. Copy one, then paste again.");
    } catch {
      toast.info(`Press ${PASTE_KEYS} to paste a picture`);
    }
  };

  const onDragEnter = (event: ReactDragEvent) => {
    if (!isPictureDrag(event) || disabled) return;
    event.preventDefault();
    dragDepth.current += 1;
    setDraggedCount(Array.from(event.dataTransfer.items ?? []).filter((item) => item.kind === "file").length || 1);
  };
  const onDragOver = (event: ReactDragEvent) => {
    if (!isPictureDrag(event) || disabled) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };
  const onDragLeave = (event: ReactDragEvent) => {
    if (!isPictureDrag(event)) return;
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (!dragDepth.current) setDraggedCount(null);
  };
  const onDrop = (event: ReactDragEvent) => {
    if (!isPictureDrag(event)) return;
    event.preventDefault();
    dragDepth.current = 0;
    setDraggedCount(null);
    if (disabled) return;
    const files = Array.from(event.dataTransfer.files);
    if (files.length) {
      void addPicturesNow.current(files.map((file) => ({ blob: file, name: file.name })));
      return;
    }
    const link = event.dataTransfer.getData("text/uri-list").split(/\r?\n/).find((line) => /^https?:\/\//i.test(line));
    if (link) void addFromLinkNow.current(link);
  };

  const updateSide = (change: (list: StandardCardImage[]) => StandardCardImage[]) =>
    onChange((current) => ({ ...current, [side]: change(current[side]) }));
  const updateSelected = (patch: Partial<StandardCardImage>) => {
    if (!selected) return;
    const id = selected.id;
    updateSide((list) => list.map((image) => image.id === id ? { ...image, ...patch } : image));
  };

  const text = side === "front" ? term : definition;
  const uploadsHere = uploads.filter((item) => item.side === side);
  // Pictures still uploading already push the text aside, so it doesn't jump when they land
  const avoid = [...images.filter((image) => image.textFlow === "avoid"), ...uploadsHere.map((item) => item.frame)];
  const textStyle = avoid.length ? (() => {
    const top = Math.min(...avoid.map((image) => image.y));
    const bottom = 100 - Math.max(...avoid.map((image) => image.y + image.height));
    return top >= bottom ? { left:"6%", right:"6%", top:"5%", height:`${Math.max(18,top-8)}%` } : { left:"6%", right:"6%", bottom:"5%", height:`${Math.max(18,bottom-8)}%` };
  })() : { inset:"8%" };
  const textColor = useMemo(() => {
    const hex = color.replace("#", ""); const r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16);
    return (r*299+g*587+b*114)/1000 > 145 ? "#111827" : "#ffffff";
  }, [color]);
  const uploadingOn = (which: StandardCardSide) => uploads.some((item) => item.side === which);

  return <div className="space-y-3" onDragEnter={onDragEnter} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Tabs value={side} onValueChange={(value) => { setSide(value as StandardCardSide); setSelectedId(null); }}><TabsList>
        <TabsTrigger value="front" className="gap-1.5">Front{uploadingOn("front") && <Loader2 className="h-3 w-3 animate-spin" aria-label="Uploading" />}</TabsTrigger>
        <TabsTrigger value="back" className="gap-1.5">Back{uploadingOn("back") && <Loader2 className="h-3 w-3 animate-spin" aria-label="Uploading" />}</TabsTrigger>
      </TabsList></Tabs>
      <div className="flex gap-2">
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => { const files = Array.from(event.target.files || []); event.target.value = ""; void addPictures(files.map((file) => ({ blob: file, name: file.name }))); }} />
        <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={disabled || preparing > 0}>{preparing > 0 ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}{preparing > 0 ? "Preparing…" : "Add pictures"}</Button>
        <Button type="button" size="icon" variant="outline" aria-label="Paste picture" title={`Paste a picture (${PASTE_KEYS})`} disabled={disabled} onClick={() => void pasteFromClipboard()}><Clipboard className="h-4 w-4" /></Button>
      </div>
    </div>
    {/* Not a <form>: this sits inside the card dialog's form, and Enter here must not save the card */}
    <div className="flex gap-2">
      <Input type="url" value={url} onChange={(event) => setUrl(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void addFromLink(url); } }} maxLength={4096} aria-label="Picture URL" placeholder="https://example.com/image.jpg" disabled={disabled || linking} />
      <Button type="button" variant="secondary" disabled={disabled || linking || !/^https?:\/\//i.test(url.trim())} onClick={() => void addFromLink(url)}>{linking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link className="mr-2 h-4 w-4" />}Add URL</Button>
    </div>
    <div ref={canvasRef} className={cn("relative aspect-[1.75] w-full overflow-hidden rounded-lg border-2 border-border", draggedCount !== null && "border-primary")} style={{ backgroundColor: color }} onPointerDown={(event) => { if (event.target === event.currentTarget) setSelectedId(null); }}>
      <div className="pointer-events-none absolute z-[500] flex items-center justify-center overflow-hidden p-4 text-center text-2xl font-bold" style={{ ...textStyle, color: textColor }}>{text}</div>
      {images.map((image) => unavailable[image.src]
        ? <button key={image.id} type="button" data-standard-image={image.id} onClick={(event) => { event.stopPropagation(); setSelectedId(image.id); }} className={cn("absolute flex flex-col items-center justify-center gap-1 rounded border-2 border-dashed border-black/30 bg-white/40 p-1 text-center text-[11px] font-medium text-black/70", selectedId === image.id && "ring-2 ring-primary ring-offset-2")} style={{ left:`${image.x}%`,top:`${image.y}%`,width:`${image.width}%`,height:`${image.height}%`,transform:`rotate(${image.rotation}deg)`,zIndex:(image.textFlow === "overlap" ? 1000 : 1)+image.zIndex }}><ImageOff className="h-4 w-4" />Picture unavailable</button>
        : <img key={image.id} data-standard-image={image.id} src={sources[image.src] || undefined} alt="" draggable={false} tabIndex={0} onError={() => setUnavailable((current) => ({ ...current, [image.src]: true }))} onClick={(event) => { event.stopPropagation(); setSelectedId(image.id); }} onKeyDown={(event) => { const step=event.shiftKey?5:1; if(event.key.startsWith("Arrow")){event.preventDefault(); updateSelected({x:image.x+(event.key==="ArrowRight"?step:event.key==="ArrowLeft"?-step:0),y:image.y+(event.key==="ArrowDown"?step:event.key==="ArrowUp"?-step:0)});}}} className={cn("absolute cursor-move outline-none", !sources[image.src] && "animate-pulse bg-white/30", selectedId === image.id && "ring-2 ring-primary ring-offset-2")} style={{ left:`${image.x}%`,top:`${image.y}%`,width:`${image.width}%`,height:`${image.height}%`,objectFit:image.fit,transform:`rotate(${image.rotation}deg)`,zIndex:(image.textFlow === "overlap" ? 1000 : 1)+image.zIndex }} />)}
      {uploadsHere.map((item) => <div key={item.id} className="pointer-events-none absolute z-[2000]" style={{ left:`${item.frame.x}%`,top:`${item.frame.y}%`,width:`${item.frame.width}%`,height:`${item.frame.height}%` }}>
        <img src={item.preview} alt="" className="h-full w-full object-contain opacity-50" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded border-2 border-dashed border-white/85">
          <Loader2 className="h-5 w-5 animate-spin text-white drop-shadow" />
          <span className="rounded-full bg-black/65 px-2 py-0.5 text-[11px] font-semibold text-white">Uploading…</span>
        </div>
      </div>)}
      {draggedCount !== null && <div className="pointer-events-none absolute inset-0 z-[3000] flex flex-col items-center justify-center gap-2 bg-black/75 p-4 text-center text-white backdrop-blur-sm">
        <div className="absolute inset-2 rounded-md border-2 border-dashed border-primary" />
        <ImagePlus className="h-7 w-7 text-primary" />
        <p className="text-base font-semibold">Drop to add {draggedCount === 1 ? "a picture" : `${draggedCount} pictures`} to the {side}</p>
      </div>}
      {selected && <div className="absolute left-2 top-2 z-[100] flex flex-wrap gap-1 rounded-md border bg-popover p-1 shadow-lg">
        <Button type="button" size="sm" variant={selected.textFlow === "overlap" ? "secondary" : "ghost"} onClick={() => updateSelected({ textFlow:"overlap" })}>Overlap</Button><Button type="button" size="sm" variant={selected.textFlow === "avoid" ? "secondary" : "ghost"} onClick={() => updateSelected({ textFlow:"avoid" })}>Avoid text</Button>
        <Button type="button" size="icon" variant="ghost" aria-label="Toggle crop" onClick={() => updateSelected({ fit:selected.fit === "contain" ? "cover" : "contain" })}><RotateCw className="h-4 w-4" /></Button>
        <Button type="button" size="icon" variant="ghost" aria-label="Duplicate picture" onClick={() => { const copy={...selected,id:crypto.randomUUID(),x:Math.min(95,selected.x+3),y:Math.min(95,selected.y+3),zIndex:selected.zIndex+1}; updateSide((list) => [...list,copy]); setSelectedId(copy.id); }}><Copy className="h-4 w-4" /></Button>
        <Button type="button" size="icon" variant="ghost" aria-label="Move backward" onClick={() => updateSelected({ zIndex:Math.max(0,selected.zIndex-1) })}><ArrowDown className="h-4 w-4" /></Button><Button type="button" size="icon" variant="ghost" aria-label="Move forward" onClick={() => updateSelected({ zIndex:selected.zIndex+1 })}><ArrowUp className="h-4 w-4" /></Button><Button type="button" size="icon" variant="ghost" aria-label="Remove picture" onClick={() => { const id = selected.id; updateSide((list) => list.filter((image)=>image.id!==id)); setSelectedId(null); }}><Trash2 className="h-4 w-4" /></Button>
      </div>}
      {selected && target && canvasRef.current && <Moveable target={target} container={canvasRef.current} draggable resizable rotatable keepRatio={false} bounds={{left:0,top:0,right:canvasRef.current.clientWidth,bottom:canvasRef.current.clientHeight}} onDrag={({left,top})=>{const canvas=canvasRef.current;if(canvas)updateSelected({x:left/canvas.clientWidth*100,y:top/canvas.clientHeight*100});}} onResize={({width,height,drag})=>{const canvas=canvasRef.current;if(canvas)updateSelected({width:width/canvas.clientWidth*100,height:height/canvas.clientHeight*100,x:drag.left/canvas.clientWidth*100,y:drag.top/canvas.clientHeight*100});}} onRotate={({rotation})=>updateSelected({rotation})} />}
    </div>
    <p className="text-xs text-muted-foreground">Drop pictures on the card, or paste one with {PASTE_KEYS}. Up to {MAX_PICTURES_PER_SIDE} on each side.</p>
    {problems.length > 0 && <ul className="space-y-2" aria-live="polite">
      {problems.map((problem) => <li key={problem.id} className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
        <span className="flex-1">{problem.message}</span>
        {problem.retry && <Button type="button" size="sm" variant="outline" className="h-7 px-2" disabled={disabled} onClick={() => void retry(problem)}>Retry</Button>}
        <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label="Dismiss" onClick={() => dismiss(problem)}><X className="h-4 w-4" /></Button>
      </li>)}
    </ul>}
  </div>;
};
