import { jsPDF } from "jspdf";
import { getStandardCardLayout, resolveStandardImageSource, type StandardCardImage } from "@/lib/standardCardLayout";

export type PdfOrientation = "portrait" | "landscape";
export type PdfSides = "same-page" | "duplex";

export interface PdfFlashcard {
  id: string;
  term: string;
  definition: string;
  image_url: string | null;
  color: string | null;
  flashcard_type?: string;
  interactive_data?: any;
}

export interface FlashcardPdfOptions {
  orientation: PdfOrientation;
  cardsPerPage: 1 | 2 | 4 | 6 | 8;
  sides: PdfSides;
  removeStandardImages: boolean;
}

interface Box { x: number; y: number; w: number; h: number }
interface LoadedImage { data: string; format: string; width: number; height: number }

const PAGE_MARGIN = 28;
const PAGE_FOOTER = 16;
const CARD_RATIO = 1.75;
const imageCache = new Map<string, Promise<LoadedImage | null>>();

const safeColor = (value?: string | null) => /^#[0-9a-f]{6}$/i.test(value || "") ? value as string : "#ffffff";

const contrastColor = (hex: string) => {
  const value = hex.slice(1);
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? "#111827" : "#ffffff";
};

const getBoardData = (card: PdfFlashcard) => {
  const raw = card.interactive_data || {};
  if (card.flashcard_type === "drawing") return raw.drawingData || raw;
  if (card.flashcard_type === "flowchart") return raw.flowchartData || raw;
  return raw;
};

const loadImage = (url: string): Promise<LoadedImage | null> => {
  if (imageCache.has(url)) return imageCache.get(url) as Promise<LoadedImage | null>;
  const pending = (async () => {
    try {
      const response = await fetch(url, { mode: "cors" });
      if (!response.ok) return null;
      const blob = await response.blob();
      const source = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = source;
      });
      const maximumDimension = 1800;
      const outputScale = Math.min(1, maximumDimension / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * outputScale));
      const height = Math.max(1, Math.round(image.naturalHeight * outputScale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) return null;
      context.drawImage(image, 0, 0, width, height);
      return { data: canvas.toDataURL("image/png"), format: "PNG", width, height };
    } catch {
      return null;
    }
  })();
  imageCache.set(url, pending);
  return pending;
};

const fitRect = (sourceW: number, sourceH: number, target: Box): Box => {
  const scale = Math.min(target.w / Math.max(sourceW, 1), target.h / Math.max(sourceH, 1));
  const w = sourceW * scale;
  const h = sourceH * scale;
  return { x: target.x + (target.w - w) / 2, y: target.y + (target.h - h) / 2, w, h };
};

const drawImage = (doc: jsPDF, image: LoadedImage, target: Box) => {
  const fitted = fitRect(image.width, image.height, target);
  doc.addImage(image.data, image.format, fitted.x, fitted.y, fitted.w, fitted.h, undefined, "FAST");
  return fitted;
};

const drawPositionedImage = (doc: jsPDF, image: LoadedImage, item: StandardCardImage, box: Box) => {
  const target = { x: box.x + box.w * item.x / 100, y: box.y + box.h * item.y / 100, w: box.w * item.width / 100, h: box.h * item.height / 100 };
  const fitted = item.fit === "cover" ? target : fitRect(image.width, image.height, target);
  doc.addImage(image.data, image.format, fitted.x, fitted.y, fitted.w, fitted.h, undefined, "FAST", item.rotation);
};

const drawStandard = async (doc: jsPDF, card: PdfFlashcard, box: Box, side: "front" | "back", color: string, removeImages: boolean) => {
  const layout = getStandardCardLayout(card.interactive_data, card.image_url);
  const images = removeImages ? [] : [...layout[side]].sort((a, b) => a.zIndex - b.zIndex);
  const avoid = images.filter((image) => image.textFlow === "avoid");
  let textBox = box;
  if (avoid.length) {
    const top = Math.min(...avoid.map((image) => image.y));
    const bottom = 100 - Math.max(...avoid.map((image) => image.y + image.height));
    textBox = top >= bottom
      ? { x: box.x + box.w * .06, y: box.y + box.h * .05, w: box.w * .88, h: box.h * Math.max(.18, (top - 8) / 100) }
      : { x: box.x + box.w * .06, y: box.y + box.h * (1 - Math.max(.18, (bottom - 8) / 100) - .05), w: box.w * .88, h: box.h * Math.max(.18, (bottom - 8) / 100) };
  }
  for (const item of images.filter((image) => image.textFlow === "avoid")) {
    const source = await resolveStandardImageSource(item.src).catch(() => null);
    const image = source ? await loadImage(source) : null;
    if (image) drawPositionedImage(doc, image, item, box);
  }
  drawText(doc, side === "front" ? card.term : card.definition, textBox, color, side === "front");
  for (const item of images.filter((image) => image.textFlow === "overlap")) {
    const source = await resolveStandardImageSource(item.src).catch(() => null);
    const image = source ? await loadImage(source) : null;
    if (image) drawPositionedImage(doc, image, item, box);
  }
};

