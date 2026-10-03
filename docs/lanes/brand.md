# Lane: Brand + demo assets

Branch `lane/brand`, worktree `/Users/josediaz/dreamhouse-brand`. Read `docs/lanes/README.md` first.

## Goal

A small, distinctive identity the Front can use in 20 minutes, then the demo media. Judges score Design: "clean, polished, not generic AI slop".

## Step 1 — Tokens (deliver within 20 minutes; the Front waits on this)

- `src/styles/tokens.css`: CSS variables and Tailwind v4 `@theme` mappings. Dark by default. One accent colour, a neutral ramp, semantic colours for verdicts (`pass`, `fail`, `unknown` — `unknown` must be visually distinct and not alarming; it is the product's signature state), radius, spacing, a mono font for traces and JSON, a display or sans font. Load fonts through `next/font` (read the Next.js docs in `node_modules/next/dist/docs/` first).
- `src/app/globals.css`: import the tokens; remove the template defaults.
- `docs/brand.md`: palette with hex values, type scale, spacing, 3 do/don't examples. Check WCAG AA contrast on text pairs and say so.
- Commit and push to `dev` at once (see the integration commands in the README).

## Step 2 — Identity (30 min)

- 3 name options for the product (the team name is DREAMHOUSE; the product can differ). Put them at the top of `docs/brand.md` with one line each, and **ask Jose to pick** in your session summary. Do not decide alone.
- Wordmark and mark as SVG in `public/brand/`, plus favicon (`src/app/icon.*`) and an OG image (1200×630).
- Voice: one paragraph. Direct, factual, no hype. Use sourced and unknown as first-class words.

## Step 3 — Demo media (60 min)

Higgsfield (https://higgsfield.ai/) for short b-roll only: a slow coastal-architecture intro clip (5–8 s) and 1–2 background loops for the video's title and closing frames.

- Write the prompts in `docs/video/prompts.md` first (shot, light, camera move, mood; Sea Ranch style: weathered cedar, coastal meadow, modernist, no people).
- Generate with Jose's account; if you cannot log in, stop and give Jose the prompts.
- Label generated footage "illustrative" in the video. It must never stand in for real listing data.
- Save as MP4 under `public/brand/media/`, each file under 20 MB.

## Step 4 — Video kit (by 3:30 PM)

- `docs/video/script.md`: the 2:30 script from `docs/demo-plan.md` §4 with exact on-screen text and a shot list.
- `docs/video/captions.srt` after the script is final.
- Title card and end card as static images or HTML pages sized 1920×1080.
- Recording checklist: resolution, cursor highlight, hide notifications, browser zoom, two takes.

## Definition of done

- Tokens are used by the Front (no hard-coded colours in `src/app/(site)` or `src/components`).
- `pnpm build` passes; favicon and OG image render.
- `docs/brand.md` states contrast results; the name decision is handed to Jose.

## Do not

- Touch `src/app/(site)/**`, `src/components/**`, or `src/lib/**`.
- Use stock gradient blobs, glassmorphism everywhere, or more than one accent colour.
- Generate footage of real people or of any real Sea Ranch property that implies endorsement.
