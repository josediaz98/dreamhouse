# DREAMHOUSE — Supabase Select 2026 Hackathon

> Theme: **Build something agents want.**
> Team: DREAMHOUSE · Owner: Jose Diaz · Date: 2026-10-03
> **Hard deadline: 5:30 PM. No exceptions.** Plan to submit by 5:15 PM.

## 0. Project (fill after idea is locked)

| Field | Value |
|---|---|
| Name | DREAMHOUSE (working title; rename if time allows) |
| One-liner | A buyer's agent can tell whether you can build your dream house on a coastal lot, without a site visit, because the lot's facts are machine-readable, sourced, and the unknowns are explicit |
| Market (demo) | **The Sea Ranch, CA** (Sonoma coast). Chosen over Outer Banks NC (19/25) and 30A FL (18/25); Sea Ranch scored 20/25 |
| Who is the agent user? | The buyer's agent (Claude) acting for someone who wants to buy a lot and build a custom house |
| Human behind it | Land buyer (the founder's mother is the origin story) and the seller or broker who answers the open questions |
| Core mechanism | Messy listing + PDF + public GIS → typed spec with per-field provenance and explicit `unknown` → MCP / pay-per-call API → deterministic buildability verdict → unknowns become seller questions → answers re-rank live |
| What outcome do we sell? (not seats, not tokens) | Buyer agent pays per spec query (Stripe MPP, test mode). Seller pays per qualified visit. Metric: **site visits avoided** |
| Why would an agent choose this over what it has today? | Listings are prose and PDFs. Rules (height, coverage, setbacks, fire zone, septic) sit in a 52-page manual and county GIS. No source answers "can I build this here?" in structured form |
| Out of scope today | 3D design, financing, legal, professional network, live scraping. These go on the vision slide only |
| Repo URL | https://github.com/josediaz98/dreamhouse (private for now; flip to public before submitting) |
| Demo URL | https://dreamhouse-chi.vercel.app (Vercel project `dreamhouse`, account josediazalen-3449; production branch `main`) |

## 1. Rules and scoring

**Judging (4 criteria):**

| Criterion | What judges look for | Implication |
|---|---|---|
| Innovation | Original idea. More original is better | Avoid "something that could have been built in 2018" (keynote point) |
| Design | Clean, polished, unique. No generic AI-slop look | Pick one visual identity early. Do not ship default shadcn/Tailwind look |
| Functionality | It must do what it claims, live | Scope small. One flow that works end to end beats five that half work |
| Impact | Solves an important problem | State the problem and who it hits in the first 10 s of the video |

**Prizes:** 7 total — one per sponsor, a Supabase Compute prize, one overall winner. Source says you can win in **one category only** (unconfirmed how this interacts with side quests — ask a staff member in a green lanyard).

**Side quests** (checkboxes on the submission form; they do not count toward the final score, but can win prizes):
- [ ] Best Use of Vercel
- [ ] Best Use of Claude
- [ ] Best Use of Stripe
- [ ] Best Use of Codex
- [ ] Best Use of Multimodal AI for Gemini

**Keynote thesis (useful framing for the pitch):**
1. Observe what work is done in the world, then build backwards. Do not ship a SaaS tool and iterate on feedback.
2. Sell the **outcome**, not the seat or the token. Margin per token rises as models improve.
3. Test: is it valuable to the world, and does it deliver that value?

## 2. Submission form (from the editor)

Required (`*`):
- [ ] Project Title
- [ ] Description
- [ ] Repository URL (`https://github.com/username/project`)
- [ ] Demo URL

Optional but do them:
- [ ] Repository Type
- [ ] Demo Notes — login info or test instructions for judges. Put a ready test account here
- [ ] Coding Tools Used — add Claude Code (and any other)
- [ ] Demo Video — **MP4, max 100 MB**
- [ ] Project Images — up to 10, PNG/JPEG/WebP, max 5 MB each
- [ ] Side quests checkboxes (above)

Rules for the form:
- "Save Draft" accepts incomplete data. **Save a draft with placeholders in the first 30 minutes**, so nothing blocks us at 5:15.
- The form says the entry can be updated until the deadline. Submit early, then update.
- Invite teammates from the Team Members panel if the team grows (max 4).

## 3. Stack and sponsor map

| Layer | Choice | Side quest it feeds | Notes |
|---|---|---|---|
| DB, Auth, Realtime, Storage | **Supabase** | (core; also Supabase Compute prize) | Supabase Compute is in private alpha — ask Matt for access |
| Hosting, AI Gateway | **Vercel** | Best Use of Vercel | Credits + Pro via the Vercel Notion page. Reference repo: notebooks.sh (GitHub) |
| Payments | **Stripe** | Best Use of Stripe | Judges weigh how many Stripe elements we use. See §4 |
| LLM / agent logic | **Claude** | Best Use of Claude | Claim credits via the QR code. Ask the speaker to approve if denied |
| Voice / multimodal | **Gemini Live / TTS** (optional) | Best Use of Multimodal AI for Gemini | Credits via Google AI Studio login (email). Tip from the talk: voice demos do well |
| Coding agent | **Claude Code** | — | List it under Coding Tools Used |

Decision rule: add a sponsor only if it is part of the core flow. A bolted-on integration reads as fake and costs build time.

## 4. Stripe quick reference (from shipbysundown.dev)

Products: Payment Links, Checkout, Elements (all WebMCP-enabled), Subscriptions, Invoices, **Machine Payments Protocol (MPP)** (charge per API call, agents pay programmatically), **Link Agent Wallet** (agent pays on a user's behalf, with guardrails), **Stripe Projects** (agentic provisioning of the stack).

```bash
stripe login
stripe sandbox create
stripe projects init
stripe projects add supabase
stripe projects add vercel
stripe projects add resend
stripe projects add openrouter
stripe payment_links create --line-items price=price_123
stripe invoices create --customer cus_123 --collection-method send_invoice --days-until-due 7
npm i -g @stripe/link-cli
npx skills add stripe/link-cli
link-cli spend-request create --schema
stripe directory search "email sending api"
```

- Correction from Supabase research (see `docs/supabase.md`): the command verified in docs is `stripe projects add supabase/project`, not `stripe projects add supabase`. Stripe docs pull env vars with `env --pull`; Supabase's page says `env --sync`. Confirm on first run. `env --pull` does not push env vars to Vercel.
- Test card: `4242 4242 4242 4242`. Use Stripe test mode only.
- Docs: https://docs.stripe.com · Link Agent Wallet: https://docs.stripe.com/agentic-commerce/agents/link-agent-wallet · Projects: https://docs.stripe.com/projects · Providers: https://projects.dev/providers · Link SDK: https://www.npmjs.com/package/@stripe/link-sdk
- Partners available through Projects: Browser Use, Browserbase, Kernel, Vercel Eve + Link, AgentMail, AgentPhone, Exa, Firecrawl.
- An MPP backend is listed automatically in the Stripe Directory, where other agents can discover it.
- Tip from the talk: point the coding agent at the docs and one-shot the integration.

## 5. Design principles for "something agents want" (our hypotheses, not from sources)

Check the idea against each line. Cut the ones that do not apply.

- [ ] An agent can discover it without a human: OpenAPI spec, `llms.txt`, MCP server, or Stripe Directory listing
- [ ] An agent can start using it with zero signup: payment or key issued programmatically
- [ ] Structured, typed output the agent can chain (no HTML scraping)
- [ ] Idempotent calls and clear error codes the agent can recover from
- [ ] Pay per call or per outcome (MPP), with a spend limit
- [ ] Fast enough to sit inside an agent loop
- [ ] A human can watch what the agent did (audit log in Supabase) — this is also what makes the demo visible

## 6. Timeline (work backwards from 5:30 PM)

The form countdown read 6 h 26 m at about 11:03 AM.

| Time | Milestone | Done when |
|---|---|---|
| 11:15 | **Idea locked** + this doc filled in §0 | One-liner, agent user, outcome written |
| 11:30 | Repo created, Supabase project, Vercel deploy of an empty app, draft saved on the form | Repo URL + Demo URL exist (even if placeholder) |
| 11:30–12:30 | Tracer bullet | One agent request goes through the full path and returns real data |
| 12:30–3:30 | Build core flow | Happy path works on the deployed URL |
| **3:30** | **Feature freeze** | No new features after this |
| 3:30–4:30 | Polish: design pass, error states, seed data, test account for judges | Fresh browser run works without help |
| 4:30–5:10 | Record demo video (MP4 < 100 MB), screenshots, final description | File uploaded to the form |
| **5:15** | **Submit entry** | Confirmation on the form |
| 5:15–5:30 | Buffer only | — |

Do not underestimate the video: it takes longer than expected.

## 7. Demo video script (target 90 s)

> Superseded by `docs/demo-plan.md` (2:30 script, landing page spec, image list, pre-flight). The outline below is the original draft.

1. **0–10 s** Problem and who it hits (Impact).
2. **10–25 s** What we built, in one sentence, plus the agent's point of view (Innovation).
3. **25–70 s** Live run: an agent uses the product end to end. Show the Supabase row, the payment, the output (Functionality).
4. **70–85 s** Sponsor tools used, named once each, matching the side quests ticked.
5. **85–90 s** Outcome pricing line: what is sold and for how much.

Prefer a screen recording of the deployed URL over local. Record a backup take.

## 8. Architecture (fill after idea)

```
[Listing pages + Design Manual PDF + county GIS]
        ↓ ingest (Claude extraction; GIS by APN)
[Supabase Postgres: properties, spec_fields, rules, questions, calls]
        ↓                                   ↑ Realtime
[Next.js on Vercel: MCP server (mcp-handler) + MPP-paid API] ← [Seller console: answer questions]
        ↓
[Buyer agent (Claude via AI Gateway)] → ranked lots + "visits avoided" counter
        ↓
[Stripe MPP: per-call charge, test mode]
```

**Design rule:** the LLM extracts and explains. The verdict (pass / fail / unknown) is computed deterministically from the `rules` table against the buyer's house program. An LLM must never decide a pass.

**Tables (draft)**

| Table | Key columns |
|---|---|
| `properties` | `id`, `apn`, `address`, `source_url`, `price`, `acres`, `snapshot_at` |
| `spec_fields` | `property_id`, `key`, `value` (jsonb), `status` (`known` / `unknown` / `conflict`), `source_type` (`listing` / `gis` / `manual` / `seller`), `source_url`, `confidence`, `extracted_at` |
| `rules` | `id`, `jurisdiction`, `key`, `operator`, `value`, `unit`, `condition`, `source_doc`, `page` |
| `questions` | `id`, `property_id`, `field_key`, `text`, `status` (`open` / `answered`), `answer`, `answered_at` |
| `calls` | `id`, `agent_id`, `tool`, `amount`, `payment_ref`, `ts` (audit log and MPP receipts) |

**MCP tools**

| Tool | Input | Output |
|---|---|---|
| `search_properties` | constraints (budget, acres, max price, must-haves) | lots with known / unknown counts |
| `get_spec` | `property_id` | all fields with provenance |
| `check_buildability` | `property_id`, house program (sq ft, stories, height, footprint) | per-rule pass / fail / unknown + source |
| `ask_seller` | `property_id`, `field_key`, question | question id (appears in seller console) |

**Rules to seed from the Design Manual (verified by the research agent; confirm the current edition):**
- Height: 24 ft west of Hwy 1, 16 ft if the tract map says so, 35 ft east of Hwy 1. The Design Committee may grant exceptions.
- Footprint including decks: 35% of lot (Sonoma County).
- Setbacks for lots under 1 acre: 5 ft side, 20 ft front, 20 ft rear. Plus 10 ft environmental setback from seeps and streams.
- Review stages: conceptual, preliminary, final.

**Demo flow (90 s):** prompt → agent searches 6–8 lots → `check_buildability` kills 2–3 on hard rules → a "visits avoided" counter moves → one lot has an unknown (septic, tract-map height cap, flood zone D) → agent calls `ask_seller` → seller answers in the console → spec updates over Realtime and the agent re-ranks → MPP receipt shown.

## 9. Task board

| Status | Task | Owner | Notes |
|---|---|---|---|
| ✅ | Lock idea, fill §0 | Jose | Sea Ranch, spec layer + buyer agent |
| ✅ | Create GitHub repo | Jose | Done, private. **Flip to public before submitting.** Work on branch `dev` (a hook blocks edits on `main`) |
| ✅ | Supabase project `dreamhouse`, ref `qpqorehruvwwpzhaqvef`, org `dreamhouse` (`racuagumnmbpxvygdkvp`, separate from LAFA), region us-west-1, ACTIVE_HEALTHY | Jose | Env vars `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_PROJECT_REF`, `SUPABASE_SERVICE_ROLE_KEY` are in Vercel (production + development). Use `vercel env pull .env.local`. DB password is only in the main worktree `.env.local` (coordinator never reads it); migrations go through `supabase link --project-ref qpqorehruvwwpzhaqvef` + `supabase db query --linked`. Compute alpha access not requested; optional |
| ✅ | Stripe CLI 1.53.0 installed, logged in; test-mode sandbox `acct_1TBSXZEeUE11jyNc` ("New business sandbox", josediazalen@gmail.com, US) | Jose | `livemode: false`. Keys stay in the CLI profile; never print them |
| ⬜ | Claim credits: Claude (jose@121labs.ai org), Vercel, Gemini, Stripe | | Check email from the hackathon address |
| ✅ | Deploy empty Next.js app on Vercel | Jose | https://dreamhouse-chi.vercel.app returns 200. Deploy with `vercel deploy --prod --yes` or merge `dev` → `main` |
| ⬜ | Save draft on submission form | | |
| ⬜ | Snapshot 6–8 Sea Ranch lot listings by hand (save as files) | | Century 21 Select Group page; no live scraping |
| ⬜ | Confirm the current Design Manual edition and pdftotext it | | Seed `rules` table |
| ⬜ | Tracer bullet: one lot → APN → Sonoma GIS call → spec rows in Supabase | | Proves ingest + provenance |
| ⬜ | `check_buildability` (deterministic) + 4 MCP tools | | |
| ⬜ | Buyer agent loop + "visits avoided" counter | | |
| ⬜ | Seller console + `ask_seller` + Realtime re-rank | | The demo moment |
| ⬜ | MPP paywall on `get_spec` / `check_buildability` (sandbox) | | `npm i mppx stripe`; see docs/stripe.md |
| ⬜ | Feature freeze 3:30 PM, then polish, video, submit by 5:15 PM | | |

## 10. Decision log

| Time | Decision | Why |
|---|---|---|
| 11:00 | Theme read as "agents are the user" | Official theme wording |
| — | Product is the agent-readable property spec layer, not the end-to-end house platform | End to end is six products; only the data layer has a clear agent user and works without seller cooperation |
| — | Market: The Sea Ranch, CA | Scored 20/25 vs OBX 19 and 30A 18; strongest pain (design review takes 1–2 years, per a press article) and extractable rules |
| — | Verdicts are deterministic; LLM only extracts and explains | A wrong pass on a $300k+ lot destroys trust; also makes the demo reproducible |
| 12:50 | `ANTHROPIC_API_KEY` only in Vercel Development (Jose's call, to keep it simple) | Extraction and the buyer agent run locally; the deployed site cannot call Claude. Record the video from the local app, or add the Production var later with `vercel env add ANTHROPIC_API_KEY production` |
| 13:05 | Stripe: MPP settlement dropped. Sandbox profile needs a live profile, which needs account activation (SSN); Jose has none | Keep the 402 challenge (paywall off without keys). New Stripe element: Billing meter `lotline_tool_call` (`mtr_test_61VVwv0SLXtn8OQuE41EeUE11jyNc6hU`), test customer `cus_VNJaiuXkhonZbE`, metered $0.50 price; one meter event verified on the upcoming invoice. Env: `STRIPE_METER_CUSTOMER_ID` in Vercel Development; `STRIPE_SECRET_KEY` (sandbox) still to be added by Jose, Development only. Do not add Stripe keys to Production |
| — | Demo on hand-snapshotted listings, not live scraping | Zillow, LandWatch and homes.com block bots and prohibit scraping |

## 11. Risks

| Risk | Mitigation |
|---|---|
| Idea too big for ~6 h | One flow only. Cut at the 3:30 freeze |
| Demo breaks live | Pre-recorded MP4 is the primary artifact, not a live demo |
| Credits not claimed in time | Do it in the first 30 minutes |
| Generic look | One visual direction chosen at 11:30; no default component-library styling |
| Many sponsors, shallow use | Maximum 3–4 sponsors in the core flow |

## 12. Open questions

- Does "win in one category only" apply to the side quests, or only to the main prizes? Ask staff.
- The Vercel Notion resource page could not be read automatically (page renders client-side). Open it manually for the credit claim steps and example ideas: https://app.notion.com/p/vercel/Supabase-Select-Hackathon-Hacker-Resources-3eee06b059c481c18fe3e32a1f41a3ef
- The Luma page has no schedule, rules, or prizes (it is the conference page). Hackathon rules live on the hackathon site, under "Hackathon Rules" in the form footer.

## 13. Links

- Hackathon site: scan the badge QR code or open the form footer
- Luma: https://luma.com/supabase-select-2026
- Stripe cheat sheet: https://shipbysundown.dev/
- Vercel resources (Notion): link in §12
- Conference site: select.supabase.com
- Join code (team): `001122`
- Research docs: `docs/supabase.md`, `docs/vercel.md`, `docs/stripe.md`

## 14. Sea Ranch data sources (verified by the market-research agent on 2026-10-03)

| Source | What it gives | URL | Status |
|---|---|---|---|
| Sonoma parcels / zoning / fire hazard / slope | APN, zone, land use, FHSZ, acres, fire district (60+ fields) | `https://services1.arcgis.com/P5Mv5GY5S66M8Z1Q/ArcGIS/rest/services/CDR_Parcels/FeatureServer/0/query` | Queried live, no key. Test point -123.45,38.71 returned APN 156-100-021, FHSZ High, 0.76 ac |
| FEMA NFHL | Flood zone | `https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query` | Queried live. Same point returned zone D (undetermined) → store as `unknown` |
| Sonoma Coastal Zone boundary | Coastal overlay | `https://services1.arcgis.com/P5Mv5GY5S66M8Z1Q/ArcGIS/rest/services/Coastal_Zone_Boundary_DRAFT/FeatureServer/0` | DRAFT layer; label it as such |
| CAL FIRE FHSZ | Fire severity zones | `https://services.gis.ca.gov/arcgis/rest/services/Environment/Fire_Severity_Zones/MapServer` | Layers listed, query not tested |
| Sea Ranch Design Manual and Rules | Height, coverage, setbacks, review stages | `https://www.tsra.org/wp-content/uploads/2020/06/DM_v7.pdf` | 52 pages, pdftotext works (~23k words). 2013 edition; confirm current |
| Listings | Price, acres, approvals, utilities text | `https://www.c21selectgroup.com/properties/The%20Sea%20Ranch-CA-real-estate/BAREIS-source/property-type-land.html` | Snapshot by hand. Zillow, LandWatch, homes.com block bots |

Known gaps (become explicit unknowns or seller questions):
- CC&Rs are behind a tsra.org login.
- Mendocino parcel GIS is unverified. Stay in Sonoma County.
- No listing was confirmed active today.
- Sonoma data carries a "planning purposes only, not parcel-specific decisions" disclaimer. Repeat it in the demo.
- The 1–2 year approval time comes from a press article, not a primary source.
