# Back lane: demo state on stored data

Project ref `qpqorehruvwwpzhaqvef`. Demo program (`src/lib/server/demo.ts`): footprint 2,155 sq ft, deck 400 sq ft, **height 26 ft**, 2 stories.
26 ft is above the 24 ft west-of-Hwy-1 limit and below the 35 ft east limit, so the split comes from stored facts only.

Stored state after `ingest.ts` (verified 2026-10-03): 6 lots, `eliminatedCount` = 2, 4 lots `unknown`, 12 open seller questions
(septic, water and flood on each of the 4 east lots; none on the 2 failing lots).

## Lot ids

| Lot | id | Hwy 1 side | Role |
|---|---|---|---|
| 39463 Leeward Road | `3b12d583-4e71-4864-b949-fd384cd9897b` | west | A: fails on stored height (limit 24 ft) |
| 35604 Timber Ridge Road | `9d1adcd4-e664-4d4b-aa2d-d8328072c61f` | east | B: unknown -> 3 seller answers -> pass |
| 35995 Highway 1 | `a5ddf92f-dcb2-4e8e-a48f-eeb1d04ce646` | east | C: stays unknown, 3 questions open |

Other lots: 74 Burl Tree `5955e813-1918-401e-867e-4d46c8ad5e61` (west, fails like Leeward), Fly Cloud `cb24261a-6334-4000-81ee-f99fb9df163c`
(east, unknown), Foothill Close `ffe90278-3d7d-4306-a261-274165e3faf3` (east, unknown; acreage conflict).

## Steps (REST; `$U` is the base URL; header `x-agent-id: demo-e2e` marks demo calls)

```bash
H='content-type: application/json'
P='{"footprintSqFt":2155,"deckSqFt":400,"heightFt":26,"stories":2}'

# Scene 1: 2 of 6 eliminated on stored facts
curl -s -X POST $U/api/tools/search_properties -H "$H" -d "{\"program\":$P}"        # eliminatedCount 2 (Leeward, Burl Tree)

# B. Timber Ridge: one flip per answer
curl -s "$U/api/questions?status=open"                                                # ids of the three Timber Ridge questions
curl -s -X POST $U/api/questions/<septic id>/answer -H "$H" -d '{"answer":"Septic approved for 3 bedrooms"}'                  # septic -> pass
curl -s -X POST $U/api/questions/<water id>/answer  -H "$H" -d '{"answer":"Connected to the Sea Ranch Water Company"}'       # water  -> pass
curl -s -X POST $U/api/questions/<flood id>/answer  -H "$H" -d '{"answer":"Outside the special flood hazard area"}'           # flood  -> pass, overall pass

# C. Highway 1 lot: do nothing. Overall stays unknown (septic, water, flood), 3 open questions.
```

`scripts/e2e-demo.ts` runs scene 1, A, B and C and prints the verdicts (verified: A `fail`; B `unknown` -> septic pass -> water pass -> flood pass = overall `pass`; C `unknown`, 3 open).
It mutates the database. Reset afterwards:

```bash
pnpm exec tsx --env-file=.env.local scripts/reset-demo.ts          # dry run: prints counts
pnpm exec tsx --env-file=.env.local scripts/reset-demo.ts --apply  # questions of the demo lots + calls by buyer-agent, mcp-client, demo-e2e
pnpm exec tsx --env-file=.env.local scripts/ingest.ts              # restores spec_fields and seeds the open questions
```

Realtime: each answer fires `spec_fields UPDATE` and `questions UPDATE` (verified with the anon key).

## Buyer agent (`POST /api/agent`)

Run on stored data at 26 ft: 3 tool calls (search_properties, 2x check_buildability), 0 ask_seller, all questions already open. Guards in the loop:
no `ask_seller` for a field with an open question, at most 3 per run, at most 12 tool calls.
`ask_seller` is idempotent in the repo and backed by a unique index (one open question per property and field).

## What is not claimed

- Setbacks are seeded in `rules` but not evaluated: no check, no verdict, no wording that claims a setback pass.
- Flood zone D stays `unknown` on every lot until a seller answers.
- The lots come from search-result summaries, not listing pages. Every listing-sourced field says so in its `SourceRef.label`.
- Seller answers in this flow are demo actions typed by the presenter; none is stored as data.
