# Lotline

**Can I build on this lot? Your agent can finally answer.**

Lotline is an agent-readable property spec layer for coastal land. A buyer's AI agent asks whether a house fits a lot. Lotline answers with a verdict per rule (pass, fail or unknown) and a source for every fact. When a fact is missing, "unknown" is a first-class answer that becomes a question to the seller. The seller's answer updates the verdict live.

Built for the Supabase Select 2026 hackathon (theme: build something agents want). Demo market: The Sea Ranch, CA.

- Live demo: https://dreamhouse-chi.vercel.app
- Seller console: https://dreamhouse-chi.vercel.app/seller
- MCP server: `https://dreamhouse-chi.vercel.app/mcp`

```bash
claude mcp add --transport http lotline https://dreamhouse-chi.vercel.app/mcp
```

## The problem

Listings are prose and PDFs. The rules that decide whether you can build (height limits, lot coverage, design review, septic, water, flood) live in a 52-page design manual, county GIS layers and the seller's head. A buyer, or the buyer's agent, learns "no" after a site visit. No source answers "can I build this here?" in a structured way.

## How it works

1. **Ingest.** Listing text, the Sea Ranch Design Manual and public GIS (Sonoma County parcels, FEMA flood zones) become typed `spec_fields`. Each field carries a source and a status: `known`, `unknown` or `conflict`. Claude extracts listing facts and every evidence quote is re-verified against the source text.
2. **Decide.** A deterministic rules engine (`src/lib/server/buildability.ts`) checks the buyer's house against cited rules. The LLM extracts and explains. It never decides a verdict. Fail beats unknown, unknown beats pass.
3. **Ask.** Every unknown that matters (septic, water, flood) becomes an open question for the seller. An answer updates the spec and re-ranks the buyer's list over Supabase Realtime.
4. **Expose.** Four tools over MCP and REST: `search_properties`, `get_spec`, `check_buildability`, `ask_seller`. `get_spec` and `check_buildability` are priced at 0.50 USD per call through Stripe's Machine Payments Protocol when keys are configured.

```
listing text + Design Manual + county GIS
        -> ingest (Claude extraction, evidence verified)
Supabase Postgres (properties, spec_fields, rules, questions, calls) + Realtime
        -> Next.js on Vercel: MCP server (mcp-handler) + REST tools + seller console
buyer's agent (any MCP client, for example Claude Code)
```

## What the demo shows

At a 26 ft, 2-story house, the stored facts rule out 2 of 6 lots on the Design Manual height limit (24 ft west of Hwy 1). The other lots stay unknown, each with open questions. Answering the seller questions for an east-side lot (septic, water, flood) moves it from unknown to pass, one verified step at a time.

## Honest limits

- **Search-result summaries, not listing pages.** The 6 lots come from search-result summaries captured 2026-10-03. Every listing-sourced field says so in its source label.
- **Setbacks are not evaluated.** They are seeded as rules, but no check or verdict claims a setback result, because the house program has no lot dimensions.
- **Flood zone D stays unknown.** FEMA zone D means flood hazard undetermined. No lot reaches pass until a seller answers.
- **Seller answers in the demo are typed by the presenter.** They are not stored as verified data.
- **Design Manual is the 2013 edition.** The CC&Rs are behind a login and are not used.
- **County GIS is for planning purposes only,** not parcel-specific decisions. Two lots have no resolved APN and are drawn dashed on the parcel sheet.
- **Payments.** Metering is sandbox-only and off when no key is configured: each successful `get_spec` or `check_buildability` call sends one Stripe Billing meter event (`lotline_tool_call`, $0.50 per call on the sandbox subscription) when `STRIPE_SECRET_KEY` and `STRIPE_METER_CUSTOMER_ID` are set. Without them nothing is sent and calls are free. MPP settlement was dropped (an MPP profile needs account activation); the HTTP 402 challenge code stays but is off without `STRIPE_PROFILE_ID`. Verified once from a local run (2026-10-03): one `get_spec` call produced "1 × Lotline tool call, $0.50" on the sandbox invoice preview. The deployed site has no Stripe key, so it does not meter.
- **Sea Ranch only.** Other jurisdictions need their own rules.
- Not legal, engineering or financial advice.

## Stack

| Layer | Use |
|---|---|
| Supabase | Postgres with RLS, Realtime on `spec_fields` and `questions`, migrations in `supabase/migrations` |
| Vercel | Hosting, Next.js App Router, `mcp-handler` for the MCP server |
| Stripe | Billing meter events per priced tool call (sandbox); `mppx` 402 challenge code, off |
| Claude | Listing fact extraction and the buyer-agent loop through the Anthropic SDK |
| Claude Code | Built with it; also works as the MCP client |

## Run locally

Requires Node 20+, pnpm, and a Supabase project. Environment variable names only (values go in `.env.local`, never in git): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, and optionally `STRIPE_SECRET_KEY` and `STRIPE_PROFILE_ID`.

```bash
pnpm install
pnpm test           # unit tests, no secrets needed
pnpm typecheck
pnpm dev            # http://localhost:3000
pnpm demo:reset     # reset the demo lots' questions and re-ingest
```

Back-end runbook: `scripts/README.md`. Demo state and ids: `docs/lanes/back-demo-state.md`.

## Repo map

| Path | What |
|---|---|
| `src/lib/contract.ts` | Shared types for tools, verdicts and data |
| `src/lib/server/` | Rules engine, tools, ingestion, GIS, paywall, buyer agent |
| `src/app/api/`, `src/app/mcp/` | REST routes and the MCP server |
| `src/components/`, `src/app/(site)/` | Landing, playground, trace panel, parcel sheet, seller console |
| `tools/parcel-map/` | Generates the parcel sheet from county geometry |
| `docs/` | Brand, demo plan and research notes on Supabase, Vercel and Stripe |

## Data sources

- Sea Ranch Design Manual and Rules (2013 edition), with page numbers on every rule.
- Sonoma County parcels (`CDR_Parcels`) for APN, zoning, fire hazard and acreage.
- FEMA National Flood Hazard Layer.
- Caltrans highway centerline to derive the side of Hwy 1.
