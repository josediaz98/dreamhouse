# Brand — DREAMHOUSE

Owner: Brand lane. Tokens live in `src/styles/tokens.css`, fonts in `src/styles/fonts.ts`. This file is the reference; the CSS is the source of truth.

## Palette

Dark only. Neutral ramp is a weathered-cedar fog (slightly green-warm). One accent. Three verdict colours.

| Token (Tailwind utility) | Hex | Use |
|---|---|---|
| `bg` / `ink-950` | `#0d0f0e` | Page background |
| `surface` / `ink-900` | `#131614` | Cards, panels |
| `raised` / `ink-850` | `#1a1e1b` | Hover, inputs, trace rows |
| `ink-800` | `#222723` | Subtle fills |
| `line` / `ink-700` | `#2a302c` | Hairline borders |
| `line-strong` / `ink-600` | `#3b423d` | Dividers that must read |
| `ink-500` | `#5a625b` | Decorative only (below AA as text) |
| `faint` / `ink-400` | `#858d85` | Tertiary text, labels |
| `muted` / `ink-300` | `#a3aaa2` | Secondary text |
| `ink-200` | `#c9cdc5` | Body on hover |
| `fg` / `ink-100` | `#ecebe4` | Primary text |
| `accent` | `#d8a24a` | The one accent: CTA, focus ring, key number |
| `accent-strong` | `#e6b660` | Accent hover |
| `accent-ink` | `#14100a` | Text on accent |
| `pass` | `#7fbf8e` | Verdict pass. Soft `#222e25`, line `#3c5a45` |
| `fail` | `#e8695c` | Verdict fail. Soft `#31221e`, line `#6a3a33` |
| `unknown` | `#93a8e0` | Verdict unknown. Soft `#252a31`, line `#3f4a66` |

**Why `unknown` is fog blue.** It is the product's signature state. Not red (it is not a failure), not amber (the accent is warm and would collide). Cool and calm, and always paired with a second cue: a dashed edge (`.unknown-edge`) and a `?` glyph, so it never relies on colour alone.

## Type

| Role | Family (CSS var) | Utility | Use |
|---|---|---|---|
| Display | Fraunces (`--font-fraunces`) | `font-display` | Headlines, wordmark, big counters |
| UI | Instrument Sans (`--font-instrument-sans`) | `font-sans` | Body, controls |
| Mono | IBM Plex Mono (`--font-plex-mono`) | `font-mono` | Traces, JSON, IDs, receipts, `.label` |

Scale (size / line height): `xs` 12/18 · `sm` 14/22 · `base` 16/26 · `lg` 18/28 · `xl` 22/30 · `2xl` 28/34 · `3xl` 36/40 · `4xl` 48/52 · `5xl` 64/68 · `6xl` 88/88 (hero only). Headlines use `tracking-display` (-0.02em). Labels use `.label` (mono, 12 px, uppercase, +0.08em).

## Spacing, radius, elevation

- 4 px grid (`--spacing: 0.25rem`): use Tailwind steps `1`=4, `2`=8, `3`=12, `4`=16, `6`=24, `8`=32, `12`=48, `16`=64.
- Radius: `rounded-md` 6 px controls, `rounded-lg` 8 px cards. Pills only for status chips.
- Elevation: borders first (`border-line`), `shadow-raised` only on the one panel that must float.
- Motion: `ease-out-quint`, 150–250 ms. `prefers-reduced-motion` is honoured in `globals.css`.

## Wiring (Front)

1. In `src/app/layout.tsx`: `import { fontVariables } from "@/styles/fonts"` and put it on `<html className={fontVariables}>`. Remove the Geist imports.
2. Use utilities: `bg-surface text-fg border-line`, `text-pass bg-pass-soft border-pass-line`, `font-mono`, `font-display`.
3. No hex, no `zinc-*`, no `black/white` in `src/app/(site)` or `src/components`.

## Contrast (WCAG 2.x, computed)

AA needs 4.5:1 for normal text and 3:1 for large text and UI components. Script: ratios computed from the hex values above; verdict-soft backgrounds are the verdict colour at 14% over `surface`.

| Pair | Ratio | AA text |
|---|---|---|
| `fg` on `bg` | 16.09 | pass |
| `fg` on `surface` | 15.24 | pass |
| `fg` on `raised` | 14.11 | pass |
| `muted` on `bg` / `surface` / `raised` | 8.09 / 7.66 / 7.09 | pass |
| `faint` on `bg` / `surface` / `raised` | 5.63 / 5.33 / 4.93 | pass |
| `accent` on `bg` / `surface` / `raised` | 8.41 / 7.97 / 7.38 | pass |
| `accent-ink` on `accent` (button) | 8.29 | pass |
| `pass` on `bg` / `surface` / `raised` | 8.93 / 8.46 / 7.82 | pass |
| `fail` on `bg` / `surface` / `raised` | 6.05 / 5.73 / 5.30 | pass |
| `unknown` on `bg` / `surface` / `raised` | 8.17 / 7.74 / 7.16 | pass |
| `pass` on `pass-soft` | 6.56 | pass |
| `fail` on `fail-soft` | 4.79 | pass (tightest pair) |
| `unknown` on `unknown-soft` | 6.13 | pass |

Not AA as text: `ink-500` (`#5a625b`), use for decoration and disabled states only. Borders (`line`) are decorative; any border that carries meaning must also have a text or glyph cue.

## Do / don't

1. **Do** show an unknown as a dashed-edge chip with `?` and the reason ("FEMA zone D: undetermined"). **Don't** colour it red or hide it behind a pass.
2. **Do** set numbers and IDs in mono with tabular figures and label fixtures "demo data". **Don't** invent metrics, logos or testimonials.
3. **Do** use one accent for the single most important action per screen. **Don't** add a second accent, purple gradients, glow blobs, or glassmorphism on every card.