const drawText = (
  doc: jsPDF,
  text: string,
  box: Box,
  color: string,
  bold = false,
) => {
  const clean = (text || "").replace(/\r/g, "");
  let size = bold ? 16 : 13;
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setTextColor(color);
  let lines = doc.splitTextToSize(clean, box.w) as string[];
  while (size > 6 && lines.length * size * 1.18 > box.h) {
    size -= 0.5;
    doc.setFontSize(size);
    lines = doc.splitTextToSize(clean, box.w) as string[];
  }
  doc.setFontSize(size);
  const lineHeight = size * 1.18;
  const startY = box.y + Math.max(size, (box.h - lines.length * lineHeight) / 2 + size);
  doc.text(lines, box.x + box.w / 2, startY, { align: "center", lineHeightFactor: 1.18, maxWidth: box.w });
};

const drawDrawing = (doc: jsPDF, card: PdfFlashcard, box: Box) => {
  const data = getBoardData(card);
  const strokes = Array.isArray(data?.strokes) ? data.strokes : [];
  const points = strokes.flatMap((stroke: any) => Array.isArray(stroke.points) ? stroke.points : []);
  if (!points.length) {
    drawText(doc, "No drawing", box, "#6b7280");
    return;
  }
  const minX = Math.min(...points.map((point: any) => Number(point.x) || 0));
  const minY = Math.min(...points.map((point: any) => Number(point.y) || 0));
  const maxX = Math.max(...points.map((point: any) => Number(point.x) || 0));
  const maxY = Math.max(...points.map((point: any) => Number(point.y) || 0));
  const fitted = fitRect(Math.max(maxX - minX, 1), Math.max(maxY - minY, 1), box);
  const scale = fitted.w / Math.max(maxX - minX, 1);
  strokes.forEach((stroke: any) => {
    if (!Array.isArray(stroke.points) || stroke.points.length < 2) return;
    const color = String(stroke.color || "#000000").toLowerCase();
    doc.setDrawColor(color === "#f5f5f5" ? "#ffffff" : color === "#ffffff" ? "#6b7280" : color);
    doc.setLineWidth(Math.max((Number(stroke.width) || 1) * scale, 0.35));
    for (let index = 1; index < stroke.points.length; index += 1) {
      const from = stroke.points[index - 1];
      const to = stroke.points[index];
      doc.line(
        fitted.x + (from.x - minX) * scale,
        fitted.y + (from.y - minY) * scale,
        fitted.x + (to.x - minX) * scale,
        fitted.y + (to.y - minY) * scale,
      );
    }
  });
};

