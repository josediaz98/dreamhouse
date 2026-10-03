# Video script — 2:30

Source: `docs/demo-plan.md` §4. Final file: MP4, under 100 MB. **Check the hackathon rules page for a maximum length** (unconfirmed).

## Fill before recording (placeholders in `{braces}`)

Every number on screen and in the voice-over comes from the real database, never from fixtures. The coordinator supplies these after the real rows exist.

| Placeholder | Meaning | Source |
|---|---|---|
| `Lotline` | Product name | Jose's pick, `docs/brand.md` |
| `{N}` of `{M}` | Lots that cannot hold the example house / lots listed | `search_properties` → `eliminatedCount`, `items.length` |
| `{X}` sq ft, `{Y}` ft | The example house program (footprint, height) | The prompt used in the live flow |
| `{n}` | Lots the agent searched | `search_properties` → `items.length` |
| `{K}` | Visits avoided at the end of the flow | `eliminatedCount` counter |
| `{U}` | Unknowns on the lot we follow | `unknownCount` |
| `{FIELD}` | The unknown we resolve (septic, tract-map height cap or flood zone) | `questions` row |
| `{CALLS}` / `{USD}` | Calls in the receipt and sandbox amount | `GET /api/calls` |

Rule of thumb: if a number is not in the database yet, cut the sentence. Do not say "1–2 years" for design review as fact; it comes from a press article.

## Cues (voice-over target ≈ 330 words, 150 wpm)

Type: **cut** (hard cut), **live** (screen recording of the deployed URL), **card** (static from `docs/video/cards/`), **b-roll** (Higgsfield, labelled "illustrative").

| # | Time | Type | Shot | On-screen text (exact) | Voice-over (exact) |
|---|---|---|---|---|---|
| 1 | 0:00–0:06 | b-roll → cut | `intro.mp4` slow dolly toward a cedar house, 4 s, then cut to a listing page beside the Design Manual PDF | Lower-left, small: `illustrative` (b-roll only). Then: `{N} of {M} listed lots` | "At The Sea Ranch, {N} of {M} listed lots can't hold a {X} square foot, {Y} foot house." |
| 2 | 0:06–0:15 | live | Listing page; highlight price and acres; PDF page with the height rule beside it | `No listing says so.` / `Rule: Sea Ranch Design Manual, p.{P}` | "No listing says so. The rules sit in a fifty-two page manual and county maps. Buyers drive out to find the answer." |
| 3 | 0:15–0:25 | card | `title.png` over `loop-title.mp4` (25% under the dark overlay) | `Can I build on this lot?` / `Your agent can finally answer.` | "Lotline makes a lot's facts readable by an agent. Every field is sourced. Every unknown is explicit." |
| 4 | 0:25–0:35 | live | Hero of the live URL, install line visible, cursor on the CTA | `Agent-readable property specs for coastal land.` | "Four tools over MCP, or a pay-per-call API. One question: can I build here?" |
| 5 | 0:35–0:50 | live | Buyer prompt typed into the agent; trace panel starts | Prompt: `Find me a lot under {PRICE} where I can build a {X} sq ft, {Y} ft house with a deck.` | "The buyer tells their agent what they want to build." |
| 6 | 0:50–1:05 | live | Trace: `search_properties` → `{n}` lots returned; unknown counts per lot | Trace lines in mono: `search_properties ✓ {ms} ms` | "The agent searches {n} lots. Each comes back with what is known and what is not." |
| 7 | 1:05–1:20 | live | `check_buildability` runs per lot; failing rows turn red with the rule and source; counter ticks up | `fail · height 16 ft (tract map) · your house {Y} ft` / `Visits avoided: {K}` | "Verdicts are computed from the rules table, not by the model. These lots fail on height, coverage, setbacks. The agent never drives out to them." |
| 8 | 1:20–1:30 | cut | **Before/after**, one cut: left "Agent without spec", right "With spec" | Left: `Guesses from listing text · invents setbacks · sounds sure` / Right: `Conditional · {U} open questions · each sourced` | "A generic model guesses and sounds sure. Here the answer is conditional, and every line has a source." |
| 9 | 1:30–1:45 | live | Verdict JSON for the lot we follow: pass, fail, one `unknown` chip (dashed edge, `?`); source links | `unknown · {FIELD}` / `Sonoma data: planning purposes only` | "One lot passes everything we can check. One rule is unknown: {FIELD}. Unknown is an answer, not an error." |
| 10 | 1:45–1:55 | live | Trace: `ask_seller` → question text appears, "{U} unknowns → seller questions drafted"; split screen opens the seller console | Trace last line: `{U} unknowns → seller questions drafted` | "The unknown becomes a question for the seller, drafted and sent by the agent." |
| 11 | 1:55–2:10 | live | Seller console: open question, seller types the answer, submit. Right half: the verdict flips and the lot re-ranks in place (row highlight) | `Seller answer → verdict updated (Supabase Realtime)` | "The seller answers once. The spec updates over Supabase Realtime and the agent re-ranks the lots, live." |
| 12 | 2:10–2:25 | live | Receipt panel: `{CALLS}` calls, `{USD}` sandbox amount, HTTP 402 line; then stack strip | `Pay per call · Stripe MPP · sandbox` / `Supabase · Vercel · Stripe · Claude` | "Every call is paid per use with Stripe's machine payments, in sandbox. Built on Supabase, Vercel, Stripe and Claude." |
| 13 | 2:25–2:30 | card | `end.png` over `loop-closing.mp4` | `Lot facts first.` / `Then design, financing, builders.` / `dreamhouse-chi.vercel.app` | "Lot facts first. Then design, financing and builders." |

## Sponsor mentions (one each)

Supabase (cue 11, Realtime) · Stripe (cue 12, MPP) · Vercel and Claude (cue 12). Add Codex or Gemini only if they are in the core flow and ticked on the form.

## Overlay rules

- b-roll always shows `illustrative`; end card needs no label (it uses the loop as texture only).
- Anything from `src/lib/fixtures.ts` is `demo data` on screen. The final recording must use real rows, so no label should be needed.
- Keep the Sonoma disclaimer (`planning purposes only, not parcel-specific decisions`) visible in cue 9.

## Recording checklist

| Item | Setting |
|---|---|
| Resolution | 1920×1080 capture, 30 fps (60 only if the screen recorder is smooth). Export MP4 H.264, AAC, under 100 MB |
| Browser | Chrome, new window, private mode, no extensions bar, bookmarks bar hidden. Window exactly 1920×1080 (or 1280×720 at 150% for legible type) |
| Zoom | 125% for the live flow so mono text reads on a phone; 100% for the hero |
| Cursor | Highlight on (ring, accent `#d8a24a`) and click ripple; move slowly, no hunting |
| Notifications | Do Not Disturb on; quit Slack, Mail, Messages; close other tabs; hide the Dock |
| Data | Real rows only; 3 preset lots ingested and returning in under 2 s; mock or cache slow calls (LLM extraction, GIS) |
| Terminal / editor | Never on screen |
| Takes | **Two takes** of the full live flow (cues 5–12); keep the better; keep the backup file |
| Audio | Record voice-over separately in a quiet room; same take count; no music over the voice-over |
| Dry run | One run-through with the final URL in a fresh private window before recording |
