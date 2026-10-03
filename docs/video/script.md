# Video script v2 — 2:30

Final file: MP4, H.264, under 100 MB. Check the hackathon rules page for a maximum length (unconfirmed). Voice-over language: English. Recording steps and roles: `docs/video/recording-plan.md`.

## Real numbers used (from the live database, 2026-10-03)

| Fact | Value | Source |
|---|---|---|
| Lots indexed | 6 | `search_properties` |
| Ruled out at 26 ft | 2 (39463 Leeward Rd, 74 Burl Tree) | `eliminatedCount` |
| Reason | Limit 24 ft west of Hwy 1; the house is 26 ft | Sea Ranch Design Manual §6.3 |
| Example house | 2,155 sq ft footprint, 400 sq ft deck, 2 stories, 26 ft | demo program |
| Lot we follow | 35604 Timber Ridge Road, $120,000, 0.45 ac, east of Hwy 1 (35 ft limit) | database |
| Its unknowns | septic, water, flood zone (3 open questions) | `questions` |
| Manual length | 52 pages | `tsra.org` PDF |

Claims that are NOT allowed: "setbacks" (not evaluated), "1–2 years of design review" (press article), "no listing says so" for all lots (the Foothill listing does state a 24 ft limit; only the two failing lots do not mention it), a settled Stripe payment (only metering is verified).

## Cues

Type: **live** (screen recording of the deployed URL), **term** (terminal with Claude Code), **card** (static from `docs/video/cards/`), **cut** (hard cut).
Voice-over runs at about 150 words per minute; every cue leaves room around the words.

| # | Time | Type | Shot | On-screen text (exact) | Voice-over (exact) |
|---|---|---|---|---|---|
| 1 | 0:00–0:10 | live | Buyer's agent view at 26 ft: the two red "Ruled out" rows, then cut to the Design Manual page with the 24 ft rule highlighted | `2 of 6 lots ruled out` / `Design Manual §6.3: 24 ft` | "Six lots at The Sea Ranch. Two can't hold a twenty-six-foot house. Neither listing mentions the height limit." |
| 2 | 0:10–0:22 | live | Scroll the 52-page PDF fast, stop on the rule; fade to the parcel sheet | `52 pages · county maps · no structure` | "The rule lives in a fifty-two page manual and in county maps. A buyer's agent can't read any of that from a listing." |
| 3 | 0:22–0:30 | card | `title.png` | `Can I build on this lot?` / `Your agent can finally answer.` | "Lotline makes a lot's facts readable by an agent. Every field is sourced. Every unknown is explicit." |
| 4 | 0:30–1:05 | term | Claude Code in a clean terminal, connected to the Lotline MCP server. Type the buyer prompt; tool calls scroll; final answer. Sped up 2× during the wait; show the answer at normal speed | `Claude Code → Lotline MCP` / `sped up` (small, while sped up) | "This is Claude Code, connected to Lotline over MCP. The buyer asks for a house, twenty-six feet tall. The agent searches six lots and checks the best two. The verdicts come from a rules engine, not from the model." |
| 5 | 1:05–1:20 | live | Landing: preset **35604 Timber Ridge Road** → Check buildability → Readable verdict: height pass, coverage pass, septic / water / flood unknown, sources linked | `Every check: source + page` | "Every check carries its source and its page in the Design Manual. Height passes. Septic, water and flood are unknown." |
| 6 | 1:20–1:30 | live | Scroll to "Guessing vs knowing" (before/after) | none (the page text is the caption) | "A generic model guesses and sounds sure. Here the answer is conditional, and every line has a source." |
| 7 | 1:30–1:40 | live | Parcel sheet: real outlines at one scale, verdict colours, the two dashed "?" parcels | `Sonoma County parcels · planning purposes only` | "Two parcels couldn't be resolved, so their outlines are dashed. Unknown is an answer, not an error." |
| 8 | 1:40–2:05 | live | Split view: `/seller` on the left, buyer's list on the right. Answer the three Timber Ridge questions (septic, water, flood); after each, the row highlights; after the third it shows Pass | `Demo: seller answers typed by the presenter` / `Seller answer → verdict updated (Supabase Realtime)` | "Each unknown becomes a question for the seller. The seller answers, the spec updates over Supabase Realtime, and the verdict changes live. After three answers, this lot passes every rule we can check." |
| 9 | 2:05–2:18 | live | Stripe test-mode dashboard: customer "Demo buyer agent", upcoming invoice with `N × Lotline tool call` at $0.50. `N` is whatever the dashboard shows at recording time | `Stripe Billing · sandbox · metered per call` | "Every priced tool call is metered in Stripe Billing, in sandbox. Pay per call, not per seat." |
| 10 | 2:18–2:30 | card | `end.png` | `Lot facts first.` / `Then design, financing, builders.` / `dreamhouse-chi.vercel.app` | "Built on Supabase, Vercel, Stripe and Claude. Lot facts first. Then design, financing and builders." |

## Terminal prompt for cue 4 (exact; verified on the deployed MCP server)

```
Use the lotline tools. Find me a Sea Ranch lot under $400,000 where I can build a 2-story house with a 2,155 sq ft footprint, a 400 sq ft deck, 26 ft tall. Search once, check the two best lots that are not ruled out, and answer in under 120 words: which lots are ruled out, which rule and why, and what is still unknown. Report only what the tools returned; do not compute anything yourself.
```

Why this wording: a looser prompt ("a 2,155 sq ft house") made the agent assume a footprint of half that and then compute a wrong coverage figure on its own. With the prompt above, the verified answer rules out Leeward and Burl Tree on §6.3 (24 ft vs 26 ft), keeps Fly Cloud and Timber Ridge, and lists septic, water and flood as unknown, with setbacks marked not evaluated.

## Sponsor mentions (once each)

Supabase (cue 8, Realtime) · Stripe (cue 9, Billing meter) · Vercel and Claude (cue 10, and Claude Code on screen in cue 4).

## Overlay rules

- Everything on screen comes from the real database. A fixture or a made-up number must never appear.
- Keep the Sonoma disclaimer visible in cue 7.
- Cue 8 always carries `Demo: seller answers typed by the presenter`.
- No Higgsfield or stock footage; the title and end cards carry the brand.
- The terminal appears only in cue 4, at a large font, with nothing else on screen.

## Optional captions

`docs/video/captions.srt` belongs to the old script. Regenerate it from the voice-over column once the final audio is recorded, or skip captions.
