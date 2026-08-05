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
  /** S3 caption: 0..1 spatial weight inside the bottom-left quiet zone. */
  quiet: number;
  /** S3 caption: 0..1 wave offset, flipping outward from the bottom-left. */
  qDelay: number;
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
/** Smooth 0..1 ramp between two edges — used to feather the quiet zone. */
const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/**
 * S3 · the quiet zone. The bottom-left cards flip to black in a wave so the
 * caption has a soft, grid-aligned space to sit in. Fully scroll-driven.
 *
 * Its exit deliberately overlaps QUIET2's entry: the darkened space has to
 * carry continuously from caption 1 into caption 2, or the field flashes back
 * to full brightness between two dark beats.
 */
export const QUIET = {
  in: [0.252, 0.325] as const,   // cards flip to black
  out: [0.378, 0.432] as const,  // hands over to QUIET2 mid-fade
};

/**
 * S4 · the same quiet zone, reused for the second caption. Only the plain
 * background cards flip — the six concept nodes are left untouched.
 */
export const QUIET2 = {
  in: [0.36, 0.41] as const,     // begins before QUIET has finished leaving
  out: [0.47, 0.505] as const,
};

/**
 * S5 · the same quiet zone once more, for the third caption. It only begins
 * after the network has fully formed, and again spares the six nodes.
 */
export const QUIET3 = {
  in: [0.528, 0.565] as const,
  // Held through the S4→S5 transition so the same darkened space carries the
  // second caption without ever flashing back to colour.
  out: [0.668, 0.702] as const,
};

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
  // S6 starts only once the last S5 caption has finished, so the flock is
  // still on screen for the line that describes it.
  modes: [0.668, 0.735] as const,     // S6 four ways to study
  proof: [0.8, 0.888] as const,       // S7 founder's note
  swirl: [0.87, 0.985] as const,      // S8 the swirl and the ask
};

