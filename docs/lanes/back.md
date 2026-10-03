# Lane: Back + setup

Branch `lane/back`, worktree `/Users/josediaz/dreamhouse-back`. Read `docs/lanes/README.md` first.

## Goal

Make the contract real: Supabase schema, ingestion of 6–8 Sea Ranch lots with provenance, deterministic buildability rules, the 4 MCP tools over MCP and REST, seller Q&A with Realtime, and a pay-per-call paywall (Stripe MPP, sandbox).

## Blockers the coordinator is resolving (check before step 1)

- A Supabase project in a **personal org** (the CLI only sees LAFA orgs; never create anything there). The coordinator provides the project ref.
- `ANTHROPIC_API_KEY` (credits live on the jose@121labs.ai org), set by Jose in `.env.local` and Vercel. Use it only through `process.env`.
- Stripe CLI and sandbox login. Not needed until step 7.

## Steps (time targets are from the moment you start)

1. **Schema (20 min).** `supabase/migrations/*.sql` for the 5 tables in `contract.ts` (`TABLES`): `properties`, `spec_fields`, `rules`, `questions`, `calls`. RLS on. Public read of `properties` and `spec_fields` via the anon key; writes only through server routes with the service role. Enable Realtime on `spec_fields` and `questions`. Env var names: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
2. **Rules seed (20 min).** Run `pdftotext -layout` on `https://www.tsra.org/wp-content/uploads/2020/06/DM_v7.pdf`. Confirm the current edition first. Seed `rules` from verified text only, each with page number: height (24 ft west of Hwy 1; 16 ft where the recorded tract map says so; 35 ft east), lot coverage 35% including decks, setbacks for lots under 1 acre (5 side, 20 front, 20 rear), 10 ft environmental setback. Anything you cannot find in the PDF is not seeded.
3. **Tracer bullet (30 min).** One lot, end to end: listing snapshot → APN → Sonoma parcel query → FEMA flood query → `spec_fields` rows with `source` and `status`. FEMA zone D is stored as `unknown` with a note. Endpoints are in `PROJECT.md` §14.
4. **Ingest 6–8 lots (45 min).** Hand-snapshot the listing pages (save the HTML or text under `scripts/snapshots/`; no live scraping of Zillow, LandWatch, or homes.com). Use Claude (via AI Gateway or the Anthropic SDK, structured output) to extract listing facts into `SpecFieldKey`s with a confidence. Any key not found is written as `unknown`, never guessed.
5. **Rules engine (45 min).** `src/lib/server/buildability.ts`: pure function `(fields, rules, program) -> BuildabilityResult`. Unit tests for: a fail (height 20 vs 16), a pass, an unknown (missing septic), and fail beating unknown.
6. **Tools + routes (60 min).** Implement `search_properties`, `get_spec`, `check_buildability`, `ask_seller` once, then expose them as (a) REST routes at `API_ROUTES.tool(...)` and (b) an MCP server with `mcp-handler` at `/mcp` (see `docs/vercel.md`). Also `GET /api/questions`, `POST /api/questions/[id]/answer` (updates the question and the matching `spec_field` in one transaction, so Realtime fires), and `GET /api/calls`. `search_properties` returns `eliminatedCount`.
7. **MPP paywall (45 min).** `npm i mppx stripe` (see `docs/stripe.md`). Charge a small sandbox amount on `check_buildability` and `get_spec`; log each call into `calls`. Verify with `npx mppx@latest validate <url>`. Link Agent Wallet is US/Canada only: skip it.
8. **Buyer agent (45 min).** `scripts/buyer-agent.ts` or `src/app/api/agent/route.ts`: Claude with the MCP tools, prompt "Beach lot, budget X, 2-story 2,155 sq ft house, 20 ft tall". Streams `TraceEvent`s (contract) so the Front can render the trace panel.

## Definition of done

- `pnpm exec tsc --noEmit`, unit tests, and `pnpm build` pass.
- `curl` against the deployed `/api/tools/check_buildability` returns a `BuildabilityResult` for a real ingested lot, with a source on every check.
- Answering a seller question flips a verdict, observed over Realtime.
- A paid call shows an HTTP 402 first, then succeeds with a receipt in `calls`.

## Do not

- Create anything in the LAFA Supabase orgs.
- Let the LLM compute a verdict.
- Seed a rule you cannot cite to a page.
- Commit fixtures as real data. Fixtures stay `isFixture: true`.
