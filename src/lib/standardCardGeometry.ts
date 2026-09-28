import type { PictureFrame, StandardCardImage } from "@/lib/standardCardLayout";

/**
 * The geometry of a regular card's face, shared by the editor, every study
 * view and the PDF so a picture sits in exactly the same place on each.
 *
 * Positions and sizes are percentages of the card: x and width of its width,
 * y and height of its height. A picture rotates clockwise about its centre,
 * as CSS draws it.
 */

/** A card face is this many times as wide as it is tall. */
export const STANDARD_CARD_RATIO = 1.75;

/** Text keeps this far from the card's edges: 4% of the width, and the same distance down the height. */
export const CARD_SAFE_X = 4;
export const CARD_SAFE_Y = CARD_SAFE_X * STANDARD_CARD_RATIO;

// ...and this far from a picture that keeps it clear
const CLEAR_GAP_X = 2.2;
const CLEAR_GAP_Y = CLEAR_GAP_X * STANDARD_CARD_RATIO;

/**
 * Largest text on a card with pictures, as a percentage of the card's width:
 * the size a card without pictures shows on a 576px deck card (24px term,
 * 18px definition). Text only shrinks from there to fit its space.
 */
export const CARD_TEXT_MAX = { front: 24 / 5.76, back: 18 / 5.76 } as const;
export const CARD_TEXT_MIN = 1.5;

/** Layer the text sits on: pictures behind it below, every other picture above. */
export const TEXT_LAYER = 20;

