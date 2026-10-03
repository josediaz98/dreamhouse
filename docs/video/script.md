# Video script v4 — 2:30 (pitch-aligned)

Final file: MP4, H.264, under 100 MB. Voice-over in English. Recording steps: `docs/video/recording-plan.md`. On-screen labels checked on the deployed site on 2026-10-03.

## The pitch in three lines

- **Problem:** your AI agent can't tell you whether you can build your house on a lot. The rules sit in a 52-page design manual and county maps, so it says "I don't know, go ask", and you find out on a site visit.
- **Value:** Lotline makes lots agent-readable: a verdict per rule, a source for every fact, every unknown routed to the seller. Lots are ruled out before anyone drives out.
- **Business:** pay per answer, metered in Stripe, not per seat. Lot facts first; then design, financing and builders.

Why "can I build here?" is the problem to lead with: it decides whether a lot has any value for the buyer at all. Land-buying guides list it as the core due-diligence risk: a failed perc test can legally prohibit a house and make the lot "effectively worthless" for residential use, and setbacks can "eliminate any buildable space" ([BiggerPockets](https://www.biggerpockets.com/posts/4569878), [Building Advisor checklist](https://buildingadvisor.com/buying-land/land-buying-checklist/)). At The Sea Ranch, no exterior construction may start until the Design Committee approves it ([TSRA Restrictions, Art. 4–5](https://www.tsra.org/the-sea-ranch-restrictions-articles-2-3/The-Sea-Ranch-Restrictions-Articles-4-5/)). It also comes before every other step of the founder's own experience (find land → association approval → architect → design approval → legal → bank). Not validated: we have no buyer survey or market-size number, so the pitch makes no such claim.

## Real numbers (live database)

| Fact | Value |
|---|---|
| Lots indexed | 6 |
| Ruled out at 26 ft | 2 (39463 Leeward Rd, 74 Burl Tree): limit 24 ft west of Hwy 1, Design Manual §6.3 |
| Example house | 2 stories, 26 ft, 2,155 sq ft footprint, 400 sq ft deck, under $400,000 |
| Lot we follow | 35604 Timber Ridge Road: height and coverage pass; septic, water, flood unknown; 3 answers to pass |
| Price per priced check | $0.50, metered in Stripe Billing (test mode) |
| No-tools answer | Real Claude answer, 3 Oct 2026: `docs/submission/no-tools-answer.md` |

Not allowed: "setbacks" as evaluated; "1–2 years of design review"; market size or "saves X hours"; "payment", "charge" or "settled" (only metering is verified); "the listing never says so" for any lot other than Leeward and Burl Tree (the Foothill listing states a 24 ft limit).

## Cues

| # | Time | Screen | On-screen text (exact) | Voice-over (exact) |
|---|---|---|---|---|
| 1 | 0:00–0:12 | `https://dreamhouse-chi.vercel.app/?tour=1` → step 1, left card "Claude, no tools" | the real quote | "Ask an AI agent today: can I build a two-story house on this coastal lot? It says: I don't know, go ask the association." |
| 2 | 0:12–0:24 | Same step, right card "Claude with Lotline" | `✕ Fail · limit 24 ft (§6.3); your house is 26 ft` | "The answer is in a fifty-two-page design manual and county maps that no agent can read. Lotline makes lots agent-readable: every fact has a source, every unknown is explicit." |
| 3 | 0:24–0:32 | **Next** → step 2 "How Lotline answers" | — | "Rules decide. The model never does." |
| 4 | 0:32–0:42 | **Next** → step 3 → **Search lots** → results | `2 ruled out · 4 need answers from the seller` | "Six real lots at The Sea Ranch. One search: two ruled out by the twenty-four-foot height limit, before anyone drives out." |
| 5 | 0:42–1:08 | Terminal: Claude Code + Lotline MCP; exact prompt below; final answer. Wait sped up 2× | `Claude Code → Lotline MCP` · `sped up` | "Here's Claude Code using Lotline over MCP. It searches, checks the best two lots, and cites the rule it used." |
| 6 | 1:08–1:22 | **View checks** on 35604 Timber Ridge Road: aerial with dashed outline, checks with sources | `Aerial: USDA NAIP · county parcel line` | "Every check shows its source and page. This lot passes height and coverage. Septic, water and flood are still unknown." |
| 7 | 1:22–1:30 | Results toggle **Map** | `Sonoma County parcels · planning purposes only` | "Where the facts stop, the line is dashed." |
| 8 | 1:30–1:56 | `/seller` → **35604 Timber Ridge Road** → for septic, water, flood: **Demo answers** chip → **Send**; verdict block flashes; ends on Pass | `Demo: answers are entered by the presenter` | "Those unknowns become questions for the seller. The seller answers once, the spec updates over Supabase Realtime, and the verdict flips to pass, live." |
| 9 | 1:56–2:10 | Stripe dashboard, test mode: customer "Demo buyer agent", upcoming invoice `N × Lotline tool call` | `Stripe Billing · test mode · $0.50 per check` | "Buyers' agents stop wasting visits. Sellers answer once and reach qualified buyers. We charge per answer, metered in Stripe, not per seat." |
| 10 | 2:10–2:20 | `https://dreamhouse-chi.vercel.app/llms.txt`, short scroll | `/llms.txt` | "Any agent can discover it on its own. Built on Supabase, Vercel, Stripe and Claude." |
| 11 | 2:20–2:30 | End card `docs/video/cards/end.png` | `Lot facts first.` / `Then design, financing, builders.` / URL | "Lot facts first. Then design, financing and builders, all on facts an agent can trust. That's Lotline." |

## Terminal prompt for cue 5 (verified on the deployed MCP server)

```
Use the lotline tools. Find me a Sea Ranch lot under $400,000 where I can build a 2-story house with a 2,155 sq ft footprint, a 400 sq ft deck, 26 ft tall. Search once, check the two best lots that are not ruled out, and answer in under 120 words: which lots are ruled out, which rule and why, and what is still unknown. Report only what the tools returned; do not compute anything yourself.
```

If the answer contradicts cue 6 (different lots ruled out, a setback "pass", invented numbers), retake.

## Live pitch (90 s, no video)

| Time | Beat | Say |
|---|---|---|
| 0:00–0:15 | Problem | "Ask an AI agent today: can I build a two-story house on this coastal lot? It says: I don't know, go ask the association. The answer is in a 52-page design manual and county maps that no agent can read." |
| 0:15–0:30 | What it is | "Lotline makes lots agent-readable. Every fact has a source. Every unknown is explicit. Rules decide; the model never does." |
| 0:30–1:00 | Proof | "Six real lots at The Sea Ranch. One search: two ruled out by the 24-foot height limit, before any visit. Claude Code uses it over MCP and cites the rule. The rest are unknown on septic, water and flood, so those become questions for the seller. The seller answers, and the verdict flips to pass, live." |
| 1:00–1:15 | Value | "Buyers' agents stop wasting visits. Sellers answer once and reach qualified buyers. We charge per answer, metered in Stripe, not per seat." |
| 1:15–1:30 | Close | "Lot facts first. Then design, financing and builders, all on facts an agent can trust. That's Lotline." |

60-second version: drop the Claude Code sentence and the Value beat's second sentence.

## Overlay rules

- Only real data on screen. Keep the Sonoma disclaimer visible in cue 7 and the presenter note in cue 8.
- The terminal appears only in cue 5, large font, nothing else on screen.
- No generated or stock footage.