const drawFlowchart = async (doc: jsPDF, card: PdfFlashcard, box: Box) => {
  const data = getBoardData(card);
  const nodes = Array.isArray(data?.nodes) ? data.nodes : [];
  const edges = Array.isArray(data?.edges) ? data.edges : [];
  if (!nodes.length) {
    drawText(doc, "No flowchart", box, "#6b7280");
    return;
  }
  const bounds = nodes.map((node: any) => ({
    x: Number(node.position?.x) || 0,
    y: Number(node.position?.y) || 0,
    w: Number(node.measured?.width || node.width) || 140,
    h: Number(node.measured?.height || node.height) || (node.type === "circle" ? 120 : 64),
  }));
  const minX = Math.min(...bounds.map((node) => node.x));
  const minY = Math.min(...bounds.map((node) => node.y));
  const maxX = Math.max(...bounds.map((node) => node.x + node.w));
  const maxY = Math.max(...bounds.map((node) => node.y + node.h));
  const fitted = fitRect(maxX - minX, maxY - minY, box);
  const scale = Math.min(fitted.w / Math.max(maxX - minX, 1), fitted.h / Math.max(maxY - minY, 1));
  const mapped = new Map(nodes.map((node: any, index: number) => {
    const source = bounds[index];
    return [node.id, {
      x: fitted.x + (source.x - minX) * scale,
      y: fitted.y + (source.y - minY) * scale,
      w: source.w * scale,
      h: source.h * scale,
    }];
  }));
  doc.setDrawColor("#4b5563");
  doc.setLineWidth(0.8);
  edges.forEach((edge: any) => {
    const source = mapped.get(edge.source) as Box | undefined;
    const target = mapped.get(edge.target) as Box | undefined;
    if (source && target) doc.line(source.x + source.w / 2, source.y + source.h, target.x + target.w / 2, target.y);
  });
  for (const node of nodes) {
    const target = mapped.get(node.id) as Box;
    const color = safeColor(node.data?.color || "#0000ff");
    doc.setFillColor(color);
    doc.setDrawColor(color);
    if (node.type === "circle") doc.ellipse(target.x + target.w / 2, target.y + target.h / 2, target.w / 2, target.h / 2, "F");
    else doc.roundedRect(target.x, target.y, target.w, target.h, 3, 3, "F");
    const image = node.data?.image ? await loadImage(node.data.image) : null;
    const textBox = image
      ? { x: target.x + 3, y: target.y + target.h * 0.58, w: target.w - 6, h: target.h * 0.36 }
      : { x: target.x + 3, y: target.y + 3, w: target.w - 6, h: target.h - 6 };
    if (image) drawImage(doc, image, { x: target.x + 3, y: target.y + 3, w: target.w - 6, h: target.h * 0.5 });
    drawText(doc, String(node.data?.label || ""), textBox, contrastColor(color), true);
  }
};

const drawInteractive = async (doc: jsPDF, card: PdfFlashcard, box: Box, side: "front" | "back") => {
  const image = card.image_url ? await loadImage(card.image_url) : null;
  if (!image) {
    drawText(doc, side === "front" ? card.term : card.definition || "Diagram unavailable", box, "#111827", true);
    return;
  }
  const imageBox = drawImage(doc, image, box);
  if (side === "front") {
    const textBoxes = Array.isArray(card.interactive_data?.textBoxes) ? card.interactive_data.textBoxes : [];
    textBoxes.forEach((mask: any) => {
      doc.setFillColor(safeColor(mask.bgColor || "#ffffff"));
      doc.setDrawColor("#111827");
      doc.setLineWidth(0.6);
      doc.rect(
        imageBox.x + imageBox.w * (Number(mask.x) || 0) / 100,
        imageBox.y + imageBox.h * (Number(mask.y) || 0) / 100,
        imageBox.w * (Number(mask.width) || 0) / 100,
        imageBox.h * (Number(mask.height) || 0) / 100,
        "FD",
      );
    });
  }
};

const drawCard = async (
  doc: jsPDF,
  card: PdfFlashcard,
  box: Box,
  side: "front" | "back",
  options: FlashcardPdfOptions,
  setColor: string,
) => {
  const isBoardBack = side === "back" && (card.flashcard_type === "drawing" || card.flashcard_type === "flowchart");
  const cardColor = isBoardBack || card.flashcard_type === "interactive" ? "#ffffff" : safeColor(card.color || setColor);
  doc.setFillColor(cardColor);
  doc.setDrawColor("#cbd5e1");
  doc.setLineWidth(0.55);
  doc.roundedRect(box.x, box.y, box.w, box.h, 4, 4, "FD");
  const inset = Math.max(7, Math.min(box.w, box.h) * 0.055);
  const content = { x: box.x + inset, y: box.y + inset, w: box.w - inset * 2, h: box.h - inset * 2 };

  if (card.flashcard_type === "interactive") {
    if (side === "front") {
      const titleH = Math.min(28, content.h * 0.2);
      drawText(doc, card.term, { ...content, h: titleH }, "#111827", true);
      await drawInteractive(doc, card, { ...content, y: content.y + titleH + 3, h: content.h - titleH - 3 }, side);
    } else await drawInteractive(doc, card, content, side);
  } else if (side === "back" && card.flashcard_type === "drawing") {
    drawDrawing(doc, card, content);
  } else if (side === "back" && card.flashcard_type === "flowchart") {
    await drawFlowchart(doc, card, content);
  } else await drawStandard(doc, card, content, side, contrastColor(cardColor), options.removeStandardImages);
};

