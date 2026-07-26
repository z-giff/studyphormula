/**
 * Homepage story engine — the card "flock" that carries the nine-scene
 * narrative, rendered on a single canvas.
 *
 * Design rules that keep this reliable:
 *  - Every card holds a target position for each named LAYOUT. A frame is
 *    produced by interpolating between two consecutive layouts, driven purely
 *    by scroll progress. Nothing accumulates frame-to-frame, so scrubbing
 *    backwards is identical to scrubbing forwards and no card can get stuck.
 *  - The settled field is a golden-angle disc that overflows the viewport, so
 *    the flock fills the screen with no rectangular boundary or visible edge.
 *  - The human scenes are built from soft geometry (discs, an arc, an orbit)
 *    rather than a literal bitmap silhouette: legible at any size, on any
 *    device, and never reads as noise.
 */

export type Role = "guardian" | "learner" | "bridge" | "ambient";

export interface Card {
  ex: number; ey: number;       // entry (off-screen, on the incoming current)
  fx: number; fy: number;       // settled field
  ox: number; oy: number;       // S5 orbit / independence
  ux: number; uy: number;       // S6 quiet clusters behind the study modes
  sx: number; sy: number;       // S8 swirl
  sT: number;                   // position along the swirl (drives its tint)
  role: Role;
  node: number;                 // S4: index of the 2x2 highlight node, or -1
  nx: number; ny: number;       // S4: tightened position inside its 2x2 block
  tint: number; depth: number; delay: number; spin: number;
  drift: number;                // per-card phase for the gentle ambient drift
}

export interface World {
  cards: Card[];
  w: number; h: number;
  cardW: number; cardH: number;
  /** S5: centres of the six 2x2 concept nodes, in pathway order. */
  nodePath: [number, number][];
}

/* ---------- Ember & Ink palette (canvas needs concrete colours) ---------- */
const AMBER: [number, number, number] = [247, 160, 62];
const EMBER: [number, number, number] = [242, 121, 95];
const PINK: [number, number, number] = [238, 93, 155];

const mix = (a: number[], b: number[], f: number) =>
  a.map((v, i) => Math.round(v + (b[i] - v) * f));

/** Pre-bucketed ember ramp — avoids building colour strings every frame. */
export const EMBER_RAMP: string[] = Array.from({ length: 40 }, (_, i) => {
  const t = i / 39;
  const c = t < 0.5 ? mix(AMBER, EMBER, t * 2) : mix(EMBER, PINK, (t - 0.5) * 2);
  return `rgb(${c[0]},${c[1]},${c[2]})`;
});

export const emberColor = (t: number): string =>
  EMBER_RAMP[Math.max(0, Math.min(39, Math.round(t * 39)))];

export const INK_FACE = "#221829";
export const INK_EDGE = "rgba(238,93,155,0.75)";

/**
 * S4 · the six emerging concepts. Muted Ember & Ink hues — warm enough to
 * belong to the brand, distinct enough to read as six separate ideas.
 */
export const NODE_COLORS: string[] = [
  "#F7A03E", // amber
  "#F2795F", // ember
  "#EE5D9B", // pink
  "#C77DD8", // mauve
  "#7E8BE0", // dusk blue
  "#5FBFA8", // muted teal
];

/* ---------- maths helpers ---------- */
export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
/** Normalised progress of `p` across the range [a, b]. */
export const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** The brand swirl in a 200x200 box — matches SwirlMark's geometry. */
const swirlPoint = (t: number): [number, number] => {
  const ang = (215 * Math.PI) / 180 - t * 1.82 * Math.PI * 2;
  const r = 82 * Math.pow(1 - t, 0.82) + 14;
  return [100 + r * Math.cos(ang), 92 + r * Math.sin(ang) * 0.92];
};

/**
 * Scene boundaries as fractions of the sticky stage's scroll progress.
 * Ranges overlap slightly so each scene grows out of the previous one
 * rather than cutting to it.
 */
