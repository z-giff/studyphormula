# Phormula Rebrand & Motion Direction — Planning Document (v1)

> **Status: planning only.** Nothing in this document changes product code, features, or workflows.
> Companion file: [`rebrand-direction-preview.html`](./rebrand-direction-preview.html) — an interactive
> version of this plan rendered *in the proposed design system*, with live motion previews
> (hero, flock/formation demo, icon-to-text hover interaction). Open it in a browser.

---

## 1. Creative direction statement

**The Night Study.** *Phormula is the warm light on at midnight — the feeling of studying late and not being alone.*

- The canvas is deep and calm — the darkness of **focus**, not of technology.
- Everything warm in the interface is **knowledge behaving like light**: the swirl, the flashcards,
  progress, and every call to action carry the ember gradient of the logo. Cold UI chrome recedes;
  warm content advances.
- The flashcard is the **atom of the brand**. Alone it is a scrap of paper; in motion, thousands
  behave like a murmuration — scattered facts organizing into shapes you can recognize and keep.
  That one metaphor — *pieces becoming pattern* — drives the homepage story, loading states,
  empty states, and study-mode iconography. Nothing moves unless it tells that story.
- Tone: technological but human (hand-drawn mark, serif voice, handwritten annotations),
  trustworthy (restrained palette, generous space, no neon), premium (few elements, precisely
  finished), motion-led but calm (one hero moment per viewport; everything else quiet).

## 2. Visual direction options

| | A — Lamplight | B — Observatory | **C — Ember & Ink (recommended)** |
|---|---|---|---|
| Temperature | Warmest: amber-biased browns under black, cream text | Coolest: indigo-black, starfield, cards as constellations | Plum-biased near-black leaning *toward* the logo's pink |
| Feels like | A cosy desk lamp | Deep space; the warm mark as the only sun | A dark room lit by what you're learning |
| Strength | Most human | Closest to the brainstorm video; most cinematic | One temperature family from black to pink; scales from cinematic homepage to utilitarian dashboard |
| Risk | Drifts café-brand soft; "technological" fades | Cool base + warm logo reads as two brands; "vast" can feel distant | — |

## 3. Recommended direction

**Ember & Ink** as the structural system, borrowing deliberately:

- from **Observatory**: depth on the homepage only (parallax layers, micro-stars at 2–3% opacity,
  blur-graded distance);
- from **Lamplight**: the emotional register of the copy and the glow treatment around primary actions.

The dashboard uses none of the starfield — depth there comes from surface elevation, not space.

## 4. Homepage storyboard (one story, nine scenes, ≈900vh)

All cinematic motion is mapped to **scroll progress** (never scroll-jacking; native scroll always
works; state is a pure function of scroll offset so it is resumable anywhere).

