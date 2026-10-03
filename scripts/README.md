# Back lane runbook

Env var names only (values live in `.env.local` and Vercel, never in git):
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_PROFILE_ID`, `STRIPE_METER_CUSTOMER_ID`.

## Once a Supabase project exists (personal org, never LAFA)

```bash
supabase link --project-ref <ref>
supabase db push                                   # supabase/migrations/*.sql
pnpm exec tsx --env-file=.env.local scripts/seed-rules.ts
pnpm exec tsx --env-file=.env.local scripts/ingest.ts   # snapshots/*.txt + cached *.facts.json; GIS is live
```

## Checks that need no secrets

```bash
pnpm exec tsc --noEmit && pnpm test && pnpm build
pnpm exec tsx scripts/ingest.ts --dry          # in-memory repo, live GIS, prints the verdict table
DREAMHOUSE_REPO=memory pnpm dev                # serves the coordinator fixtures from memory (never in production)
```

## Stripe metering (needs STRIPE_SECRET_KEY + STRIPE_METER_CUSTOMER_ID)

After each successful priced tool call (`get_spec`, `check_buildability`; REST and MCP) one Billing meter event is sent:
`stripe.billing.meterEvents.create({ event_name: "lotline_tool_call", payload: { stripe_customer_id, value: "1" } })`.
It runs after the response with a 2.5 s timeout. A missing var, a Stripe error or a timeout changes nothing in the response; failures are
logged with `console.warn` as error class and code only. Independent of the paywall below. Sandbox only; with no `STRIPE_SECRET_KEY` it does nothing.
Code: `src/lib/server/stripe-metering.ts`.

## Paywall (needs STRIPE_SECRET_KEY + STRIPE_PROFILE_ID; off, MPP settlement dropped)

Priced tools: `get_spec`, `check_buildability` at 0.50 USD. Without both vars the paywall is off and calls log as free.

```bash
curl -i -X POST $URL/api/tools/get_spec -H 'content-type: application/json' -d '{"propertyId":"<id>"}'   # 402 + WWW-Authenticate
npx mppx@latest validate $URL/api/tools/get_spec
```

## Snapshots

`snapshots/*.txt` are search-result summaries captured 2026-10-03, not verbatim listing pages. Replace or add
hand-saved listing text in the same format (`url`, `address`, `captured_at`, `kind`, `---`, body); a missing
`<name>.facts.json` makes `ingest.ts` call Claude (`ANTHROPIC_API_KEY`). Every evidence quote is re-verified against the text.
