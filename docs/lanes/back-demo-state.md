# Back lane: demo state on stored data

Project ref `qpqorehruvwwpzhaqvef`. Demo program: footprint 2,155 sq ft, deck 400 sq ft, height 20 ft, 2 stories.
Stored state after `ingest.ts`: 6 lots, none eliminated, every lot overall `unknown`, one open `flood_zone` question per lot.

## Lot ids

| Lot | id | Hwy 1 side | Role |
|---|---|---|---|
| 39463 Leeward Road | `3b12d583-4e71-4864-b949-fd384cd9897b` | west | A: fails on height after the answer |
| 74 Burl Tree | `5955e813-1918-401e-867e-4d46c8ad5e61` | west | B: unknown -> 2 answers -> pass |
| 35604 Timber Ridge Road | `9d1adcd4-e664-4d4b-aa2d-d8328072c61f` | east | C: stays unknown, open questions |

Other lots: Fly Cloud `cb24261a-6334-4000-81ee-f99fb9df163c`, Highway 1 `a5ddf92f-dcb2-4e8e-a48f-eeb1d04ce646`, Foothill Close `ffe90278-3d7d-4306-a261-274165e3faf3`.

## Why no lot fails in the stored state

At 20 ft every lot is within the height limit that the facts allow, or the limit is still undetermined. A stored fail would need an invented fact. So the fail comes from a seller answer (A). If a stored fail is needed, use a 25 ft program: Leeward is west of Hwy 1, the limit is at most 24 ft, and the verdict is `fail` (verified: "Limit 24 ft (Sea Ranch Design Manual); your house is 25 ft").

## Steps (REST; `$U` is the base URL, header `x-agent-id: demo-e2e` marks demo calls)

```bash
H='content-type: application/json'
P='{"footprintSqFt":2155,"deckSqFt":400,"heightFt":20,"stories":2}'

# A. Leeward: unknown -> fail
curl -s -X POST $U/api/tools/ask_seller -H "$H" -d '{"propertyId":"3b12d583-4e71-4864-b949-fd384cd9897b","fieldKey":"tract_map_height_cap_ft","text":"Does the recorded tract map cap the height at 16 ft for this lot?"}'
curl -s -X POST $U/api/questions/<question.id>/answer -H "$H" -d '{"answer":"The tract map says 16 ft"}'
# check_buildability now returns overall "fail" (height)

# B. Burl Tree: unknown -> pass (two answers)
curl -s -X POST $U/api/tools/ask_seller -H "$H" -d '{"propertyId":"5955e813-1918-401e-867e-4d46c8ad5e61","fieldKey":"tract_map_height_cap_ft","text":"Does the recorded tract map cap the height at 16 ft for this lot?"}'
curl -s -X POST $U/api/questions/<that id>/answer -H "$H" -d '{"answer":"No cap on the tract map"}'      # height -> pass, flood still unknown
curl -s "$U/api/questions?status=open"                                                                       # find the Burl Tree flood_zone question
curl -s -X POST $U/api/questions/<flood id>/answer -H "$H" -d '{"answer":"Outside the special flood hazard area"}'   # overall -> pass

# C. Timber Ridge: do nothing. Overall stays unknown (septic, water, flood), 1 open question (flood).
```

`scripts/e2e-demo.ts` runs A, B and C and prints the verdicts (verified 2026-10-03: A unknown->fail, B unknown->unknown->pass, C unknown).
It mutates the database. Reset afterwards:

```bash
pnpm exec tsx --env-file=.env.local scripts/reset-demo.ts          # dry run: prints counts
pnpm exec tsx --env-file=.env.local scripts/reset-demo.ts --apply  # deletes questions of the demo lots + calls by buyer-agent, mcp-client, demo-e2e
pnpm exec tsx --env-file=.env.local scripts/ingest.ts              # restores spec_fields and the flood questions
```

Realtime: each answer fires `spec_fields UPDATE` and `questions UPDATE` (verified with the anon key).

## What is not claimed

- Setbacks are seeded in `rules` but not evaluated: no check, no verdict, no wording that claims a setback pass.
- Flood zone D stays `unknown` on every lot until a seller answers.
- The lots come from search-result summaries, not listing pages. Every listing-sourced field says so in its `SourceRef.label`.
- Seller answers in this flow are demo actions typed by the presenter; none is stored as data.
