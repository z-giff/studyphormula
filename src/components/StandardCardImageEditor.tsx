import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type DragEvent as ReactDragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction,
} from "react";
import { AlertCircle, Clipboard, Eye, EyeOff, ImageOff, ImagePlus, Link, Loader2, RotateCw, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PictureToolbar } from "@/components/PictureToolbar";
import { StandardCardCanvas } from "@/components/StandardCardCanvas";
import { cn, getContrastColor } from "@/lib/utils";
import { PictureFileError, pictureNameFromLink, picturesFromClipboard, preparePicture, type PreparedPicture } from "@/lib/pictureFiles";
import {
  STANDARD_CARD_RATIO,
  angleFrom,
  arrangeLimits,
  arrangePicture,
  keepClearZone,
  keepOnCard,
  normalizeRotation,
  pictureBounds,
  scaleFromCorner,
  snapMove,
  snapRotation,
  tightFrame,
  type ArrangeMove,
  type SnapGuide,
} from "@/lib/standardCardGeometry";
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
  type StandardTextFlow,
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
  /** Added on its own: select it when it lands, ready to place. */
  selectWhenDone?: boolean;
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

// A drag of a picture, one of its corners or its rotation handle
interface Gesture {
  kind: "move" | "scale" | "rotate";
  side: StandardCardSide;
  start: StandardCardImage;
  card: DOMRect;
  pointerX: number;
  pointerY: number;
  cornerX?: number;
  cornerY?: number;
  centreX?: number;
  centreY?: number;
  startAngle?: number;
  moved: boolean;
  change?: Partial<StandardCardImage>;
}

const SIDES: StandardCardSide[] = ["front", "back"];
const PARALLEL_UPLOADS = 3;
const IS_MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent);
const PASTE_KEYS = IS_MAC ? "⌘V" : "Ctrl+V";
// Narrower than this, the toolbar sits under the card instead of floating over it
const FLOATING_TOOLBAR_MIN_WIDTH = 480;
const TOOLBAR_HEIGHT = 44;
const TOOLBAR_GAP = 14;
// Arrow keys move a picture this far (Shift: further), as a percentage of the card's width
const NUDGE = 0.5;
const BIG_NUDGE = 2;
const CORNERS = [[-1, -1, "nwse-resize", "nw"], [1, -1, "nesw-resize", "ne"], [-1, 1, "nesw-resize", "sw"], [1, 1, "nwse-resize", "se"]] as const;

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

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const FLOW_WORDS: Record<StandardTextFlow, string> = { avoid: "keeping the text clear", overlap: "over the text", behind: "behind the text" };

const pictureLabel = (image: StandardCardImage, index: number, count: number) =>
  `Picture ${index + 1} of ${count}, ${FLOW_WORDS[image.textFlow]}. Arrow keys move it, plus and minus resize it, Delete removes it.`;

/**
 * The regular-card editor: the card's two sides as folder tabs, each drawn
 * exactly as it will be studied, with pictures placed, sized and turned on
 * the card itself. The selected picture gets handles, a rotation handle and a
 * toolbar beside it for how the text flows around it and its layer.
 */