| Scene | Range | What happens |
|---|---|---|
| **S0 Arrival** | 0–100vh | Black. Swirl draws itself on (stroke-dashoffset, 900ms ease-out); wordmark fades up +300ms; tagline; then **Sign in** (ghost) and **Start studying** (gradient) rise 12px into place — auth lives in the hero as primary actions. Ambient: two breathing light fields (9s / 12s, offset), micro-stars at 2%. |
| **S1 The exhale** | 100–180vh | Not a fade: wordmark letters gain tracking (+0.06em / 10% progress); swirl scales 1→1.6 while stroke thins and opacity falls; tagline words drift on individual vectors; 0→6px blur; group parallaxes up at 0.4× — you move *through* the mark. CTAs shrink and dock to the top-right, becoming the persistent nav actions. |
| **S2 The flock arrives** | 180–300vh | Tiny flashcards emerge **bottom-left**, riding a diagonal current with an S-bend toward upper-right. Three depth layers (far: smaller/dimmer/1px blur/0.6× parallax; near: 1.15×). Cards bank along velocity like birds. Caption: *"Every subject starts as a thousand scattered pieces."* |
| **S3 The field** | 300–360vh | The current decelerates; cards settle into a loose grid filling the viewport (the brainstorm's full-screen field, arrived-at rather than cut-to). Settling staggers in 40ms waves by distance from origin corner. Caption: *"Alone, they're just cards."* |
| **S4 Formation 1 — The First Desk** | 360–460vh | ~18% of cards flip (3D Y-rotation, 550ms, staggered radially from the image centroid) to their **ink face**, forming: *a child at a desk, a guardian leaning in beside them.* Caption: *"We all started with someone beside us."* |
| **S5 Formation 2 — The Desk Becomes Yours** | 460–560vh | The image **morphs**: the guardian's cards un-flip, lift out of the grid, and orbit the remaining figure — now older, alone at a laptop. The helper becomes the flock around the learner: *Phormula takes the seat beside you.* Caption: *"Then one day the desk is yours. Phormula sits with you."* |
| **S6 Four ways to study** | 560–700vh | The orbiting cards demo each mode in turn — **the flock is the product demo**. Standard: a card enlarges and flips Q→A. Interactive: dots appear on a card image, labels connect. Flowchart: cards link with drawn edges into a small graph. Drawing: an ember stroke sketches across a card face. Each vignette pairs with a claim + one line of real DOM text. Persistent nav visible from here on. |
| **S7 Proof & founder note** | 700–780vh | Motion rests. 2–3 short testimonials as flipped ink cards at readable scale; simple usage numbers if available; a ~60-word founder note in Fraunces with a Caveat handwritten sign-off. |
| **S8 The swirl & the ask** | 780–880vh | Every card releases and streams into the final formation: **the Phormula swirl itself**, breathing once. Beneath: *"Make it make sense."* + gradient CTA **Start studying — it's free**. |
| **S9 Footer** | 880–900vh | Ink-1 surface: small swirl + wordmark, product links, legal, theme note. A few stray cards drift behind at 3% opacity. |

## 5. Motion storyboard — flock & image formation

(Live sketch of these four beats is in the companion HTML.)

| Beat | Choreography | Spec |
|---|---|---|
| **Emerge** | Spawn along a source arc bottom-left; velocity field = broad diagonal current + two gentle vortices; cards bank ±14° along velocity; 3 depth layers | ≈1,800 cards desktop · spawn staggered over 1.8s · field speed 60–110 px/s · parallax 0.6× / 1× / 1.15× |
| **Settle** | Each card acquires a grid slot; critically-damped spring to position; rotation → 0; brightness evens | grid ≈ 56×30 desktop · spring ω 4.2, ζ 1 · 40ms wave stagger |
| **Form** | Mask sampled from a 2-tone illustration bitmap; matching cells flip to ink face with 6px z-lift, staggered radially from mask centroid; non-image cards dim 12% | flip 550ms ease-out · radial stagger 500ms total · ~18% of field flips |
| **Release** | Cells un-flip, field re-enters the current and exits top-right — or, for the finale, streams into the swirl path and orbits it | release 1.4s · exit accel 1.6× · finale orbit 40 px/s |

Reduced-motion visitors get composed still frames of each beat, crossfading 150ms at section
boundaries — the story survives without the motion.

## 6. Formation image concepts

Human scenes require a commissioned 2-tone illustration rasterized into the card grid; any
silhouette with clear negative space reads at ≈56×30 cells (mobile: designed to survive 28×16).

Recommended three-beat arc (●):

1. ● **The First Desk** — child at a desk, guardian leaning in. Memory, guidance, human before technological.
2. ● **The Desk Becomes Yours** — same desk, learner grown, alone at a laptop; the guardian's cards now orbit the learner. Growth, independence, Phormula as the new companion. (A morph, not a new image.)
3. ● **The Swirl** — the entire field streams into the brand mark at the CTA. Transformation, identity, "make it make sense."

Alternates:

- **The Constellation** — flipped cards become stars, hairline edges connect them into a figure. Pattern recognition; strong alternative for S6's flowchart vignette.
- **The Window at Night** — dark building, one warm window lit. Every student knows this window; candidate backdrop for the founder note.
- **The Path Up** — switchback trail, small figure partway. Reserve for a future progress page; keeping the homepage to one arc matters more.

## 7. Copy & captions

| Scene | Copy | Placement / set |
|---|---|---|
| S0 | **Phormula** — *Reformulating your study methods.* | Centered lockup; tagline Fraunces italic 21px |
| S2 | *Every subject starts as a thousand scattered pieces.* | Right third, at 40% scene progress |
| S3 | *Alone, they're just cards.* | Center; exits with the first flips |
| S4 | *We all started with someone beside us.* | Left third, beside formation |
| S5 | *Then one day the desk is yours. Phormula sits with you.* | Two lines; second +300ms |
| S6 | **Study four ways.** One claim + one line per mode, e.g. *"Flowchart — see how it connects."* | Claims Manrope 700 |
| S7 | Founder note ~60 words, first person, Caveat sign-off | Fraunces 19px, 54ch measure |
| S8 | *Make it make sense.* → **Start studying — it's free** | 40px Fraunces; gradient CTA |

Voice rules: narrative lines are serif italic, ≤ 9 words, no exclamation marks; UI copy is
Manrope, verb-first ("Create set", "Import cards"); never say "AI-powered" — show Auto-Flashcard
doing the work instead.

## 8. Colour system — "Ink, then ember"

Plum-biased dark ramp (hue ≈ 275°, chroma rising slightly with elevation). Warm hues reserved
for meaning: brand, action, progress, focus.

### Surfaces & lines

| Token | Hex | Use |
|---|---|---|
| `ink-0` page | `#0E0B12` | homepage canvas, app background |
| `ink-1` raised | `#151019` | nav, panels, footer |
| `ink-2` card | `#1C1622` | set cards, inputs, modals |
| `ink-3` overlay | `#241D2C` | popovers, hover surfaces |
| `line` | `#2A2233` | default borders |
| `line-strong` | `#3A3046` | interactive borders |

### Text

| Token | Hex | Contrast on ink-0 | Use |
|---|---|---|---|
| `text-hi` | `#F3EFF6` | 17.2:1 | headings, body |
| `text-mid` | `#ABA1B6` | 7.9:1 | secondary |
| `text-low` | `#756B80` | 3.9:1 | decorative/disabled **only** — never information |

### Brand & semantic

| Token | Hex | Contrast on ink-0 | Use |
|---|---|---|---|
| `amber` | `#F7A03E` | 9.4:1 | gradient start |
| `ember` (accent) | `#F2795F` | 7.1:1 | links, focus ring, active states |
| `pink` | `#EE5D9B` | 6.2:1 | gradient end |
| ember gradient | `118°: #F7A03E → #F2795F → #EE5D9B` | — | primary CTA, progress fills, logo, selection |
| `success` | `#7CC7A1` | 9.8:1 | "learned" states |
| `danger` | `#FF6B6B` | 7.0:1 | destructive, "not learned" |

### Deck colours, recalibrated for dark

Same seven slots users already know, re-tuned as luminous pastels (used as spines, dots and 12%
tints — never full fills):

`blue #6FC3FF · red #FF7A85 · green #7ED9B4 · purple #C9A6FF · yellow #FFD966 · pink #FF8FC0 · teal #59D3DD`

### Usage rules

- **Text on the gradient is always ink `#1A0F0A`** (6.9:1). White on ember fails (2.7:1) — never white-on-gradient.
- Body text ≥ 4.5:1; large text and icons ≥ 3:1.
- **Glow budget: at most one glowing element per viewport** (hero mark, or primary CTA, or active
  study card). Glows are shadows of the gradient colours ≤ 35% opacity — never `filter: brightness`.
- Gradient appears only on: logo, primary CTA, progress fills, active-mode ring, selection.
  Everything else uses flat `ember`.
- Hover = surface up one step (ink-2→ink-3) + border up one step. Pressed = scale .97, no colour change.
- Deck colours never colour text.

## 9. Typography

- **Display / narrative: Fraunces** (variable 300–700 + italic) — a serif with the same slight
  wonk as the hand-drawn logo. Brand voice, hero, poetry lines, set names, card content.
- **Interface: Manrope** (400–800) — geometric-humanist sans; UI, body, labels, buttons.
- **Annotation: Caveat** (kept from current system) — margin notes, empty states, founder sign-off;
  connects UI back to the hand-drawn mark.
- Delivery: latin subsets (~180KB total), `font-display: swap`, metric-matched fallbacks
  (Georgia / system-ui) to prevent layout shift.

| Role | Face | Desktop | Mobile | Notes |
|---|---|---|---|---|
| Hero / narrative | Fraunces 380–460 | 64–76px / 1.05 | 40px | −0.02em; italic for poetry |
| H1 page title | Fraunces 460 | 40px / 1.15 | 30px | set names, file names |
| H2 section | Manrope 800 | 22px / 1.25 | 19px | −0.01em |
| Body | Manrope 400–500 | 15–16px / 1.6 | 15px | measure ≤ 68ch |
| Card term/answer | Fraunces 420 | fluid 20–34px | 18–26px | study content is serif — content is the brand |
| Label / eyebrow | Manrope 800 | 11px, +0.14em caps | 11px | text-low or ember |
| Buttons | Manrope 700 | 14.5px | 15px | sentence case, verb first |
| Tooltips | Manrope 600 | 12.5px | — | ink-3 surface |
| Numbers / stats | Manrope 700 | `tabular-nums` | — | wherever digits align |

## 10. Page layout concepts

### Auth ("the desk lamp") — sign-in & sign-up share one layout

- Left 45%: ink-0 canvas, sparse drifting flock (≈40 cards, 8s loop), one narrative line
  (sign-in: *"Pick up where you left off."* · sign-up: *"Your first set takes two minutes."*).
- Right 55%: ink-1 panel with the form. Google OAuth first, email under it.
- Arriving from the hero, the panel **assembles**: 5–6 flock cards glide in and resolve into the
  form fields (450ms) — auth's one moment of theatre.
- Turnstile and OAuth-consent keep their exact logic; restyle only.

### Dashboard ("the quiet desk")

- **Nav:** slim top bar — swirl + wordmark, ⌘K search, streak, avatar. **Auto-Flashcard** is a
  gradient action beside search — the only gradient on the page.
- **Files rail** (left): folders as rows with deck-colour dots; drag-to-move preserved; Bookmarks entry.
- **Content:** current file as serif title + sort pills (recent · A–Z · most cards); responsive set-card grid.
- **Set cards:** ink-2 surface, 3px deck-colour spine, serif set name, tabular card-count +
  last-studied, 3px gradient progress bar. Hover: lift to ink-3, spine glows softly.
- **Create New Set:** ghost card at the end of the grid (dashed border, plus, Caveat "new set").
- **Study-mode controls:** four fixed circles above the grid (see §11).
- **Empty states:** sparse drifting cards + Caveat annotation with an arrow to the create action.
- **Modals:** ink-2, radius 16, scale .98→1 + fade 240ms; backdrop ink-0 @ 70% with 6px blur.
  **Popovers:** ink-3, 200ms, origin-aware.
- **Study screens:** ink-0 canvas so cards are the light source; card faces ink-2 with serif
  content; flip 550ms; swipe keeps green/red affordances at the new semantic values.

## 11. Icon-to-text hover transformation (study-mode controls)

Fixed-size circular controls; **content** crossfades inside the shape; zero layout shift.
(Live implementation in the companion HTML.)

| State | Treatment | Timing |
|---|---|---|
| Rest | 92px circle, ink-2, line-strong border, 30px icon in text-mid. Icons: Standard = stacked cards · Interactive = image + detection dots · Flowchart = connected nodes · Drawing = pen | — |
| Hover / focus-in | Icon scales 1→.86 and fades; label fades in rising 7px; border warms to ember @53%; soft lift shadow | icon out 140ms ease-in · label in 220ms ease-out delayed 90ms · total ≈310ms |
| Leave | Reverse, label leads | label out 180ms · icon in 180ms ease-out |
| Active | 1.5px gradient ring (border-box gradient), icon tinted `#FFB59B`, **persistent dot + "active" text below** the control (two indicators, not colour-only) | ring 200ms |
| Keyboard | Same reveal on `:focus-visible` + 2px ember outline, 3px offset; `aria-pressed` + `aria-label` on each button | identical to hover |
| Touch / mobile | **Label always visible beneath the icon** (11px) — no hover dependency, no extra tap. 64px controls, 4-across. Tap = select, exactly as today | no transformation on touch |
| Reduced motion | Immediate crossfade — no scale, no slide | 120ms linear opacity |

Labels fit at 92px with a two-line break; if a locale overflows, all four controls become
96×108 vertical ovals **together** — never one at a time. Click behaviour and destinations are
untouched (see §15).

## 12. Motion system · responsive · accessibility

### Tokens

| Token | Value | Used for |
|---|---|---|
| `ease-out-soft` | `cubic-bezier(.22, 1, .36, 1)` | every entrance, reveal, hover-in |
| `ease-in-soft` | `cubic-bezier(.55, 0, .55, .2)` | exits/returns — always slightly faster than entrances |
| `t-instant` 120ms | button press, toggles | feedback feels immediate |
| `t-quick` 200ms | hovers, popovers, tooltips | |
| `t-soft` 320ms | icon→text, tab switches, accordion | |
| `t-gentle` 480ms | modals, page crossfade (through ink-0, content rises 12px), drawers | |
| `t-cinematic` 550–900ms | card flips (550), hero draw-on (900), formation beats | homepage + study flip only |
| Scroll grammar | progress-mapped, 0.1 lerp smoothing | native scroll never hijacked |
| Loading | 3-card shuffle loop, 1.2s; skeletons = ink-2 blocks with 6% shimmer | one loader everywhere |
| Logo | draw-on 900ms once per session; hover = one slow breath; never spins | |

### Responsive

- **Desktop/laptop:** full experience; flock ≈1,800; DPR capped at 2.
- **Tablet:** flock ≈900, two depth layers, scenes shorten to ~80vh.
- **Mobile:** flock ≈350 on a coarser grid (formations read at 28×16 cells); captions become
  stacked scenes; hero identical minus particle stars. Low-memory devices or first-frame render
  >24ms → pre-rendered poster sequence (stills + crossfades).
- **Touch:** mode labels always visible; hit targets ≥44px; swipe study unchanged.

### Accessibility

- `prefers-reduced-motion`: cinematic → still-frame crossfades; UI → 120ms opacity; flock paused
  on a composed frame.
- All narrative copy is real DOM text (SEO + screen readers); canvases are `aria-hidden` with the
  story text adjacent.
- Focus order follows the story; skip-link to main CTA; 2px ember focus ring everywhere.
- Learned/not-learned always pairs colour with icon + label.
- Body ≥15px, captions ≥12.5px; 200% zoom without horizontal scroll.

## 13. Components to redesign later (phased)

| Phase | Scope | Files (today's names) |
|---|---|---|
| 1 | Design tokens: colours, radii, shadows, fonts, motion vars; dark becomes `:root` default, current light palette preserved as `.light` | `src/index.css`, `tailwind.config.ts`, `ThemeProvider.tsx`, `ThemeToggle.tsx` |
| 2 | Core UI kit re-theme | `components/ui/*` — button, card, dialog, popover, input, select, tabs, toast, tooltip, progress, skeleton |
| 3 | New homepage (hero, flock engine, formations, sections) | `pages/Index.tsx`; replaces `FlashcardSequence.tsx`, `ScrollFlashcardHero.tsx`, `GlowSphere.tsx`, `LogoOrb.tsx` → new `SwirlMark` |
| 4 | Auth + consent + waitlist | `pages/Auth.tsx`, `OAuthConsent.tsx`, `Waitlist.tsx`, `TurnstileWidget.tsx` |
| 5 | Dashboard: nav, files rail, set cards, mode controls, empty states, ⌘K | `pages/Dashboard.tsx`, `File.tsx`, create/file/move/rename dialogs, `ProfileSheet`, settings |
| 6 | Set view + editors + dialogs | `FlashcardSet.tsx`, `BookmarksSet.tsx`, flashcard create/edit/import/copy/auto dialogs, `BulkFlashcardEditor`, `ImageUploader` |
| 7 | Study surfaces | `StudyMode.tsx`, `QuizMode.tsx`, `SwipeStudy.tsx`, `InteractiveFlashcard*`, `Flowchart*`, `Drawing*`, `StackedFlashcardDeck`, `SwipeCard`, completion dialogs |

## 14. Risks, performance & technical considerations

**Performance**
- 1,800 animated cards require a single instanced canvas/WebGL pass — never DOM nodes.
  Budget <8ms/frame on a mid-range laptop; measure first frames and auto-drop density tiers.
- Cap DPR at 2; pause canvases off-viewport (IntersectionObserver) and on tab blur; hero idle
  animations stop after 30s without input (battery).
- LCP: hero text is DOM, canvas paints behind it; subset fonts (~180KB) with metric fallbacks.

**Design risks**
- **Mask art quality decides the formations.** Commission/curate 2-tone silhouettes; prototype
  "The First Desk" at 56×30 cells before committing to the arc.
- Scroll fatigue: total ≤ ~9 viewports; persistent nav from S6 gives impatient visitors the CTA.
- Pink-on-dark drifts "neon" if overused — enforce the glow budget and flat-ember rule.
- Dark-first OG images, favicons, emails need their own light-context pass.

**Compatibility**
- Safari: `-webkit-backface-visibility` care on 3D flips; blur layers are expensive on iOS —
  prefer pre-blurred sprites.
- `Save-Data` header → poster mode automatically.
- Formation state must be a pure function of scroll progress (resumable at any offset, no timelines).

**Migration**
- Ship dark as default with a one-time "new look" note and an obvious theme toggle; keep light maintained.
- Deck colours change values, not identities — sets keep their assigned slot.
- Roll out homepage (phase 3) separately from app re-theme (phases 5–7).

## 15. Functionally unchanged

- All four study modes — Standard, Interactive, Flowchart, Drawing — behaviour, destinations, workflows.
- Creating/editing/importing/copying/moving/renaming/deleting sets, files, cards; Bulk editor; Auto-Flashcard logic.
- Quiz and Swipe logic; learned/not-learned flows; "save not learned"; bookmarks.
- Auth: Google OAuth, email flows, Turnstile, OAuth consent, waitlist mechanics.
- Routes and navigation structure; Supabase data model and integrations; profile/settings behaviour.
- Deck-colour *assignments* (the seven slots and which set owns which).
- Light theme availability (becomes secondary rather than default).

---

## Open questions before any build begins

1. Confirm **Ember & Ink** as the direction (or push warmer / cooler).
2. Approve the three-beat formation arc: **First Desk → Desk Becomes Yours → Swirl**.
3. Confirm **Fraunces** as the display voice (alternate specimens available on request).
4. Share the Canva stills (homepage / sign-in / sign-up / dashboard) so layout details can be reconciled — this plan was built from the two screen recordings and the final logo.
