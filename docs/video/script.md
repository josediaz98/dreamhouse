# Video script v3 — 2:30

Final file: MP4, H.264, under 100 MB. Voice-over in English. Recording steps: `docs/video/recording-plan.md`. On-screen labels below were checked on the deployed site on 2026-10-03 at 14:44 PDT.

## Real numbers (live database)

| Fact | Value |
|---|---|
| Lots indexed | 6 |
| Ruled out at 26 ft | 2 (39463 Leeward Rd, 74 Burl Tree): limit 24 ft west of Hwy 1, Design Manual §6.3 |
| Example house | 2 stories, 26 ft, 2,155 sq ft footprint, 400 sq ft deck, under $400,000 |
| Lot we follow | 35604 Timber Ridge Road, $120,000, 0.45 ac, east of Hwy 1 (35 ft limit); unknown: septic, water, flood zone |
| No-tools answer | Real Claude answer, 3 Oct 2026: `docs/submission/no-tools-answer.md` |

Not allowed: "setbacks"; "1–2 years of design review"; "payment", "charge" or "settled" (only metering is verified); "the listing never says so" for any lot other than Leeward and Burl Tree (the Foothill listing states a 24 ft limit).

## Cues

| # | Time | Screen | On-screen text (exact) | Voice-over (exact) |
|---|---|---|---|---|
| 1 | 0:00–0:10 | `https://dreamhouse-chi.vercel.app/?tour=1` → onboarding step 1, left card "Claude, no tools" | the real quote | "Ask an AI agent today whether you can build on a coastal lot, and you get this: I don't know. Go ask the association." |
| 2 | 0:10–0:20 | Same step, right card "Claude with Lotline" | `✕ Fail · limit 24 ft (§6.3); your house is 26 ft` | "With Lotline, the same question gets a verdict and a source. This lot can't hold a twenty-six-foot house, and the listing never says so." |
| 3 | 0:20–0:30 | **Next** → step 2 "How Lotline answers": Ingest → Decide → Ask | — | "Lotline turns listings, a fifty-two-page design manual and county maps into facts an agent can read. Rules decide. The model never does." |
| 4 | 0:30–0:38 | **Next** → step 3 → **Search lots** → results load | `2 ruled out · 4 need answers from the seller` | "One search: two of six lots ruled out, four waiting on the seller." |
| 5 | 0:38–1:08 | Terminal: Claude Code with the Lotline MCP; exact prompt below; final answer. Wait sped up 2× | `Claude Code → Lotline MCP` · `sped up` | "This is Claude Code, connected to Lotline over MCP. It searches six lots, checks the best two, and cites every rule it used." |
| 6 | 1:08–1:22 | Browser: **View checks** on 35604 Timber Ridge Road: aerial with the dashed outline, then the checks with sources | `Aerial: USDA NAIP · county parcel line` | "Every check has its source and page. Height and coverage pass. Septic, water and flood are still unknown, so the line stays dashed." |
| 7 | 1:22–1:32 | Results toggle **Map**: six parcels at one scale, live colours | `Sonoma County parcels · planning purposes only` | "Real county parcel lines, at one scale. Where the facts stop, the line is dashed." |
| 8 | 1:32–1:58 | `/seller`: Timber Ridge card on the left, buyer's list on the right. For septic, water, flood: click the **Demo answers** chip, then **Send**. The right card flashes "Seller answered"; after the third it shows Pass | `Demo: answers are entered by the presenter` | "Each unknown becomes a question for the seller. The answer updates the spec over Supabase Realtime, and the verdict changes live. Three answers later, this lot passes every rule we can check." |
| 9 | 1:58–2:10 | Stripe dashboard, test mode: customer "Demo buyer agent", upcoming invoice `N × Lotline tool call` | `Stripe Billing · test mode · metered per call` | "Every priced check is metered in Stripe Billing. Pay per answer, not per seat." |
| 10 | 2:10–2:22 | `https://dreamhouse-chi.vercel.app/llms.txt`, short scroll | `/llms.txt` | "And agents can find all of it on their own. Built on Supabase, Vercel, Stripe and Claude." |
| 11 | 2:22–2:30 | End card `docs/video/cards/end.png` | `Lot facts first.` / `Then design, financing, builders.` / URL | "Lot facts first. Then design, financing and builders." |

## Terminal prompt for cue 5 (verified on the deployed MCP server)

```
Use the lotline tools. Find me a Sea Ranch lot under $400,000 where I can build a 2-story house with a 2,155 sq ft footprint, a 400 sq ft deck, 26 ft tall. Search once, check the two best lots that are not ruled out, and answer in under 120 words: which lots are ruled out, which rule and why, and what is still unknown. Report only what the tools returned; do not compute anything yourself.
```

If the answer contradicts cue 6 (different lots ruled out, a setback "pass", invented numbers), retake.

## Overlay rules

- Only real data on screen. Keep the Sonoma disclaimer visible in cue 7 and the presenter note in cue 8.
- The terminal appears only in cue 5, large font, nothing else on screen.
- No generated or stock footage.