export const StandardCardImageEditor = ({ term, definition, color, layout, onChange, disabled, onBusyChange }: Props) => {
  const stageId = useId();
  const [side, setSide] = useState<StandardCardSide>("front");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  // What each picture source is shown from: a signed link, or this browser's copy of one just uploaded
  const [sources, setSources] = useState<Record<string, string>>({});
  const [unavailable, setUnavailable] = useState<Record<string, true>>({});
  const [preparing, setPreparing] = useState(0);
  const [uploads, setUploads] = useState<PendingUpload[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState("");
  const [linking, setLinking] = useState(false);
  const [draggedCount, setDraggedCount] = useState<number | null>(null);
  // The picture being dragged, resized or turned, until it's let go
  const [draft, setDraft] = useState<{ id: string; change: Partial<StandardCardImage> } | null>(null);
  const [guides, setGuides] = useState<SnapGuide[]>([]);
  const [gestureKind, setGestureKind] = useState<Gesture["kind"] | null>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [toolbarWidth, setToolbarWidth] = useState(470);
  const stageRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const mounted = useRef(true);
  const previews = useRef(new Set<string>());
  const requested = useRef(new Set<string>());
  const movingInline = useRef(new Set<string>());
  const tightened = useRef(new Set<string>());
  const naturalSizes = useRef(new Map<string, PictureSize>());
  const dragDepth = useRef(0);
  const latest = useRef({ layout, uploads });
  latest.current = { layout, uploads };

  const textColor = useMemo(() => getContrastColor(color), [color]);
  const stored = layout[side];
  const images = useMemo(
    () => draft ? stored.map((image) => image.id === draft.id ? { ...image, ...draft.change } : image) : stored,
    [stored, draft],
  );
  const selected = preview ? null : images.find((image) => image.id === selectedId) ?? null;
  const limits = selected ? arrangeLimits(stored, selected.id) : { atFront: true, atBack: true };
  const uploadsHere = useMemo(() => uploads.filter((upload) => upload.side === side), [uploads, side]);
  const pendingFrames = useMemo(() => uploadsHere.map((upload) => upload.frame), [uploadsHere]);
  // A narrow card (a phone) gets the toolbar under it, and shorter tabs so the editor fits
  const docked = stageSize.width > 0 && stageSize.width < FLOATING_TOOLBAR_MIN_WIDTH;
  const busy = preparing > 0 || uploads.length > 0;
  const text = side === "front" ? term : definition;

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

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => setStageSize({ width: stage.clientWidth, height: stage.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (toolbarRef.current) setToolbarWidth(toolbarRef.current.offsetWidth);
  }, [selected?.id, selected?.fit, docked]);

  // A picture that goes missing (deleted elsewhere, the other side shown) is no longer selected
  useEffect(() => {
    if (selectedId && !stored.some((image) => image.id === selectedId)) setSelectedId(null);
  }, [stored, selectedId]);

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

  // Changes to one picture, applied to the latest layout
  const updatePicture = (where: StandardCardSide, id: string, change: Partial<StandardCardImage>) =>
    onChange((current) => ({ ...current, [where]: current[where].map((image) => image.id === id ? { ...image, ...change } : image) }));

  const uploadingFrames = (which: StandardCardSide) =>
    latest.current.uploads.filter((upload) => upload.side === which).map((upload) => upload.frame);
  // Where the pictures on a side are, counting ones still uploading
  const framesOn = (which: StandardCardSide): PictureFrame[] => [...latest.current.layout[which], ...uploadingFrames(which)];
  const picturesOn = (which: StandardCardSide) => framesOn(which).length;
  const sideIsFull = (which: StandardCardSide) => {
    if (picturesOn(which) < MAX_PICTURES_PER_SIDE) return false;
    report(`The ${which} of a card holds up to ${MAX_PICTURES_PER_SIDE} pictures.`);
    return true;
  };

  const upload = async (item: PendingUpload, owner: string) => {
    try {
      const src = await uploadStandardCardPicture(item.picture, owner);
      const image = newStandardCardImage(src, item.frame, 0);
      if (mounted.current) {
        requested.current.add(src);
        setSources((current) => ({ ...current, [src]: item.preview }));
        if (item.selectWhenDone) setSelectedId((current) => current ?? image.id);
      }
      // Still applied if the editor closed meanwhile: the card keeps the picture
      onChange((current) => {
        const onSide = current[item.side];
        return { ...current, [item.side]: [...onSide, { ...image, zIndex: topZIndex(onSide) + 1 }] };
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

    setPreview(false);
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
      return { id: crypto.randomUUID(), side: onSide, name, picture, preview, frame: frames[index], selectWhenDone: ready.length === 1 };
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

  // A picture's own address, from the link field or a picture dragged in from
  // another site. Phormula keeps its own copy when the site allows it;
  // otherwise the card links to the picture where it is.
  const addFromLink = async (raw: string) => {
    const address = raw.trim();
    if (!/^https?:\/\//i.test(address) || disabled) return;
    const onSide = side;
    setLinking(true);
    try {
      const blob = await fetchLinkedPicture(address);
      if (blob) {
        setLink("");
        setLinkOpen(false);
        await addPictures([{ blob, name: pictureNameFromLink(address) }]);
        return;
      }
      const size = await measureLinkedPicture(address);
      if (sideIsFull(onSide)) return;
      const stillUploading = uploadingFrames(onSide);
      const image = newStandardCardImage(address, frameNewPictures([size], [...latest.current.layout[onSide], ...stillUploading])[0], 0);
      onChange((current) => {
        const onSideImages = current[onSide];
        return { ...current, [onSide]: [...onSideImages, { ...image, zIndex: topZIndex(onSideImages) + 1 }] };
      });
      setSelectedId(image.id);
      setLink("");
      setLinkOpen(false);
      toast.warning(`Linked, not copied: ${new URL(address).hostname} doesn't let other sites keep a copy. The picture disappears if it's taken down there, and may be missing from PDF exports.`);
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
          const storedSrc = await uploadStandardCardPicture(await preparePicture(blob), owner);
          if (mounted.current) {
            requested.current.add(storedSrc);
            setSources((current) => ({ ...current, [storedSrc]: current[src] ?? src }));
          }
          onChange((current) => replacePictureSource(current, src, storedSrc));
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
    const address = event.dataTransfer.getData("text/uri-list").split(/\r?\n/).find((line) => /^https?:\/\//i.test(line));
    if (address) void addFromLinkNow.current(address);
  };

  // Dragging a picture, a corner or the rotation handle. The change shows as
  // a draft while dragging and is saved once, when the pointer lets go.
  const beginGesture = (event: ReactPointerEvent<HTMLElement>, next: Pick<Gesture, "kind" | "start" | "cornerX" | "cornerY" | "centreX" | "centreY" | "startAngle">) => {
    const card = stageRef.current?.getBoundingClientRect();
    if (!card) return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // A touch already captures its own target
    }
    gesture.current = { ...next, side, card, pointerX: event.clientX, pointerY: event.clientY, moved: false };
  };

  const startMove = (image: StandardCardImage, event: ReactPointerEvent<HTMLElement>) => {
    if (preview || disabled || event.button !== 0) return;
    setSelectedId(image.id);
    beginGesture(event, { kind: "move", start: image });
  };

  const startScale = (cornerX: number, cornerY: number, event: ReactPointerEvent<HTMLElement>) => {
    if (!selected || disabled || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    beginGesture(event, { kind: "scale", start: selected, cornerX, cornerY });
  };

  const startRotate = (event: ReactPointerEvent<HTMLElement>) => {
    const card = stageRef.current?.getBoundingClientRect();
    if (!selected || !card || disabled || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const centreX = card.left + (selected.x + selected.width / 2) / 100 * card.width;
    const centreY = card.top + (selected.y + selected.height / 2) / 100 * card.height;
    beginGesture(event, { kind: "rotate", start: selected, centreX, centreY, startAngle: angleFrom(centreX, centreY, event.clientX, event.clientY) });
    setGestureKind("rotate");
  };

  const moveGesture = (event: ReactPointerEvent<HTMLElement>) => {
    const current = gesture.current;
    if (!current) return;
    let change: Partial<StandardCardImage>;
    if (current.kind === "move") {
      const dx = event.clientX - current.pointerX;
      const dy = event.clientY - current.pointerY;
      if (!current.moved && Math.hypot(dx, dy) < 3) return;
      const x = current.start.x + dx / current.card.width * 100;
      const y = current.start.y + dy / current.card.height * 100;
      const others = latest.current.layout[current.side].filter((image) => image.id !== current.start.id);
      // Alt (Option) turns snapping off
      const snapped = event.altKey ? { x, y, guides: [] } : snapMove({ ...current.start, x, y }, others);
      change = keepOnCard(current.start, snapped.x, snapped.y);
      setGuides(snapped.guides);
    } else if (current.kind === "scale") {
      change = scaleFromCorner(current.start, current.card, current.cornerX ?? 1, current.cornerY ?? 1, event.clientX, event.clientY);
    } else {
      const angle = angleFrom(current.centreX ?? 0, current.centreY ?? 0, event.clientX, event.clientY);
      // Shift turns freely; otherwise it snaps to every 15°
      change = { rotation: snapRotation(current.start.rotation + angle - (current.startAngle ?? 0), event.shiftKey) };
    }
    current.moved = true;
    current.change = change;
    setDraft({ id: current.start.id, change });
    setGestureKind(current.kind);
  };

  const endGesture = () => {
    const current = gesture.current;
    if (!current) return;
    gesture.current = null;
    if (current.moved && current.change) updatePicture(current.side, current.start.id, current.change);
    setDraft(null);
    setGuides([]);
    setGestureKind(null);
  };

  const gestureHandlers = { onPointerMove: moveGesture, onPointerUp: endGesture, onPointerCancel: endGesture, onLostPointerCapture: endGesture };

  const arrange = (id: string, move: ArrangeMove) => {
    const where = side;
    onChange((current) => ({ ...current, [where]: arrangePicture(current[where], id, move) }));
  };

  const removePicture = (id: string) => {
    const where = side;
    onChange((current) => ({ ...current, [where]: current[where].filter((image) => image.id !== id) }));
    setSelectedId(null);
    // Keep the keyboard in the editor when the focused picture or toolbar goes
    const focused = document.activeElement;
    if (focused && (stageRef.current?.contains(focused) || toolbarRef.current?.contains(focused))) document.getElementById(`${stageId}-${where}`)?.focus();
  };

  const duplicate = (picture: StandardCardImage) => {
    if (sideIsFull(side)) return;
    const where = side;
    const id = crypto.randomUUID();
    const nudged = keepOnCard(picture, picture.x + 3, picture.y + 3 * STANDARD_CARD_RATIO);
    onChange((current) => ({ ...current, [where]: [...current[where], { ...picture, ...nudged, id, zIndex: topZIndex(current[where]) + 1 }] }));
    setSelectedId(id);
  };

  const moveToOtherSide = (picture: StandardCardImage) => {
    const from = side;
    const to: StandardCardSide = from === "front" ? "back" : "front";
    if (sideIsFull(to)) return;
    onChange((current) => {
      const moving = current[from].find((image) => image.id === picture.id);
      if (!moving) return current;
      return {
        ...current,
        [from]: current[from].filter((image) => image.id !== picture.id),
        [to]: [...current[to], { ...moving, zIndex: topZIndex(current[to]) + 1 }],
      };
    });
    setSide(to);
    setSelectedId(picture.id);
  };

  const uncrop = (picture: StandardCardImage) => {
    const size = naturalSizes.current.get(picture.src);
    const tight = size ? tightFrame(picture, size.width, size.height) : null;
    updatePicture(side, picture.id, { fit: "contain", ...(tight ?? {}) });
  };

  // Resize from the keyboard, around the picture's centre
  const resizeBy = (picture: StandardCardImage, factor: number) => {
    const scale = clamp(factor, Math.max(6 / picture.width, 6 / picture.height), Math.min(100 / picture.width, 100 / picture.height));
    const width = picture.width * scale;
    const height = picture.height * scale;
    updatePicture(side, picture.id, {
      ...keepOnCard({ ...picture, width, height }, picture.x + (picture.width - width) / 2, picture.y + (picture.height - height) / 2),
      width: Math.round(width * 100) / 100,
      height: Math.round(height * 100) / 100,
    });
  };

  const onPictureKey = (image: StandardCardImage, event: ReactKeyboardEvent<HTMLElement>) => {
    if (preview || disabled) return;
    if ((event.metaKey || event.ctrlKey) && (event.code === "BracketRight" || event.code === "BracketLeft")) {
      event.preventDefault();
      const forward = event.code === "BracketRight";
      arrange(image.id, forward ? (event.shiftKey ? "front" : "forward") : (event.shiftKey ? "back" : "backward"));
      return;
    }
    const step = event.shiftKey ? BIG_NUDGE : NUDGE;
    const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
    const dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
    if (dx || dy) {
      event.preventDefault();
      updatePicture(side, image.id, keepOnCard(image, image.x + dx, image.y + dy * STANDARD_CARD_RATIO));
    } else if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      removePicture(image.id);
    } else if (event.key === "+" || event.key === "=" || event.key === "-") {
      event.preventDefault();
      resizeBy(image, event.key === "-" ? 1 / 1.1 : 1.1);
    }
  };

  // Once a contained picture has loaded, its frame shrinks to the picture, so
  // the handles sit on its edges and the text can come right up to it
  const pictureLoaded = (image: StandardCardImage, element: HTMLImageElement) => {
    const size = { width: element.naturalWidth, height: element.naturalHeight };
    naturalSizes.current.set(image.src, size);
    if (disabled || image.fit !== "contain" || tightened.current.has(image.id)) return;
    tightened.current.add(image.id);
    if (!tightFrame(image, size.width, size.height)) return;
    const where = side;
    onChange((current) => ({
      ...current,
      [where]: current[where].map((item) => item.id === image.id && item.fit === "contain" ? { ...item, ...(tightFrame(item, size.width, size.height) ?? {}) } : item),
    }));
  };

  const showSide = (which: StandardCardSide) => {
    setSide(which);
    setSelectedId(null);
  };

  const onTabKey = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next = side === "front" ? "back" : "front";
    showSide(next);
    document.getElementById(`${stageId}-${next}`)?.focus();
  };

  // Where the toolbar floats: above the picture if there's room, else below
  // it; the rotation handle goes on the other side, clear of it
  let toolbarStyle: CSSProperties | undefined;
  let handleBelow = true;
  if (selected && stageSize.width) {
    const bounds = pictureBounds(selected);
    const top = bounds.top / 100 * stageSize.height;
    const bottom = bounds.bottom / 100 * stageSize.height;
    if (docked) handleBelow = top < 48;
    else {
      let y: number;
      if (top >= TOOLBAR_HEIGHT + TOOLBAR_GAP + 2) {
        y = top - TOOLBAR_HEIGHT - TOOLBAR_GAP;
        handleBelow = true;
      } else if (bottom + TOOLBAR_GAP + TOOLBAR_HEIGHT <= stageSize.height + 40) {
        y = bottom + TOOLBAR_GAP;
        handleBelow = false;
      } else {
        y = 6;
        handleBelow = true;
      }
      const centre = (bounds.left + bounds.right) / 2 / 100 * stageSize.width;
      toolbarStyle = { left: clamp(centre - toolbarWidth / 2, -8, stageSize.width - toolbarWidth + 8), top: y };
    }
    // Turned past a quarter, the picture's own bottom edge is at the top
    if (Math.abs(selected.rotation) > 90) handleBelow = !handleBelow;
  }

  const toolbar = selected && (
    <PictureToolbar
      ref={toolbarRef}
      picture={selected}
      side={side}
      limits={limits}
      docked={docked}
      className={docked ? undefined : "absolute z-50"}
      style={toolbarStyle}
      onTextFlow={(flow: StandardTextFlow) => updatePicture(side, selected.id, { textFlow: flow })}
      onRotate={() => updatePicture(side, selected.id, { rotation: normalizeRotation(selected.rotation + 90) })}
      onResetRotation={() => updatePicture(side, selected.id, { rotation: 0 })}
      onArrange={(move) => arrange(selected.id, move)}
      onMoveSide={() => moveToOtherSide(selected)}
      onDuplicate={() => duplicate(selected)}
      onUncrop={selected.fit === "cover" ? () => uncrop(selected) : undefined}
      onDelete={() => removePicture(selected.id)}
      onKeyDown={(event) => {
        // Delete and the arrange shortcuts still work after clicking one of
        // its buttons, but not from its menus, whose keys are their own
        if (!event.currentTarget.contains(event.target as Node)) return;
        if (event.key === "Delete" || event.key === "Backspace" || ((event.metaKey || event.ctrlKey) && event.code.startsWith("Bracket"))) onPictureKey(selected, event);
      }}
    />
  );

  const renderPicture = (image: StandardCardImage, style: CSSProperties, src: string | undefined) => {
    const index = images.findIndex((item) => item.id === image.id);
    const common = {
      type: "button" as const,
      disabled,
      "aria-label": pictureLabel(image, index, images.length),
      "aria-pressed": selectedId === image.id && !preview,
      style,
      onPointerDown: (event: ReactPointerEvent<HTMLElement>) => startMove(image, event),
      ...gestureHandlers,
      onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => onPictureKey(image, event),
      onFocus: () => !preview && setSelectedId(image.id),
    };
    if (unavailable[image.src]) {
      return (
        <button {...common} className="flex touch-none select-none flex-col items-center justify-center gap-1 rounded border-2 border-dashed border-black/30 bg-white/40 p-1 text-center text-[11px] font-medium text-black/70 outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <ImageOff className="h-4 w-4" />Picture unavailable
        </button>
      );
    }
    return (
      <button
        {...common}
        className={cn(
          "block touch-none select-none p-0 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          preview ? "cursor-pointer" : "cursor-grab active:cursor-grabbing",
        )}
      >
        {src
          ? <img src={src} alt="" draggable={false} onLoad={(event) => pictureLoaded(image, event.currentTarget)} onError={() => setUnavailable((current) => ({ ...current, [image.src]: true }))} className="pointer-events-none block h-full w-full" style={{ objectFit: image.fit }} />
          : <span className="block h-full w-full animate-pulse rounded bg-white/30" />}
      </button>
    );
  };

  const keepClear = selected?.textFlow === "avoid" ? keepClearZone(selected) : null;

  return <div className="space-y-3" onDragEnter={onDragEnter} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
    <div>
      <div className="flex h-11 items-end justify-between gap-2">
        <div role="tablist" aria-label="Card side" className="flex items-end gap-1" onKeyDown={onTabKey}>
          {SIDES.map((which) => {
            const active = which === side;
            return (
              <button
                key={which}
                id={`${stageId}-${which}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={stageId}
                tabIndex={active ? 0 : -1}
                onClick={() => showSide(which)}
                className={cn(
                  "flex items-center gap-2 rounded-t-xl border border-b-0 px-3.5 text-[13px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "h-11" : "h-[38px] border-line-strong bg-secondary text-muted-foreground hover:text-foreground",
                )}
                style={active ? { backgroundColor: color, borderColor: color, color: textColor } : undefined}
              >
                {which === "front" ? "Front" : "Back"}
                {!docked && <span className="font-medium opacity-70">{which === "front" ? "Term" : "Definition"}</span>}
                <span
                  className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold", !active && "bg-line-strong text-foreground")}
                  style={active ? { backgroundColor: `color-mix(in srgb, ${textColor} 16%, transparent)` } : undefined}
                  aria-label={`${layout[which].length} ${layout[which].length === 1 ? "picture" : "pictures"}`}
                >
                  {layout[which].length}
                </span>
                {uploads.some((item) => item.side === which) && <Loader2 className="h-3 w-3 animate-spin" aria-label="Uploading" />}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 pb-1.5">
          {preview && stageSize.width >= 560 && <span className="text-xs text-muted-foreground">Click the card to flip it</span>}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 gap-1.5 px-2.5 text-[13px]"
            aria-pressed={preview}
            aria-label={docked ? (preview ? "Done previewing" : "Preview") : undefined}
            title={docked ? (preview ? "Done previewing" : "Preview the card") : undefined}
            onClick={() => { setPreview((current) => !current); setSelectedId(null); }}
          >
            {preview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}{!docked && (preview ? "Done" : "Preview")}
          </Button>
        </div>
      </div>

      <div className="relative">
        <StandardCardCanvas
          ref={stageRef}
          id={stageId}
          role="tabpanel"
          aria-labelledby={`${stageId}-${side}`}
          side={side}
          text={text}
          images={images}
          sources={sources}
          textColor={textColor}
          pendingFrames={pendingFrames}
          renderPicture={renderPicture}
          showTextArea={!!selected}
          className={cn("select-none rounded-xl shadow-[0_10px_28px_-12px_rgba(0,0,0,0.7)]", side === "front" && "rounded-tl-none", preview && "cursor-pointer", draggedCount !== null && "ring-2 ring-primary")}
          style={{ backgroundColor: color }}
          onPointerDown={(event) => { if (!preview && event.target === event.currentTarget) setSelectedId(null); }}
          onClick={() => { if (preview) setSide((current) => current === "front" ? "back" : "front"); }}
        >
          {keepClear && (
            <div
              aria-hidden
              className="pointer-events-none absolute rounded-lg border-[1.5px] border-dashed border-white/80 bg-white/15"
              style={{ left: `${keepClear.left}%`, top: `${keepClear.top}%`, width: `${keepClear.right - keepClear.left}%`, height: `${keepClear.bottom - keepClear.top}%`, zIndex: 18 }}
            />
          )}
          {uploadsHere.map((item) => (
            <div key={item.id} className="pointer-events-none absolute z-[45]" style={{ left: `${item.frame.x}%`, top: `${item.frame.y}%`, width: `${item.frame.width}%`, height: `${item.frame.height}%` }}>
              <img src={item.preview} alt="" className="h-full w-full object-contain opacity-50" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded border-2 border-dashed border-white/85">
                <Loader2 className="h-5 w-5 animate-spin text-white drop-shadow" />
                <span className="rounded-full bg-black/65 px-2 py-0.5 text-[11px] font-semibold text-white">Uploading…</span>
              </div>
            </div>
          ))}
          {!preview && !images.length && !uploadsHere.length && draggedCount === null && (
            <div className="pointer-events-none absolute bottom-[5%] left-1/2 z-[45] flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold text-white">
              <ImagePlus className="h-4 w-4" />Drop, paste or upload pictures
            </div>
          )}
          {draggedCount !== null && (
            <div className="pointer-events-none absolute inset-0 z-[60] flex flex-col items-center justify-center gap-2 bg-black/75 p-4 text-center text-white backdrop-blur-sm">
              <div className="absolute inset-2 rounded-md border-2 border-dashed border-primary" />
              <ImagePlus className="h-7 w-7 text-primary" />
              <p className="text-base font-semibold">Drop to add {draggedCount === 1 ? "a picture" : `${draggedCount} pictures`} to the {side}</p>
            </div>
          )}
        </StandardCardCanvas>

        {selected && (
          <div aria-hidden className="pointer-events-none absolute inset-0 z-40">
            {guides.map((guide) => (
              <div
                key={`${guide.axis}-${guide.at}`}
                className="absolute bg-brand-pink shadow-[0_0_0_0.5px_rgba(255,255,255,0.5)]"
                style={guide.axis === "x" ? { left: `${guide.at}%`, top: -10, bottom: -10, width: 1 } : { top: `${guide.at}%`, left: -10, right: -10, height: 1 }}
              />
            ))}
            <div
              className="absolute box-border border-2 border-primary shadow-[0_0_0_1px_rgba(14,11,18,0.35)]"
              style={{ left: `${selected.x}%`, top: `${selected.y}%`, width: `${selected.width}%`, height: `${selected.height}%`, transform: selected.rotation ? `rotate(${selected.rotation}deg)` : undefined }}
            >
              {CORNERS.map(([cornerX, cornerY, cursor, corner]) => (
                <button
                  key={corner}
                  data-handle={corner}
                  type="button"
                  tabIndex={-1}
                  className="pointer-events-auto absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 touch-none rounded-[4px] border-2 border-primary bg-white p-0 shadow-[0_1px_3px_rgba(14,11,18,0.5)] after:absolute after:-inset-2 after:content-[''] [@media(pointer:coarse)]:h-5 [@media(pointer:coarse)]:w-5"
                  style={{ left: cornerX < 0 ? "0%" : "100%", top: cornerY < 0 ? "0%" : "100%", cursor }}
                  onPointerDown={(event) => startScale(cornerX, cornerY, event)}
                  {...gestureHandlers}
                />
              ))}
              <span className="absolute left-1/2 h-4 w-0.5 -translate-x-1/2 bg-primary" style={handleBelow ? { top: "100%" } : { bottom: "100%" }} />
              <button
                data-handle="rotate"
                type="button"
                tabIndex={-1}
                className="pointer-events-auto absolute left-1/2 flex h-7 w-7 -translate-x-1/2 cursor-grab touch-none items-center justify-center rounded-full border-2 border-primary bg-white p-0 text-primary shadow-[0_2px_6px_rgba(14,11,18,0.4)] active:cursor-grabbing [@media(pointer:coarse)]:h-9 [@media(pointer:coarse)]:w-9"
                style={handleBelow ? { top: "calc(100% + 16px)" } : { bottom: "calc(100% + 16px)" }}
                onPointerDown={startRotate}
                {...gestureHandlers}
              >
                <RotateCw className="h-3.5 w-3.5" strokeWidth={2.4} />
              </button>
              {gestureKind === "rotate" && (
                <span
                  className={cn("absolute left-1/2 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold tabular-nums", selected.rotation % 15 === 0 ? "bg-primary text-primary-foreground" : "bg-background text-foreground")}
                  style={{ [handleBelow ? "top" : "bottom"]: "calc(100% + 52px)", transform: `translateX(-50%) rotate(${-selected.rotation}deg)` }}
                >
                  {selected.rotation < 0 ? `−${-selected.rotation}` : selected.rotation}°
                </span>
              )}
            </div>
          </div>
        )}
        {!docked && !gestureKind && toolbar}
      </div>
      {docked && !gestureKind && toolbar && <div className="mt-2">{toolbar}</div>}
    </div>

    <div className="flex flex-wrap items-center gap-2">
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => { const files = Array.from(event.target.files || []); event.target.value = ""; void addPictures(files.map((file) => ({ blob: file, name: file.name }))); }} />
      <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={disabled || preparing > 0}>
        {preparing > 0 ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}{preparing > 0 ? "Preparing…" : "Upload"}
      </Button>
      <Button type="button" size="sm" variant="outline" title={`Paste a picture (${PASTE_KEYS})`} disabled={disabled} onClick={() => void pasteFromClipboard()}>
        <Clipboard className="mr-2 h-4 w-4" />Paste
      </Button>
      <Popover open={linkOpen} onOpenChange={setLinkOpen}>
        <PopoverTrigger asChild>
          <Button type="button" size="sm" variant="outline" disabled={disabled}>
            {linking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link className="mr-2 h-4 w-4" />}Link
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 space-y-2 p-3">
          <Label htmlFor={`${stageId}-link`} className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Picture link</Label>
          <div className="flex gap-2">
            <Input
              id={`${stageId}-link`}
              type="url"
              value={link}
              onChange={(event) => setLink(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void addFromLink(link); } }}
              maxLength={4096}
              placeholder="https://example.com/picture.jpg"
              disabled={linking}
              autoFocus
            />
            <Button type="button" size="sm" className="h-10" disabled={linking || !/^https?:\/\//i.test(link.trim())} onClick={() => void addFromLink(link)}>
              {linking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Use the picture's own address: right-click it, then Copy image address.</p>
        </PopoverContent>
      </Popover>
      <span className="ml-auto text-xs text-muted-foreground">or drop pictures on the card · {PASTE_KEYS} pastes</span>
    </div>

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
