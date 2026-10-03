# Front redesign — "to be" (progressive disclosure)

Owner: Front lane. Coordinator verifies on the Preview URL before anything reaches `main`.
**Deadline: pushed to `dev` and working on the Preview URL by 3:00 PM PDT.** If it is not verified by 3:15, production keeps the current landing and we record with it.

## Why

Design is one of the four judging criteria. Today the landing shows everything at once: hero, form, trace, a full verdict, the ranked list, the parcel sheet and the before/after, all at the same weight. A judge does not know where to look. Reference: firecrawl.dev, one central input box, summarised results, details on demand (Results / JSON). Keep **our** brand: dark, one gold accent, Fraunces + Instrument Sans + IBM Plex Mono, tokens from `src/styles/tokens.css`. Do not copy Firecrawl's light theme, orange, pixel grid or announcement bar.

## Principles

- Above the fold at 1440×900: header, hero and the command box. Nothing else. No list, no JSON, no trace.
- One primary action per screen. Everything else is one click deeper.
- Loading the page performs no writes (no `ask_seller` on load).
- Every number comes from the API. No invented metrics.

## Page, top to bottom

### 1. Header
Wordmark left. Right: `Seller console` link, then a secondary button **Connect your agent** that opens a small popover with tabs `Claude Code` / `cURL` / `MCP URL`, each with a copy button. Content:
- Claude Code: `claude mcp add --transport http lotline https://dreamhouse-chi.vercel.app/mcp`
- cURL: a `POST /api/tools/search_properties` example with the 26 ft program
- MCP URL: `https://dreamhouse-chi.vercel.app/mcp`

The long `claude mcp add` line leaves the hero.

### 2. Hero (centred)
- Eyebrow chip, from live data: `The Sea Ranch, CA · {n} lots · live county data`
- H1, two lines, centred: `Can I build on this lot?` / `Your agent can finally answer.`. The second line in the accent colour.
- Sub, one line: `Agent-readable property specs for coastal land. Every fact sourced. Every unknown explicit.`
- **Command box** (the Firecrawl search box, in our tokens): one raised card, max width ~880 px.
  - Top row: the house program shown as editable chips, not free text: `2 stories` · `26 ft tall` · `2,155 sq ft footprint` · `400 sq ft deck` · `under $400,000`. Clicking a chip lets you change its value (number input in a small popover). Defaults are the demo program. Use `maxPriceUsd` for the budget.
  - Bottom row: segmented tabs `Search lots` (default) | `Check a lot`, and the accent arrow button on the right. Enter submits.
  - `Check a lot` swaps the chips row for the address/APN input and the preset chips (real ingested lots only).
  - No fake natural-language parsing. The chips are the honest version of a prompt.

### 3. Results (appear under the hero after submit; smooth scroll to them)
- Header row: `Results ({n})` + one muted line `2 ruled out · 4 need answers from the seller` (from the API), and on the right the segmented `Results | JSON` toggle (JSON shows the raw `search_properties` response).
- Under the header, a closed disclosure: `Show agent tool calls ({k})`. Opening it shows the existing trace panel. Closed by default.
- One card per lot, sorted: pass, then unknown (fewest unknowns first), then fail (dimmed, at the bottom):
  - Left: verdict badge. Then address, then a mono line `$120,000 · 0.45 ac`.
  - One reason line: fail → `Ruled out: limit 24 ft (Design Manual §6.3); your house is 26 ft` · unknown → `3 unknowns: septic, water, flood zone` · pass → `Passes every rule we can check`.
  - Right: a quiet button **View checks**. Clicking it expands the card inline with the existing verdict list (Readable / JSON toggle, sources and pages, `question open` tags linking to the seller console). Only one card open at a time.
- Realtime: when a seller answers, the matching card's badge and reason update and the card gets the existing highlight.

### 4. Below the fold (numbered eyebrows `01`–`03`, mono, muted)
1. `01 How it works`: three short columns, Ingest → Decide → Ask, one sentence each ("Claude extracts, rules decide, unknowns become seller questions").
2. `02 Where the facts stop, the line is dashed.`: the parcel sheet, unchanged.
3. `03 Guessing vs knowing`: the before/after, with the left bullet changed to **"May invent setbacks and a height limit from general knowledge."**

Footer: data sources and the Sonoma disclaimer ("planning purposes only, not parcel-specific decisions"), plus `Seller answers in the demo are typed by the presenter.`

Remove from the landing: the separate counters strip and receipts panel (keep the code; do not delete components other lanes or tests use).

### 5. Seller console
Unchanged, including the split view with the buyer's list on the right. If the list component is reused, it may adopt the new card design.

## States

- Loading: skeleton cards (3), no spinner wall.
- Empty (no lot matches the budget): one sentence + a chip to remove the budget.
- Error: one plain sentence + Retry. Never raw JSON or a stack trace.
- 390 px: command box full width, chips wrap, tabs full width, cards stack, `View checks` becomes the whole card tap target.

## Acceptance (Front verifies in a real browser, then reports)

- [ ] 1440×900 first screen shows only header, hero and command box.
- [ ] Arrow (or Enter) → results in about 1 s, with `2 ruled out` at 26 ft.
- [ ] `View checks` on Timber Ridge shows height pass, coverage pass, septic / water / flood unknown, each with its source.
- [ ] Trace and JSON are closed until opened.
- [ ] Answering a Timber Ridge question in `/seller` updates its card live in another tab.
- [ ] No horizontal scroll at 390 px; focus visible; tap targets ≥ 44 px.
- [ ] `pnpm typecheck`, `pnpm test`, `pnpm build` pass. No fixture data on screen.
- [ ] If you answer seller questions while testing, run `pnpm demo:reset` (Back's script) afterwards.

Report: the Preview URL of your last `dev` deploy, the commit id, and 1440 + 390 screenshots of the first screen and of an expanded card.