export interface CardRegion {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export type Placement = Pick<StandardCardImage, "x" | "y" | "width" | "height" | "rotation">;

export interface SnapGuide {
  /** A vertical line at `at`% across, or a horizontal one `at`% down */
  axis: "x" | "y";
  at: number;
}

const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round = (value: number) => Math.round(value * 100) / 100;

/** The box a picture covers once rotated, as card percentages. */
export function pictureBounds(picture: Placement): CardRegion {
  const centreX = (picture.x + picture.width / 2) * STANDARD_CARD_RATIO;
  const centreY = picture.y + picture.height / 2;
  const halfWidth = picture.width * STANDARD_CARD_RATIO / 2;
  const halfHeight = picture.height / 2;
  const turn = (picture.rotation || 0) * Math.PI / 180;
  const cos = Math.abs(Math.cos(turn));
  const sin = Math.abs(Math.sin(turn));
  const extentX = halfWidth * cos + halfHeight * sin;
  const extentY = halfWidth * sin + halfHeight * cos;
  return {
    left: (centreX - extentX) / STANDARD_CARD_RATIO,
    right: (centreX + extentX) / STANDARD_CARD_RATIO,
    top: centreY - extentY,
    bottom: centreY + extentY,
  };
}

const SAFE_AREA: CardRegion = { left: CARD_SAFE_X, top: CARD_SAFE_Y, right: 100 - CARD_SAFE_X, bottom: 100 - CARD_SAFE_Y };

/** The space a "keep text clear" picture keeps free: its rotated box and a small gap around it. */
export function keepClearZone(picture: Placement): CardRegion {
  const bounds = pictureBounds(picture);
  return {
    left: bounds.left - CLEAR_GAP_X,
    right: bounds.right + CLEAR_GAP_X,
    top: bounds.top - CLEAR_GAP_Y,
    bottom: bounds.bottom + CLEAR_GAP_Y,
  };
}

/**
 * Where a card's text goes: the largest rectangle inside the card's safe area
 * that no "keep text clear" picture touches. `extra` frames (pictures still
 * uploading) keep it clear too. Pictures over or behind the text don't move it.
 */
export function textRegion(
  pictures: Array<Placement & Pick<StandardCardImage, "textFlow">>,
  extra: PictureFrame[] = [],
): CardRegion {
  const obstacles = [
    ...pictures.filter((picture) => picture.textFlow === "avoid"),
    ...extra.map((frame) => ({ ...frame, rotation: 0 })),
  ].map(keepClearZone);
  if (!obstacles.length) return { ...SAFE_AREA };

  // Every rectangle whose sides lie on the safe area's or an obstacle's edges
  const inside = (value: number, low: number, high: number) => value >= low && value <= high;
  const xs = [SAFE_AREA.left, SAFE_AREA.right, ...obstacles.flatMap((o) => [o.left, o.right])]
    .filter((value) => inside(value, SAFE_AREA.left, SAFE_AREA.right))
    .sort((a, b) => a - b);
  const ys = [SAFE_AREA.top, SAFE_AREA.bottom, ...obstacles.flatMap((o) => [o.top, o.bottom])]
    .filter((value) => inside(value, SAFE_AREA.top, SAFE_AREA.bottom))
    .sort((a, b) => a - b);

  let best: CardRegion | null = null;
  let bestScore = 0;
  for (let i = 0; i < xs.length; i += 1) for (let j = i + 1; j < xs.length; j += 1) {
    for (let k = 0; k < ys.length; k += 1) for (let m = k + 1; m < ys.length; m += 1) {
      const region = { left: xs[i], right: xs[j], top: ys[k], bottom: ys[m] };
      const blocked = obstacles.some((o) =>
        o.left < region.right - 0.01 && o.right > region.left + 0.01 && o.top < region.bottom - 0.01 && o.bottom > region.top + 0.01);
      if (blocked) continue;
      // Area in real proportions, with slivers too thin for text worth less
      const width = (region.right - region.left) * STANDARD_CARD_RATIO;
      const height = region.bottom - region.top;
      let score = width * height;
      if (width < 30) score *= 0.25;
      if (height < 20) score *= 0.25;
      if (score > bestScore) {
        bestScore = score;
        best = region;
      }
    }
  }
  return best ?? { ...SAFE_AREA };
}

const byLayer = (a: StandardCardImage, b: StandardCardImage) => a.zIndex - b.zIndex;
const isBehind = (picture: StandardCardImage) => picture.textFlow === "behind";

/**
 * The CSS stacking order of each picture: pictures behind the text below it,
 * every other picture above it, and within each, the order they're arranged in.
 */
export function stackOrder(pictures: StandardCardImage[]): Record<string, number> {
  const order: Record<string, number> = {};
  [...pictures].sort(byLayer).forEach((picture, rank) => {
    order[picture.id] = (isBehind(picture) ? 1 : TEXT_LAYER + 10) + rank;
  });
  return order;
}

export type ArrangeMove = "front" | "forward" | "backward" | "back";

/**
 * Move a picture up or down among the pictures on its side of the text: one
 * behind the text stays behind it, whatever it's brought in front of.
 */
export function arrangePicture(pictures: StandardCardImage[], id: string, move: ArrangeMove): StandardCardImage[] {
  const picture = pictures.find((item) => item.id === id);
  if (!picture) return pictures;
  const sameSide = pictures.filter((item) => isBehind(item) === isBehind(picture)).sort(byLayer).map((item) => item.id);
  const otherSide = pictures.filter((item) => isBehind(item) !== isBehind(picture)).sort(byLayer).map((item) => item.id);
  const from = sameSide.indexOf(id);
  sameSide.splice(from, 1);
  const to = move === "front" ? sameSide.length
    : move === "back" ? 0
    : move === "forward" ? Math.min(sameSide.length, from + 1)
    : Math.max(0, from - 1);
  sameSide.splice(to, 0, id);
  const order = isBehind(picture) ? [...sameSide, ...otherSide] : [...otherSide, ...sameSide];
  return pictures.map((item) => ({ ...item, zIndex: order.indexOf(item.id) }));
}

/** Whether a picture is already the front- or backmost on its side of the text. */
export function arrangeLimits(pictures: StandardCardImage[], id: string) {
  const picture = pictures.find((item) => item.id === id);
  if (!picture) return { atFront: true, atBack: true };
  const sameSide = pictures.filter((item) => isBehind(item) === isBehind(picture)).sort(byLayer);
  const index = sameSide.findIndex((item) => item.id === id);
  return { atFront: index === sameSide.length - 1, atBack: index === 0 };
}

// How close, in card percentages, an edge or centre has to come to snap
const SNAP_X = 1.3;
const SNAP_Y = SNAP_X * STANDARD_CARD_RATIO;

/**
 * Snap a picture being dragged so its edges or centre line up with the card's
 * safe edges and centre lines, or with another picture's. Returns the
 * adjusted position and the guide lines to show.
 */
export function snapMove(moving: Placement, others: Placement[]): { x: number; y: number; guides: SnapGuide[] } {
  const bounds = pictureBounds(moving);
  const targetsX = [CARD_SAFE_X, 50, 100 - CARD_SAFE_X];
  const targetsY = [CARD_SAFE_Y, 50, 100 - CARD_SAFE_Y];
  for (const other of others) {
    const b = pictureBounds(other);
    targetsX.push(b.left, (b.left + b.right) / 2, b.right);
    targetsY.push(b.top, (b.top + b.bottom) / 2, b.bottom);
  }
  const nearest = (points: number[], targets: number[], tolerance: number) => {
    let hit: { shift: number; at: number } | null = null;
    for (const point of points) for (const target of targets) {
      const shift = target - point;
      if (Math.abs(shift) <= tolerance && (!hit || Math.abs(shift) < Math.abs(hit.shift))) hit = { shift, at: target };
    }
    return hit;
  };
  const snapX = nearest([bounds.left, (bounds.left + bounds.right) / 2, bounds.right], targetsX, SNAP_X);
  const snapY = nearest([bounds.top, (bounds.top + bounds.bottom) / 2, bounds.bottom], targetsY, SNAP_Y);
  const guides: SnapGuide[] = [];
  if (snapX) guides.push({ axis: "x", at: round(snapX.at) });
  if (snapY) guides.push({ axis: "y", at: round(snapY.at) });
  return { x: moving.x + (snapX?.shift ?? 0), y: moving.y + (snapY?.shift ?? 0), guides };
}

/** Keep at least a sliver of a picture on the card, wherever it's dragged. */
export const keepOnCard = (picture: Placement, x: number, y: number) => ({
  x: round(clampNumber(x, -picture.width / 2, 100 - picture.width / 2)),
  y: round(clampNumber(y, -picture.height / 2, 100 - picture.height / 2)),
});

const turnVector = (x: number, y: number, radians: number) => ({
  x: x * Math.cos(radians) - y * Math.sin(radians),
  y: x * Math.sin(radians) + y * Math.cos(radians),
});

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Resize a picture from one corner (`cornerX`, `cornerY` = ±1) without
 * changing its shape, keeping the opposite corner where it is. `card` is the
 * card's on-screen rectangle; `pointerX`, `pointerY` where the corner is being
 * dragged to.
 */
export function scaleFromCorner(start: Placement, card: Rect, cornerX: number, cornerY: number, pointerX: number, pointerY: number) {
  const width = start.width / 100 * card.width;
  const height = start.height / 100 * card.height;
  const turn = (start.rotation || 0) * Math.PI / 180;
  const centre = {
    x: card.left + (start.x + start.width / 2) / 100 * card.width,
    y: card.top + (start.y + start.height / 2) / 100 * card.height,
  };
  const toAnchor = turnVector(-cornerX * width / 2, -cornerY * height / 2, turn);
  const anchor = { x: centre.x + toAnchor.x, y: centre.y + toAnchor.y };
  const pointer = turnVector(pointerX - anchor.x, pointerY - anchor.y, -turn);
  let factor = (pointer.x * cornerX * width + pointer.y * cornerY * height) / (width * width + height * height);
  // No smaller than 6% of the card either way, and no bigger than the card
  factor = clampNumber(factor, Math.max(6 / start.width, 6 / start.height), Math.min(100 / start.width, 100 / start.height));
  const newWidth = width * factor;
  const newHeight = height * factor;
  const toCentre = turnVector(cornerX * newWidth / 2, cornerY * newHeight / 2, turn);
  const newCentre = { x: anchor.x + toCentre.x, y: anchor.y + toCentre.y };
  return {
    x: round((newCentre.x - card.left - newWidth / 2) / card.width * 100),
    y: round((newCentre.y - card.top - newHeight / 2) / card.height * 100),
    width: round(newWidth / card.width * 100),
    height: round(newHeight / card.height * 100),
  };
}

/** The angle from a centre point to the pointer, in degrees, clockwise from pointing right. */
export const angleFrom = (centreX: number, centreY: number, pointerX: number, pointerY: number) =>
  Math.atan2(pointerY - centreY, pointerX - centreX) * 180 / Math.PI;

/** An angle between -180 and 180 degrees. */
export function normalizeRotation(angle: number) {
  const turned = ((angle + 180) % 360 + 360) % 360 - 180;
  return turned === -180 ? 180 : turned;
}

/** Rotation snaps to every 15 degrees when within 4 of one, unless `free` (Shift held). */
export function snapRotation(angle: number, free = false) {
  const normal = normalizeRotation(angle);
  if (free) return Math.round(normal);
  const step = Math.round(normal / 15) * 15;
  return Math.abs(step - normal) <= 4 ? normalizeRotation(step) : Math.round(normal);
}

/**
 * A contained picture's frame shrunk to the picture itself, around the same
 * centre, so the handles sit on its edges and text can come right up to it.
 * Null when the frame already fits, or would get too small.
 */
export function tightFrame(picture: Placement, naturalWidth: number, naturalHeight: number): Pick<Placement, "x" | "y" | "width" | "height"> | null {
  if (!naturalWidth || !naturalHeight) return null;
  const pictureAspect = naturalWidth / naturalHeight;
  const frameAspect = picture.width * STANDARD_CARD_RATIO / picture.height;
  if (Math.abs(pictureAspect / frameAspect - 1) < 0.01) return null;
  const width = pictureAspect > frameAspect ? picture.width : picture.height * pictureAspect / STANDARD_CARD_RATIO;
  const height = pictureAspect > frameAspect ? picture.width * STANDARD_CARD_RATIO / pictureAspect : picture.height;
  if (width < 5 || height < 5) return null;
  return {
    x: round(picture.x + (picture.width - width) / 2),
    y: round(picture.y + (picture.height - height) / 2),
    width: round(width),
    height: round(height),
  };
}