const chooseGrid = (count: number, width: number, height: number) => {
  let best = { columns: 1, rows: count, score: -Infinity };
  for (let columns = 1; columns <= count; columns += 1) {
    const rows = Math.ceil(count / columns);
    const w = width / columns;
    const h = height / rows;
    const area = Math.min(w, h * CARD_RATIO) * Math.min(h, w / CARD_RATIO);
    const emptyPenalty = (columns * rows - count) * area * 0.08;
    if (area - emptyPenalty > best.score) best = { columns, rows, score: area - emptyPenalty };
  }
  return best;
};

const getBoxes = (count: number, pageW: number, pageH: number): Box[] => {
  const usableW = pageW - PAGE_MARGIN * 2;
  const usableH = pageH - PAGE_MARGIN * 2 - PAGE_FOOTER;
  const gap = 8;
  const grid = chooseGrid(count, usableW, usableH);
  const cellW = (usableW - gap * (grid.columns - 1)) / grid.columns;
  const cellH = (usableH - gap * (grid.rows - 1)) / grid.rows;
  const cardW = Math.min(cellW, cellH * CARD_RATIO);
  const cardH = cardW / CARD_RATIO;
  return Array.from({ length: count }, (_, index) => {
    const column = index % grid.columns;
    const row = Math.floor(index / grid.columns);
    return {
      x: PAGE_MARGIN + column * (cellW + gap) + (cellW - cardW) / 2,
      y: PAGE_MARGIN + row * (cellH + gap) + (cellH - cardH) / 2,
      w: cardW,
      h: cardH,
    };
  });
};

const footer = (doc: jsPDF, title: string, pageNumber: number) => {
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor("#64748b");
  doc.text(title, PAGE_MARGIN, height - 9);
  doc.text(String(pageNumber), width - PAGE_MARGIN, height - 9, { align: "right" });
};

const addPage = (doc: jsPDF, pageNumber: number) => {
  if (pageNumber > 1) doc.addPage();
};

export const flashcardPdfFilename = (title: string) => `${title.trim().replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "") || "flashcards"}.pdf`;

export function downloadFlashcardPdf(blob: Blob, title: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = flashcardPdfFilename(title);
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function generateFlashcardPdf(
  title: string,
  cards: PdfFlashcard[],
  setColor: string,
  options: FlashcardPdfOptions,
  onProgress?: (completed: number, total: number) => void,
): Promise<Blob> {
  const doc = new jsPDF({ orientation: options.orientation, unit: "pt", format: "letter", compress: true });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const totalPanels = cards.length * 2;
  let completed = 0;
  let pageNumber = 0;

  for (let start = 0; start < cards.length; start += options.cardsPerPage) {
    const group = cards.slice(start, start + options.cardsPerPage);
    if (options.sides === "same-page") {
      pageNumber += 1;
      addPage(doc, pageNumber);
      const boxes = getBoxes(group.length * 2, pageW, pageH);
      for (let index = 0; index < group.length; index += 1) {
        await drawCard(doc, group[index], boxes[index * 2], "front", options, setColor);
        onProgress?.(++completed, totalPanels);
        await drawCard(doc, group[index], boxes[index * 2 + 1], "back", options, setColor);
        onProgress?.(++completed, totalPanels);
      }
      footer(doc, title, pageNumber);
    } else {
      pageNumber += 1;
      addPage(doc, pageNumber);
      const frontBoxes = getBoxes(options.cardsPerPage, pageW, pageH);
      for (let index = 0; index < group.length; index += 1) {
        await drawCard(doc, group[index], frontBoxes[index], "front", options, setColor);
        onProgress?.(++completed, totalPanels);
      }
      footer(doc, `${title} — fronts`, pageNumber);

      pageNumber += 1;
      addPage(doc, pageNumber);
      const backBoxes = getBoxes(options.cardsPerPage, pageW, pageH);
      const columns = chooseGrid(options.cardsPerPage, pageW - PAGE_MARGIN * 2, pageH - PAGE_MARGIN * 2 - PAGE_FOOTER).columns;
      for (let index = 0; index < group.length; index += 1) {
        const row = Math.floor(index / columns);
        const column = index % columns;
        const mirroredIndex = row * columns + (columns - 1 - column);
        await drawCard(doc, group[index], backBoxes[mirroredIndex], "back", options, setColor);
        onProgress?.(++completed, totalPanels);
      }
      footer(doc, `${title} — backs`, pageNumber);
    }
  }

  return doc.output("blob");
}