export function buildWorld(w: number, h: number): World {
  const cx = w / 2;
  const cy = h * 0.48;
  const s = Math.min(w, h);
  const diag = Math.hypot(w, h);

  // Card size scales with the viewport so the flock reads the same everywhere.
  // Every card is drawn at exactly this size — uniform, no per-card scaling.
  let cardW = Math.max(13, Math.min(30, s * 0.029));

  // Draw budget. Sizing from the *smaller* dimension alone means a tall, narrow
  // phone lands on the 13px floor and ends up drawing MORE cards than a
  // desktop. Cap the count and grow the cards until the grid fits the budget:
  // density on desktop is untouched, phones and very large screens get relief.
  const layout = (cw: number) => {
    const ch = cw * 0.66;
    const gp = cw * 0.55;
    const sx = cw + gp;
    const sy = ch + gp;
    const c = Math.ceil((w * 1.06) / sx) + 1;
    const r = Math.ceil((h * 1.06) / sy) + 1;
    return { cardH: ch, gap: gp, stepX: sx, stepY: sy, cols: c, rows: r, N: c * r };
  };
  const budget = Math.min(w, h) < 560 ? 640 : 1600;
  let grid = layout(cardW);
  for (let guard = 0; guard < 4 && grid.N > budget; guard++) {
    cardW *= Math.sqrt(grid.N / budget);
    grid = layout(cardW);
  }
  const { cardH, gap, stepX, stepY, cols, rows, N } = grid;

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
      // Tint biased toward the amber/ember half of the ramp, so hot pink reads
      // as an accent through the field instead of half of it.
      tint: Math.pow(rand(), 1.5),
      // Depth is a full 0..1 spread (it drives opacity only). The old 0.72–1.22
      // range collapsed to 0.82–0.94 on screen, which is why the settled field
      // read as one flat, vibrating wall with no front-to-back separation.
      depth: Math.pow(rand(), 1.2),
      delay: rand(),
      spin: (rand() - 0.5) * 0.9,
      drift: rand() * Math.PI * 2,
      // Quiet zone: a feathered bottom-left region, anchored in viewport
      // fractions so it stays put on any laptop/desktop size.
      quiet: (() => {
        const nx = fx / w;
        const ny = fy / h;
        const qx = 1 - smoothstep(0.24, 0.44, nx);
        const qy = smoothstep(0.54, 0.74, ny);
        return clamp01(qx * qy);
      })(),
      qDelay: clamp01((fx / w) * 0.9 + (1 - fy / h) * 0.9),
    });
  }

  // — S4 · six concepts emerge. Each node is a perfect 2x2 block of cards that
  //   already sits in the settled grid, so the scene reads as those cards
  //   turning over in place rather than new objects appearing.
  const NODE_CELLS: [number, number][] = [
    [0.11, 0.16], [0.32, 0.27], [0.64, 0.39],
    [0.44, 0.53], [0.9, 0.59], [0.56, 0.79],
  ];
  // The pathway visits the nodes in this order (indices into NODE_CELLS), so
  // the line reads top-left → down-right → across, one clean continuous route.
  const PATH_ORDER = [0, 1, 3, 5, 2, 4];
  const nodeCentres: [number, number][] = [];
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
    nodeCentres[n] = [bcx, bcy];
  });
  PATH_ORDER.forEach((n) => nodePath.push(nodeCentres[n]));

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
  // S3 caption: the bottom-left quiet zone, in and back out again.
  const quietAmt =
    easeInOut(seg(p, QUIET.in[0], QUIET.in[1])) *
    (1 - easeInOut(seg(p, QUIET.out[0], QUIET.out[1])));
  // S4 caption: identical treatment, background cards only.
  const quietAmt2 =
    easeInOut(seg(p, QUIET2.in[0], QUIET2.in[1])) *
    (1 - easeInOut(seg(p, QUIET2.out[0], QUIET2.out[1])));
  // S5 caption: identical treatment, background cards only.
  const quietAmt3 =
    easeInOut(seg(p, QUIET3.in[0], QUIET3.in[1])) *
    (1 - easeInOut(seg(p, QUIET3.out[0], QUIET3.out[1])));

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
  const tPath = easeInOut(seg(p, SCENES.orbit[0] + 0.012, SCENES.orbit[1] - 0.025));
  // The pathway is held all the way through the "see how everything fits
  // together" caption — that line is about these connections, so it must not
  // play over a field that has already dropped them. It then retires inside
  // the S6 hand-off, so no line is ever left hanging in empty space.
  const pathAlpha = tPath * (1 - easeInOut(seg(p, 0.665, 0.71)));
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
    // S6: no positional change — the flock simply fades out where it stands.

    // gentle life: a slow drift tied to scroll, never to a clock.
    x += driftX;
    y += driftY;

    // — opacity: each scene states its own value, so nothing lingers.
    // Wide depth spread = real front-to-back layering in the field.
    let op = Math.min(1, a * 2.2) * (0.28 + 0.72 * c.depth);

    if (tConnect > 0) {
      // The grid recedes into the background; the six 2x2 nodes stay bright and
      // become the focal points.
      if (c.node >= 0) op = lerp(op, 1, tConnect);
      else op *= 1 - 0.62 * tConnect;
    }
    if (tModes > 0) {
      // S6 · the flock clears the stage entirely so the four feature cards are
      // the only thing on screen — no ring, no formation behind the copy.
      // It never returns: S8's swirl is the real brand mark, drawn in the DOM.
      op = lerp(op, 0, tModes);
    }
    if (op <= 0.012) continue;

    // — face: node cards turn over twice, always in place — first onto their
    //   concept colour (S4), then onto white as the pathway is drawn (S5).
    //   Everything else keeps its ember face.
    //
    //   The four cards of a node are staggered by a phase that is exactly zero
    //   at both ends of the turn, so the tile still starts and lands perfectly
    //   square but never collapses to four bars at the same instant.
    const turnRaw = c.node >= 0 ? tConnect + tOrbit : 0;
    const turn =
      turnRaw > 0
        ? turnRaw + Math.sin(Math.PI * clamp01(turnRaw / 2)) * (c.delay - 0.5) * 0.16
        : 0;

    const tint = c.tint;

    const fl = Math.abs(Math.cos(turn * Math.PI));
    // Quiet-zone half-flip: squeeze, then land on the black face.
    let qk = 0;
    let qFlip = 1;
    const qAmt = Math.min(
      1,
      quietAmt + (c.node >= 0 ? 0 : Math.max(quietAmt2, quietAmt3)),
    );
    if (qAmt > 0.001 && c.quiet > 0.004) {
      const q = clamp01((qAmt * 1.34 - c.qDelay * 0.34) / 1);
      if (q > 0) {
        qFlip = Math.max(0.1, Math.abs(Math.cos(q * Math.PI)));
        qk = q > 0.5 ? c.quiet : 0;
      }
    }
    // 0 = ember face, 1 = concept colour, 2 = white face
    const face = turn <= 0.5 ? 0 : turn <= 1.5 ? 1 : 2;
    // Uniform size: depth only affects opacity, never scale.
    // The mid-flip floor is deep enough that a turning card still reads as a
    // card — at 0.08 the four cards of a node became thin glitch-like bars.
    const cw = cardW * breathe * Math.max(0.34, fl) * qFlip;
    // A touch of vertical give at mid-turn sells the rotation.
    const chh = cardH * breathe * (0.94 + 0.06 * fl);

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
    if (qk > 0.004) {
      ctx.fillStyle = `rgba(8,7,9,${qk})`;
      ctx.fill();
    }
    if (rot !== 0) ctx.restore();
  }

  // A very soft feather over the quiet zone — no hard edge, just enough to
  // settle the black cards into the surrounding grid behind the caption.
  const featherAmt = Math.max(quietAmt, quietAmt2, quietAmt3);
  if (featherAmt > 0.01) {
    const gx = world.w * 0.16;
    const gy = world.h * 0.86;
    const gr = Math.max(world.w * 0.42, world.h * 0.5);
    const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
    g.addColorStop(0, `rgba(8,7,9,${0.72 * featherAmt})`);
    g.addColorStop(0.55, `rgba(8,7,9,${0.34 * featherAmt})`);
    g.addColorStop(1, "rgba(8,7,9,0)");
    ctx.globalAlpha = 1;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, world.w, world.h);
  }
  ctx.globalAlpha = 1;
}