export const SCENES = {
  heroHold: [0.0, 0.05] as const,     // S0 arrival
  exhale: [0.05, 0.135] as const,     // S1 the lockup breathes out
  arrive: [0.1, 0.245] as const,      // S2 the flock streams in
  field: [0.245, 0.325] as const,     // S3 the field
  connect: [0.35, 0.455] as const,    // S4 someone beside us
  orbit: [0.475, 0.585] as const,     // S5 the desk becomes yours
  modes: [0.6, 0.69] as const,        // S6 four ways to study
  proof: [0.745, 0.85] as const,      // S7 founder's note
  swirl: [0.87, 0.985] as const,      // S8 the swirl and the ask
};

export function buildWorld(w: number, h: number): World {
  const cx = w / 2;
  const cy = h * 0.48;
  const s = Math.min(w, h);
  const diag = Math.hypot(w, h);

  // Card size scales with the viewport so the flock reads the same everywhere.
  // Every card is drawn at exactly this size — uniform, no per-card scaling.
  const cardW = Math.max(13, Math.min(30, s * 0.029));
  const cardH = cardW * 0.66;

  // Uniform gutters in both axes: the settled field reads as one precise grid.
  const gap = cardW * 0.55;
  const stepX = cardW + gap;
  const stepY = cardH + gap;
  const cols = Math.ceil((w * 1.06) / stepX) + 1;
  const rows = Math.ceil((h * 1.06) / stepY) + 1;
  const N = cols * rows;

  let seed = 20260724;
  const rand = () => {
    // deterministic LCG: a resize rebuilds the same composition
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const nodePath: [number, number][] = [];

  const cards: Card[] = [];
  // Settled field is a neat grid: equal gutters, overflowing the viewport
  // slightly so there is no visible rectangular edge.
  for (let i = 0; i < N; i++) {
    const f = i / N;
    // Role mix — fixed proportions keep every formation composed the same way.
    const role: Role =
      f < 0.3 ? "guardian" : f < 0.5 ? "learner" : f < 0.63 ? "bridge" : "ambient";

    // Settled field: an even grid, each card directly beside the next.
    const col = i % cols;
    const row = Math.floor(i / cols);
    rand(); rand(); // keep the random sequence stable for later formations
    const fx = cx + (col - (cols - 1) / 2) * stepX;
    const fy = cy + (row - (rows - 1) / 2) * stepY;

    // Entry: off-screen on a broad diagonal current, staggered.
    const entryA = Math.atan2(fy - cy, fx - cx);
    const ex = fx - Math.cos(entryA - 0.55) * diag * (0.55 + rand() * 0.4) - w * 0.12;
    const ey = fy + Math.sin(0.6) * diag * (0.3 + rand() * 0.3) + h * 0.2;

    // S4 no longer moves any card: the six concept nodes are highlighted in
    // place (assigned after this loop). Keep the RNG stream stepping so the
    // later formations are composed exactly as before.
    rand(); rand(); rand(); rand();

    // S5 no longer relocates anything: the nodes stay exactly where S4 left
    // them and simply turn white while the pathway is drawn between them.
    rand(); rand(); rand();
    const oox = fx, ooy = fy;

    // S6/S7: the flock withdraws to a quiet halo around the edge of the frame,
    // so it stays part of the story but never sits behind the copy.
    const ha = (i / N) * Math.PI * 2 + (rand() - 0.5) * 0.3;
    const ux = cx + Math.cos(ha) * w * (0.45 + rand() * 0.09);
    const uy = cy + Math.sin(ha) * h * (0.43 + rand() * 0.1);

    // S8: the swirl.
    const sT = ((i * 0.6180339887) % 1 + rand() * 0.012) % 1;
    const [px, py] = swirlPoint(sT);
    const L = s * 0.6;
    const jitter = (rand() - 0.5) * L * 0.022;
    const sx = cx - L / 2 + (px / 200) * L + jitter;
    const sy = cy - L / 2 + (py / 200) * L + jitter;

    cards.push({
      ex, ey, fx, fy,
      ox: oox, oy: ooy,
      ux, uy, sx, sy, sT,
      role,
      node: -1,
      nx: fx, ny: fy,
      tint: rand(),
      depth: 0.72 + rand() * 0.5,
      delay: rand(),
      spin: (rand() - 0.5) * 0.9,
      drift: rand() * Math.PI * 2,
    });
  }

  // — S4 · six concepts emerge. Each node is a perfect 2x2 block of cards that
  //   already sits in the settled grid, so the scene reads as those cards
  //   turning over in place rather than new objects appearing.
  const NODE_CELLS: [number, number][] = [
    [0.11, 0.16], [0.32, 0.27], [0.64, 0.39],
    [0.44, 0.53], [0.9, 0.59], [0.56, 0.79],
  ];
  NODE_CELLS.forEach(([fxr, fyr], n) => {
    const c0 = Math.min(cols - 2, Math.max(0, Math.round(fxr * (cols - 2))));
    const r0 = Math.min(rows - 2, Math.max(0, Math.round(fyr * (rows - 2))));
    const bcx = cx + (c0 + 0.5 - (cols - 1) / 2) * stepX;
    const bcy = cy + (r0 + 0.5 - (rows - 1) / 2) * stepY;
    for (let dr = 0; dr < 2; dr++) {
      for (let dc = 0; dc < 2; dc++) {
        const card = cards[(r0 + dr) * cols + (c0 + dc)];
        if (!card) continue;
        card.node = n;
        // pull the four cards in until they form one tight square
        card.nx = bcx + (dc === 0 ? -1 : 1) * (cardW / 2 + gap * 0.12);
        card.ny = bcy + (dr === 0 ? -1 : 1) * (cardH / 2 + gap * 0.12);
      }
    }
    nodePath.push([bcx, bcy]);
  });

  return { cards, w, h, cardW, cardH, nodePath };
}

/**
 * Draw one frame. `p` is scroll progress (0..1) through the sticky stage —
 * the entire picture is a pure function of it.
 *
 * Rendering contract (do not break):
 *   1. reset the transform to identity
 *   2. clear the ENTIRE backing store (device pixels, not CSS pixels)
 *   3. re-apply the devicePixelRatio scale
 *   4. draw once — per-card transforms use save()/restore() only, never
 *      setTransform(), which would destroy the dpr scale for later cards.
 */
export function drawFrame(
  ctx: CanvasRenderingContext2D,
  world: World,
  p: number,
  dpr = 1,
) {
  const { cards, cardW, cardH, nodePath } = world;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const tArrive = seg(p, SCENES.arrive[0], SCENES.arrive[1]);
  const tConnect = easeInOut(seg(p, SCENES.connect[0], SCENES.connect[1]));
  const tOrbit = easeInOut(seg(p, SCENES.orbit[0], SCENES.orbit[1]));
  const tModes = easeInOut(seg(p, SCENES.modes[0], SCENES.modes[1]));
  const tSwirl = easeInOut(seg(p, SCENES.swirl[0], SCENES.swirl[1]));

  if (tArrive <= 0) return; // S0/S1: the stage is clean for the hero

  // Ambient breathing so a held frame still feels alive without moving.
  const breathe = 1 + Math.sin(p * 40) * 0.006;

  // Global ambient drift — identical for every card, so the grid (and the S5
  // pathway drawn over it) moves as one rigid body.
  const liveBase = (1 - tSwirl) * (1 - tConnect * 0.6);
  const driftX = Math.sin(p * 9) * cardW * 0.35 * liveBase;
  const driftY = Math.cos(p * 7.5) * cardW * 0.3 * liveBase;

  // — S5 · the pathway. Thin lines grow node-to-node while the six nodes flip
  //   from their concept colours to white. Nothing moves; nothing lingers.
  const tPath = easeInOut(seg(p, SCENES.orbit[0] + 0.012, SCENES.orbit[1]));
  const pathAlpha = tPath * (1 - tModes) * (1 - tSwirl);
  if (pathAlpha > 0.01 && nodePath.length > 1) {
    const segs = nodePath.length - 1;
    const grown = tPath * segs;
    ctx.save();
    ctx.globalAlpha = pathAlpha * 0.85;
    ctx.strokeStyle = "rgba(255,255,255,0.72)";
    ctx.lineWidth = 1;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(nodePath[0][0] + driftX, nodePath[0][1] + driftY);
    for (let n = 0; n < segs; n++) {
      const k = clamp01(grown - n);
      if (k <= 0) break;
      const [ax, ay] = nodePath[n];
      const [bx, by] = nodePath[n + 1];
      ctx.lineTo(lerp(ax, bx, k) + driftX, lerp(ay, by, k) + driftY);
    }
    ctx.stroke();
    ctx.restore();
  }

  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];

    // — position: walk the layout chain, blending only between the two
    //   layouts either side of the current scroll position.
    const a = clamp01(tArrive * 1.35 - c.delay * 0.3);
    const ea = easeOut(a);
    let x = lerp(c.ex, c.fx, ea);
    let y = lerp(c.ey, c.fy, ea);
    let rot = (1 - ea) * c.spin;

    if (tConnect > 0) {
      // S4 highlights in place: node cards only close the gutter between
      // themselves so the four read as one 2x2 tile.
      rot *= 1 - tConnect;
      if (c.node >= 0) {
        x = lerp(x, c.nx, tConnect);
        y = lerp(y, c.ny, tConnect);
      }
    }
    if (tModes > 0) {
      x = lerp(x, c.ux, tModes);
      y = lerp(y, c.uy, tModes);
    }
    if (tSwirl > 0) {
      x = lerp(x, c.sx, tSwirl);
      y = lerp(y, c.sy, tSwirl);
    }

    // gentle life: a slow drift tied to scroll, never to a clock.
    x += driftX;
    y += driftY;

    // — opacity: each scene states its own value, so nothing lingers.
    let op = Math.min(1, a * 2.2) * (0.5 + 0.44 * Math.min(c.depth, 1));

    if (tConnect > 0) {
      // The grid recedes into the background; the six 2x2 nodes stay bright and
      // become the focal points.
      if (c.node >= 0) op = lerp(op, 1, tConnect);
      else op *= 1 - 0.62 * tConnect;
    }
    if (tModes > 0) {
      // a quiet halo framing the product story
      op = lerp(op, 0.2 + 0.16 * c.depth, tModes);
    }
    if (tSwirl > 0) {
      op = lerp(op, 0.55 + 0.45 * Math.min(c.depth, 1), tSwirl);
    }
    if (op <= 0.012) continue;

    // — face: node cards turn over twice, always in place — first onto their
    //   concept colour (S4), then onto white as the pathway is drawn (S5).
    //   Everything else keeps its ember face.
    const turn = c.node >= 0 ? (tConnect + tOrbit) * (1 - tModes) : 0;

    let tint = c.tint;
    if (tSwirl > 0) tint = lerp(c.tint, c.sT, tSwirl);

    const fl = Math.abs(Math.cos(turn * Math.PI));
    // 0 = ember face, 1 = concept colour, 2 = white face
    const face = turn <= 0.5 ? 0 : turn <= 1.5 ? 1 : 2;
    // Uniform size: depth only affects opacity, never scale.
    const cw = cardW * breathe * Math.max(0.08, fl);
    const chh = cardH * breathe;

    ctx.globalAlpha = op;
    if (rot !== 0) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.translate(-x, -y);
    }
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(x - cw / 2, y - chh / 2, cw, chh, Math.min(3, cw / 3));
    } else {
      ctx.rect(x - cw / 2, y - chh / 2, cw, chh);
    }
    ctx.fillStyle =
      face === 2
        ? "#F6F1F4"
        : face === 1
          ? NODE_COLORS[c.node % NODE_COLORS.length]
          : emberColor(tint);
    ctx.fill();
    if (rot !== 0) ctx.restore();
  }
  ctx.globalAlpha = 1;
}
