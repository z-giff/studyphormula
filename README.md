# Phormula

**Make it make sense.**

Phormula is a visual study tool for people who learn by seeing. Instead of a plain
two-sided card, a Phormula flashcard can be a labelled diagram, a flowchart, or a
sketch — and the app turns your own notes, slides, and PDFs into study sets for you.

- **Site:** [phormula.co](https://phormula.co/)
- **Status:** pre-launch. Until `VITE_LAUNCHED` is `"true"`, every route funnels to
  the waitlist page — see [`docs/WAITLIST.md`](./docs/WAITLIST.md) for the gate and
  the developer bypass.

## What's in it

**Four kinds of flashcard**

| Type | What it is |
| --- | --- |
| Standard | Term and definition, with an optional image |
| Interactive | An image with labelled hotspots you fill in from memory |
| Flowchart | A node-and-edge diagram built on a canvas, with a colour palette per node |
| Drawing | A freehand sketch you reproduce |

**Four ways to study a set**

- **Study** — flip through the deck, bookmark what you want to revisit, and save
  what you didn't know into its own set.
- **Quiz** — answer under test conditions and get scored.
- **Swipe** — a fast knew-it / didn't-know-it pass through the stack.
- **Interactive** — label the diagram itself rather than flipping a card.

**Getting cards in**

- **AI generation** from pasted text or an uploaded `.txt`, `.md`, `.doc(x)`,
  `.ppt(x)`, or `.pdf`. Long documents are split into sections, each with its own
  card quota, so nothing gets skimmed.
- **Text detection** on images, so a photo of a page becomes cards.
- **Import** from `.csv`, `.xlsx`, or `.xls`.
- **Manual creation** and a bulk editor for fast cleanup.

**Organisation** — sets live in files, cards can be copied or moved between sets,
and bookmarks collect into a set of their own.

**Premium** — AI generation (Auto-Flashcard), interactive, flowchart and drawing cards,
and the MC Quiz are part of Phormula Premium, a Stripe subscription billed monthly, per semester, or yearly. Everything else is
free. The 7-day free trial includes 3 uses each of Auto-Flashcard, text detection on
interactive cards, and the MC Quiz, and can switch to the paid plan early; a paid plan has
no limits. See [`docs/PAYMENTS.md`](./docs/PAYMENTS.md) for setup and operations.

**Sharing** — share a set or a whole file with up to 25 people at once by email.
They find it under **Shared flashcards** on the dashboard (a red dot marks anything
new), can flip through it read-only, and can add their own copy to their dashboard.
Someone without an account gets an invite email, and the share waits for them until
they sign up with that address.

## Tech stack

- **Vite** + **React 18** + **TypeScript**
- **Tailwind CSS** and **shadcn/ui** (Radix primitives), **Framer Motion** for motion
- **Supabase** — Postgres with row-level security, auth, storage, and Deno edge
  functions (AI generation, text detection, waitlist, transactional email, billing)
- **Stripe** — Checkout and the Customer Portal for Premium subscriptions
- **React Router**, **TanStack Query**, **React Flow** (flowcharts), **pdf.js**,
  **SheetJS**, **Cloudflare Turnstile**

## Running it locally

Requires Node.js 18+ (install via [nvm](https://github.com/nvm-sh/nvm#installing-and-updating)).

```sh
git clone https://github.com/z-giff/studyphormula.git
cd studyphormula
npm install
npm run dev
```

The dev server runs on [http://localhost:8080](http://localhost:8080).

Lovable builds from `bun.lock`, the only lockfile. It points some packages at
Lovable's own package mirror, which isn't reachable from elsewhere, so a local
`npm install` resolves from `package.json` instead.

Create a `.env` in the project root before starting:

```sh
VITE_SUPABASE_URL=            # your Supabase project URL
VITE_SUPABASE_PUBLISHABLE_KEY=# the anon/publishable key
VITE_SUPABASE_PROJECT_ID=     # project ref
VITE_TURNSTILE_SITE_KEY=      # Cloudflare Turnstile site key (waitlist captcha)
VITE_LAUNCHED=false           # "true" opens the full app instead of the waitlist
VITE_DEV_ACCESS_KEY=          # visit /?dev=<key> to bypass the waitlist gate
```

Every `VITE_*` value ships inside the JS bundle, so none of them are secrets.
Server-side keys (service role, AI provider, Turnstile secret, Stripe keys) belong
in Supabase edge function secrets, never here.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build |
| `npm run build:dev` | Build in development mode |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint over the repo |

## Project layout

```
src/
  pages/         Route-level screens (dashboard, set, study/quiz/swipe, waitlist, legal)
  components/    Card editors, canvases, dialogs, and the shadcn/ui primitives
  integrations/  Supabase client and generated database types
  lib/           Launch gate, label masking, MCP tool definitions
supabase/
  functions/     Deno edge functions
  migrations/    Schema history until September 2026
drizzle/
  migrations/    Schema changes since then, applied by Lovable in journal order
docs/
  WAITLIST.md    Pre-launch gate and operations
  PAYMENTS.md    Premium subscriptions with Stripe
  EMAILS.md      Every email Phormula sends, and how to check they all go out
  design/        Rebrand and motion direction
  legal/         Privacy policy and terms drafts
```

## Contributing

Branch off `main`, keep changes focused, and run `npm run lint` and `npm run build`
before opening a pull request.

**Database changes** go in a new migration under `drizzle/migrations/`, the way
Lovable writes them, never as an edit to an existing one:

1. `drizzle/migrations/NNNN_what_it_does.sql`, numbered after the last one.
2. `drizzle/migrations/meta/NNNN_snapshot.json`: a copy of the previous snapshot
   with a new `id`, and `prevId` set to the previous snapshot's `id`.
3. An entry in `drizzle/migrations/meta/_journal.json` whose `when` (milliseconds)
   is later than every entry before it. Drizzle only runs entries newer than the
   last one it applied.

**Nothing on the backend changes when a pull request merges.** Lovable doesn't run
new migrations or deploy changed edge functions when commits sync from GitHub. Ask
it in the project chat to apply the pending migrations first, then to deploy each
changed function, and check them under More → Cloud.
