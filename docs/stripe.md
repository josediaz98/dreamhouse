# Stripe builder's reference — "Best Use of Stripe" (Supabase Select 2026, 2026-10-03)

Researched 2026-10-03 from primary sources (docs.stripe.com, mpp.dev, projects.dev, GitHub, shipbysundown.dev). Anything not read in a primary source is tagged **UNVERIFIED**. Time estimates are my own, not from Stripe. No keys in this doc: env var NAMES only.

## 1. TL;DR

- Highest "agents want" value per hour: **(1) MPP server** (our API charges agents per call, 402 challenge, settles to Stripe balance), **(2) Link Agent Wallet CLI** (a buyer agent pays that API with a human-approved, one-time credential), **(3) Stripe Projects** (agent provisions our stack, ~5 min).
- Minimum credible integration for the side quest: MPP-gated endpoint live on the deployed URL + one real `link-cli mpp pay --test` run against it (sell side + buy side in one demo) + `stripe projects init/add` visible in the repo (`.projects/state.json`). That is 3 distinct Stripe products with one visible payment row in the Dashboard.
- Cheap extras that add "elements" (each <=15 min): Payment Link as human top-up, Billing meter events as usage ledger, `stripe directory search` in the demo, Stripe MCP in the build loop.
- Biggest risks: (a) Link Agent Wallet payments are **US/Canada consumers only** and need a human Link account to approve; (b) card/SPT path has a **0.50 USD minimum**; (c) stablecoin path needs account approval (not NY; outside US = email Stripe). Details in section 6.

## 2. Product map

Effort = my estimate for a working minimal version in the sandbox.

| Product | Role | Effort (min) | When to use | Link |
|---|---|---|---|---|
| MPP server (`mppx` + `stripe`) | sell-side | 30-45 | Core: charge agents per API call, HTTP 402 | https://docs.stripe.com/payments/machine/mpp.md |
| MPP sessions (streaming/metered) | sell-side | 60+ | Variable pricing (tokens, rows). Needs stateful store, Tempo. Skip unless the idea needs it | https://docs.stripe.com/payments/machine/mpp/sessions.md |
| x402 (Base, USDC) | sell-side | 30 | Only if the buyer agent is crypto-native. Not needed | https://docs.stripe.com/payments/machine/x402.md |
| Link Agent Wallet CLI (`@stripe/link-cli`) | buy-side | 20-30 | Agent pays on a human's behalf with approval + guardrails; also pays MPP endpoints (`mpp pay`) | https://docs.stripe.com/agentic-commerce/agents/link-agent-wallet |
| Link SDK (`@stripe/link-sdk`) | buy-side | 45+ | Only for a hosted agent in code; needs OAuth client registration (application form) | https://github.com/stripe/link-cli/tree/main/packages/sdk |
| Stripe Projects | infra | 5-10 | Agent provisions Supabase/Vercel/Resend/OpenRouter/AgentMail etc. from one CLI | https://docs.stripe.com/projects |
| Stripe Directory | discovery | 5 | Agent finds MPP services / providers; our MPP backend gets listed after Stripe review | https://docs.stripe.com/directory.md |
| Payment Links | sell-side (human) | 10 | Human top-up / purchase page, zero UI | https://docs.stripe.com/payments/payment-links/api.md |
| Checkout / Elements / hosted invoice (WebMCP) | sell-side | 30-60 | Browser agents get structured tools on the Stripe payment page; nothing extra to build | https://docs.stripe.com/agentic-commerce/for-agents/webmcp.md |
| Billing: meters + meter events | sell-side | 20-30 | Usage-based billing ledger per agent/customer | https://docs.stripe.com/billing/subscriptions/usage-based/meters/configure.md |
| Metronome | sell-side | UNVERIFIED | Listed as Stripe Projects provider `metronome/sandbox`; I did not read usage docs | https://projects.dev/providers |
| Stripe MCP (`https://mcp.stripe.com`) | build tool | 5 | Coding agent reads/writes sandbox objects | https://docs.stripe.com/mcp.md |
| Agent skills (`stripe agent setup`) | build tool | 5 | Point Claude Code at accurate Stripe guidance | https://docs.stripe.com/skills.md |
| Sell through agents (UCP/ACP product feeds) | sell-side | n/a | Skip: needs catalog + protocol integration; the agent-side counterpart is private preview | https://docs.stripe.com/agentic-commerce |
| Atlas, Connect, Treasury | other | UNVERIFIED | Not researched. Connect: MPP is supported on all charge types per docs. Treasury: MCP tool `get_balance_summary` is public preview | n/a |

## 3. Quickstart per product

### 3.0 Sandbox + CLI

```bash
npm install -g @stripe/cli@latest       # docs say v1.43.3+ for `stripe docs`
stripe sandbox create --from-git        # no account needed; saves test keys to CLI profile
# alternatives: stripe sandbox create --email you@example.com [--full-name "..."] [--non-interactive]
stripe sandbox claim                    # sandbox expires in 7 days unless claimed
stripe login                            # if you already have a Stripe account
stripe agent setup                      # installs Stripe MCP + skills into detected agents
```

- Output of `sandbox create` is JSON with `secret_key`, `publishable_key`, `claim_url`, `account_id`, `expires_at`. Do not paste it into the repo.
- Skills only: `npx skills add https://docs.stripe.com -g -y` (manual, no auto-update).
- Stripe MCP for Claude Code: `claude mcp add --transport http stripe https://mcp.stripe.com/` then authenticate via `claude /mcp`. Key-based auth needs an Agent API key (env var of your choice, e.g. `AGENT_API_KEY`); from 2026-10-31 non-Agent keys get 401.

### 3.1 Stripe Projects

```bash
stripe plugin install projects
stripe projects init [name]                 # writes .projects/, adds vault + .env to .gitignore
stripe projects catalog --json              # or: stripe projects search <keyword> --json
stripe projects add supabase/project
stripe projects add vercel/project
stripe projects add resend/email
stripe projects add openrouter/api
stripe projects add agentmail/api
stripe projects env --pull                  # sync creds to .env (also runs after add/rotate/upgrade)
stripe projects status --json
stripe projects billing add                 # only needed for paid tiers
stripe projects billing update --limit <amount> [--provider <provider>]   # spend cap
```

- Syntax is `<provider>/<service>`. Slugs verified on https://projects.dev/providers: `supabase/project`, `vercel/project`, `resend/email`, `openrouter/api`, `agentmail/api`, `agentphone/number`, `browserbase/project`, `exa/api`, `firecrawl/api`, `kernel/project`, `posthog/analytics`, `metronome/sandbox`, `neon/postgres`, `upstash/redis`, `elevenlabs/tts`, `e2b/sandboxes`, `daytona/sandbox`. (`stripe projects add supabase` without `/service` appears on shipbysundown; docs use the full form.)
- Non-interactive/agent flags (all commands): `--json`, `--no-interactive`, `--auto-confirm`, `--accept-tos`, `--quiet`, `--debug`.
- Error `PROVIDER_NOT_LINKED` -> `stripe projects link <provider>`. To avoid browser popups: sign in to Stripe, `stripe projects link <provider>`, `stripe projects billing add`, then start the agent.
- Agent skill: `npx skills add https://docs.stripe.com --skill stripe-projects -g -y`. Then prompt: "Use Stripe Projects to set up a Next.js app with Supabase, Vercel, and PostHog."
- Template shortcut: `stripe projects build my-app --template stripe/nextjs-saas` (registry: https://github.com/stripe/projects-template-registry). Not tested.
- Share/replicate stack: `stripe projects share` -> `stripe projects init --from <URL>`.
- Credentials are NOT pushed to Vercel automatically. Add env vars in the Vercel dashboard/CLI yourself.
- Commit `.projects/state.json` and `.projects/state.local.json`; never commit `.projects/vault/` or `.env*` (init gitignores them).
- Env var names written depend on provider: run `stripe projects env` (lists names, hides values). I did not verify the exact names per provider.
- Gotcha for us: `add supabase/project` provisions a NEW Supabase project via Stripe. We already have the hackathon Supabase project, so use `stripe projects link supabase` + `add` only if we want a fresh one. Whether `link` can attach an existing project: UNVERIFIED.

### 3.2 MPP server (sell side: accept per-call payment)

Prereqs: Stripe profile created in the Dashboard (https://docs.stripe.com/get-started/account/profile.md); store its `profile_` ID (sandbox: `profile_test_...`) as `STRIPE_PROFILE_ID`. Docs show retrieving it via `GET https://api.stripe.com/v2/network/business_profiles/me` with header `Stripe-Version: 2026-07-29.preview`.

```bash
npm install mppx stripe
```

```typescript
// Verbatim from https://docs.stripe.com/payments/machine/mpp.md (Node.js)
import crypto from 'crypto';
import StripeClient from 'stripe';
import { Mppx, stripe } from 'mppx/server';

const mppSecretKey = crypto.createHmac("sha256", process.env.STRIPE_SECRET_KEY!).update("mpp-challenge-signing").digest("base64");
const stripeClient = new StripeClient(process.env.STRIPE_SECRET_KEY!);

const stripeMachinePayments = stripe.create({
  client: stripeClient,
  networkId: process.env.STRIPE_PROFILE_ID!,
  livemode: !process.env.STRIPE_SECRET_KEY!.includes('_test_')
});

const mppx = Mppx.create({
  methods: stripeMachinePayments.defaultMethods(),
  secretKey: mppSecretKey,
});

export async function handler(request: Request) {
  const response = await mppx.charge({ amount: '0.50' })(request);
  if (response.status === 402) return response.challenge;
  return response.withReceipt(Response.json({ data: '...' }));
}
```

- Default = card via Shared Payment Tokens (SPT). Min 0.50 USD.
- Add stablecoin (Tempo, min 0.01 USDC): create a deposit address, store as `TEMPO_DEPOSIT_ADDRESS`, add `depositAddresses: { tempo: process.env.TEMPO_DEPOSIT_ADDRESS! }` to `stripe.create(...)`. `defaultMethods()` then offers SPT and Tempo at the same amount.

```bash
# Replace $STRIPE_SECRET_KEY with your sandbox key from env; do not inline it
curl https://api.stripe.com/v1/crypto/deposit_addresses \
  -u "$STRIPE_SECRET_KEY:" \
  -H "Stripe-Version: 2026-07-29.preview" \
  -d network=tempo
```

- Required env var names: `STRIPE_SECRET_KEY`, `STRIPE_PROFILE_ID`, `TEMPO_DEPOSIT_ADDRESS` (stablecoin only). Sessions also: `MPP_SESSION_OPERATOR_KEY`.
- Different price per method: `mppx.compose()` (mentioned in docs, no snippet read).
- Validate: `npx mppx@latest validate http://localhost:4242` (tests discovery, challenge, errors, full payment flow; in a sandbox it completes roundtrip test transactions automatically).
- Coding-agent one-shot prompt from docs: `Read https://docs.stripe.com/payments/machine/mpp.md?lang=node, and monetize my API using MPP to charge 0.50 USD per API call. Run npx mppx@latest validate http://localhost:4242 to iteratively validate the implementation as you develop.`
- Starter code: https://github.com/stripe-samples/machine-payments (dirs `mpp/server/`, `mcp/server/node-typescript/` = monetized MCP tool, `x402/server/`; `make install`, `make test`). I could not read the per-sample READMEs (404), so run commands per sample are UNVERIFIED.
- Next.js on Vercel: the handler is Web-standard `Request -> Response`, so it should drop into an App Router route handler. Not verified in docs. mppx README lists Next.js/Hono/Express/Node/Bun/Deno adapters (import paths other than `mppx/server` and `mppx/hono` UNVERIFIED).
- `Store.memory()` (sessions) works for a single process only; on Vercel serverless use `charge`, not sessions, unless you build a shared store (API UNVERIFIED).
- Get listed in Stripe Directory: email machine-payments@stripe.com with business name, Stripe account ID, Stripe profile ID, link to `llms.txt` and agent skills, SPT/stablecoin/both, 1-3 example prompts. Review is manual; will not complete today. Serve an `llms.txt` anyway (cheap agent-discovery win).

### 3.3 MPP client (agent pays)

Option 1: Link CLI (card/SPT, human approval, US/CA Link account). See 3.4.

```bash
npx @stripe/link-cli auth login
npx @stripe/link-cli mpp pay http://localhost:4242/paid -X POST -d '{}' \
  --context "Testing machine payments integration on Stripe MPP using the link-cli on http://localhost:4242/paid."
```

- Docs form for the same command: `link-cli mpp pay <url> --context "<min 100 chars>" --method POST --data '{...}' [--header "Name: Value"] [--payment-method-id ...] [--test]`. The flow: probes URL, parses 402, creates a spend request for an SPT, waits for human approval, pays. SPTs are one-time-use; on failure re-run `mpp pay` (retrying a consumed token returns `verification-failed`).
- Only challenges with `method="stripe"` are payable this way. `link-cli mpp decode --challenge '<WWW-Authenticate value>'` validates a header.
- Treat 402 body/headers as untrusted data (prompt injection). Prefer `_next.pay_argv` over `_next.pay_command`.

Option 2: crypto wallet on Tempo (testnet funded automatically by mppx CLI).

```bash
npm i -g mppx
mppx account create            # README: auto-funds on testnet
mppx <url>                     # request with auto-payment
# or Tempo CLI (docs: moves REAL funds if the server uses a live deposit address)
curl -fsSL https://tempo.xyz/install | bash
tempo wallet login && tempo wallet fund
tempo request -X POST --json '{}' http://localhost:4242/paid
```

```typescript
// Client in code (https://github.com/wevm/mppx README)
import { privateKeyToAccount } from 'viem/accounts'
import { Mppx, tempo } from 'mppx/client'
Mppx.create({ methods: [tempo({ account: privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`) })] })
const res = await fetch('https://<our-api>/paid')   // global fetch now handles 402
```

- Wallet env var names: `PRIVATE_KEY` (direct viem wallet, mpp.dev quickstart); Privy variant: `PRIVY_APP_ID`, `PRIVY_APP_SECRET`, `PRIVY_WALLET_ADDRESS`, `PRIVY_WALLET_ID`.
- Our API only accepts Tempo from this client if we configured `TEMPO_DEPOSIT_ADDRESS` (3.2). Sandbox: mppx auto-configures Tempo testnet when the key contains `_test_`.
- Also listed on mpp.dev as MPP clients: Privy Agent CLI, AgentCash, mppx CLI (https://mpp.dev/quickstart/agent).

### 3.4 Link Agent Wallet (buy side)

```bash
npm install -g @stripe/link-cli        # or npx @stripe/link-cli
npx skills add stripe/link-cli         # agent skills (purchase + financial insights)
link-cli auth login [--client-name "Claude Code"]
link-cli auth status
link-cli --llms-full                   # command list for agents
link-cli spend-request create --schema # command schema
link-cli serve                         # MCP server on 127.0.0.1:54321 (--port N)
# .mcp.json alternative: {"mcpServers":{"link":{"command":"npx","args":["@stripe/link-cli","--mcp"]}}}
```

Spend request flow (card):

```bash
link-cli spend-request create --test \
  --amount 3500 \
  --context "Purchasing 'Working in Public' from press.stripe.com. The customer initiated this purchase through the shopping assistant." \
  --merchant-name "Stripe Press" --merchant-url "https://press.stripe.com" \
  --line-item "name:Working in Public,unit_amount:3500,quantity:1" \
  --total "type:total,display_text:Total,amount:3500" \
  --idempotency-key "purchase-attempt-<uuid>"
# returns {id: lsrq_..., status: pending_approval, approval_url, _next}. Show approval_url to the human.
link-cli spend-request retrieve lsrq_abc123 --interval 2 --max-attempts 300
link-cli spend-request retrieve lsrq_abc123 --include card --output-file /tmp/link-card.json --format json   # 0600 file, keeps PAN out of stdout
link-cli spend-request update lsrq_abc123 --amount 7500 && link-cli spend-request request-approval lsrq_abc123   # raise amount (re-approval)
link-cli spend-request list | cancel <id>
link-cli user-info retrieve --format json     # shows agent_wallet_spend_limits: per_transaction, daily, thirty_day (cents; null = unlimited)
link-cli shipping-address list --format json
link-cli report --domain shop.example.com --outcome success --spend-request-id lsrq_abc123   # outcome: success|blocked|abandoned
```

- Flags: `--amount` (smallest unit, 3500 = 35.00 USD) and `--context` (**min 100 chars**) are always required. `--merchant-name/--merchant-url` required for virtual cards, omitted for SPT and Link Pay Token. `--credential-type card|shared_payment_token`, `--network-id` (required for SPT; from `link-cli mpp decode`), `--execution-method link_pay_token` + `--merchant-account-id acct_...` (Stripe checkout pages), `--currency`, `--payment-method-id`, `--metadata key:value`, `--expires-at`, `--test`, `--no-request-approval`.
- Statuses: `created`, `pending_approval`, `requires_action`, `approved`, `submitted`, `succeeded`, `failed`, `denied`, `expired`, `canceled`. Human has 10 minutes to approve, then `expired`. Branch on `status_details.requires_action.next_action.resolution` (`auto_resume` | `create_new_spend_request` | `create_new_spend_request_after_completion`), not on `type`.
- Guardrails (what we show in the demo): per-purchase human approval, one-time-use credential, real card number never exposed, spend limits (per transaction / daily / 30-day) readable via `user-info retrieve`.
- Link Pay Token: on Stripe-hosted checkout the agent ticks the hidden "I am an AI agent" checkbox (`.AiAgentPaymentSteering`), then injects the token into `input[name="link_pay_token"]`. Token valid up to 30 min. Full JS in https://docs.stripe.com/agentic-commerce/agents/link-agent-wallet/use-link-wallet-pay-online.md#pay-with-a-link-pay-token
- SDK (hosted agent): `npm install @stripe/link-sdk` (Node 20+, ESM only). `new Link({ accessToken: process.env.LINK_ACCESS_TOKEN! })`, `link.paymentMethods.list()`, `link.approvalPolicy.retrieve()`, tools via `createLinkTools` from `@stripe/link-sdk/tools`. Go SDK exists. Resource list: spend requests, payment methods, shipping addresses, user info, transactions, sources, balances, Web Bot Auth signing, reports.
- Env var names: `LINK_ACCESS_TOKEN`, `LINK_REFRESH_TOKEN`, `LINK_NO_REFRESH`, `LINK_AUTH_FILE`, `LINK_API_BASE_URL`, `LINK_AUTH_BASE_URL`, `LINK_HTTP_PROXY`.
- Link API is `api.link.com` / `login.link.com`, separate from `api.stripe.com`. Stripe secret/restricted keys do NOT authenticate it. Hosted agents need an OAuth client (application form, wait for `client_id`/`client_secret`) with scope `payment_methods.agentic`. The CLI path (`auth login`) avoids registration: use it today.

### 3.5 Payment Links (human top-up page)

```bash
# From shipbysundown (CLI flag form NOT verified in the CLI reference):
stripe payment_links create --line-items price=price_123
# Verified API form (docs.stripe.com/payments/payment-links/api):
curl https://api.stripe.com/v1/prices -u "$STRIPE_SECRET_KEY:" -d currency=usd -d unit_amount=1000 -d "product=<PRODUCT_ID>"
curl https://api.stripe.com/v1/payment_links -u "$STRIPE_SECRET_KEY:" -d "line_items[0][price]=<PRICE_ID>" -d "line_items[0][quantity]=1"
# Inline product: -d "line_items[0][price_data][product_data][name]=Credits" -d "line_items[0][price_data][currency]=usd" -d "line_items[0][price_data][unit_amount]=1000" -d "line_items[0][quantity]=1"
```

- Up to 20 line items (flat-rate). Subscription: recurring price + `-d "subscription_data[trial_period_days]=7"`.
- Invoices (from shipbysundown, CLI form unverified): `stripe invoices create --customer cus_123 --collection-method send_invoice --days-until-due 7`.
- Via Stripe MCP (verified supported methods): create product, price, payment link, checkout session, invoice, subscription.

### 3.6 WebMCP on Checkout / Payment Links / Elements

- Nothing to integrate: Stripe pages register WebMCP tools (read checkout/invoice context, select payment method, fill fields, submit where Stripe controls submit). Supported UIs: full-page Checkout, embedded form, Elements (Checkout API), hosted invoice page. Payment Links themselves are not named in that list; shipbysundown says they are WebMCP-enabled. Treat as likely, not confirmed.
- Agent side: discover tools at runtime, never hard-code names; re-discover after state changes; payment-submission tools carry `consequentialHint`, so ask the human before calling. Fall back to browser automation if no tool.
- WebMCP is an experimental browser capability. Which browser/flag exposes it: UNVERIFIED (see https://developer.chrome.com/docs/ai/webmcp).

### 3.7 Billing: usage-based meter events

```bash
curl https://api.stripe.com/v1/billing/meters -u "$STRIPE_SECRET_KEY:" \
  -d "display_name=API calls" -d event_name=api_calls \
  -d "default_aggregation[formula]=sum" \
  -d "customer_mapping[event_payload_key]=stripe_customer_id" -d "customer_mapping[type]=by_id" \
  -d "value_settings[event_payload_key]=value"

curl https://api.stripe.com/v1/billing/meter_events -u "$STRIPE_SECRET_KEY:" \
  -d event_name=api_calls -d "payload[value]=1" -d "payload[stripe_customer_id]=<CUSTOMER_ID>"
```

- Meter config is immutable after creation except display name. `event_name` maps to one meter only. Timestamp must be within past 35 days and <=5 min in the future. Idempotency via `identifier`. Sandbox meter events count against global rate limit. Live: 1000 calls/s/account, 1 concurrent call per customer per meter. Processing is async (usage summaries lag).
- I did not read the steps to attach the meter to a usage-based price/subscription: https://docs.stripe.com/products-prices/pricing-models.md#usage-based-pricing (UNVERIFIED here).
- MPP payments already land as PaymentIntents in the balance. Meters are an additive "usage ledger per agent" element, not required for MPP.

### 3.8 Directory

```bash
stripe plugin install directory                 # upgrade: stripe plugin upgrade directory
stripe directory search "web browsing api" --format json
stripe directory search "send post mail" --mpp-supported
stripe provision postalform --accept-tos --yes  # example from docs for a Projects provider
npx skills add https://docs.stripe.com --skill stripe-directory -g -y
```

- Directory indexes Stripe Apps, Projects providers, MPP endpoints (mpp.dev), Stripe business network. It is a "preview" per the docs. Output columns: Stripe Apps / Projects / Machine Payments / MCP / Link.

## 4. Fastest credible demo paths

All three assume sandbox only. Times are estimates for a team that already has the Next.js + Supabase skeleton deployed.

### Recipe A: Paid agent API via MPP on Vercel + Supabase audit log (core, ~75-90 min)

| Step | Action | Min |
|---|---|---|
| 1 | `stripe sandbox create --from-git`; create Stripe profile in Dashboard; set `STRIPE_SECRET_KEY`, `STRIPE_PROFILE_ID` in `.env` and Vercel | 10 |
| 2 | `stripe agent setup` + prompt Claude Code with the MPP one-shot prompt (3.2) | 10 |
| 3 | Route handler returns data behind `mppx.charge({ amount: '0.50' })` | 20 |
| 4 | On success, insert a row into Supabase (`agent_calls`: endpoint, amount, receipt/PaymentIntent id if exposed (UNVERIFIED), ts) | 15 |
| 5 | `npx mppx@latest validate https://<vercel-url>` against the deployed URL | 10 |
| 6 | Serve `/llms.txt`; submit Directory listing email | 10 |

Show in video: curl without payment -> HTTP 402 + challenge; `mppx`/`link-cli mpp pay` -> 200 + data; Dashboard Payments row; Supabase row appearing in real time.

### Recipe B: Agent buys on a user's behalf with Link guardrails (~60 min, needs a US/CA Link account)

| Step | Action | Min |
|---|---|---|
| 1 | `npm i -g @stripe/link-cli`, `npx skills add stripe/link-cli`, `link-cli auth login` (human with US/CA Link account) | 10 |
| 2 | Claude Code (or `link-cli serve` MCP) runs `spend-request create --test` with a 100+ char `--context` | 15 |
| 3 | Human approves on `approval_url` (phone/web); agent polls until `approved` | 5 |
| 4 | Agent retrieves credential (`--output-file`), completes a checkout or `mpp pay` | 20 |
| 5 | Stash spend requests in Supabase (`spend_requests`: id, status, amount, merchant) for a live approvals feed | 10 |

Show in video: agent asks, approval screen on a phone, credential issued, purchase done, `user-info retrieve` showing per-transaction/daily/30-day limits. `--test` never charges the real method.

### Recipe C: Closed loop, most Stripe elements (A + B + extras, ~2.5-3 h; recommended if the idea is an agent-to-agent service)

Buyer agent (Link CLI, human-approved SPT) calls our MPP API (sell side) which logs to Supabase; Stripe Projects provisioned the stack; a Payment Link tops up the human; a Billing meter records usage.

| Stripe element | Where it shows |
|---|---|
| MPP (sell) | 402 challenge, Payments row |
| Link Agent Wallet (buy) | approval screen, `mpp pay` |
| Shared Payment Tokens | implicit in `mpp pay` credential (`credential_type: shared_payment_token`) |
| Stripe Projects | `stripe projects init/add` in the repo + terminal clip |
| Directory | `stripe directory search` clip + listing request sent |
| Payment Links | human top-up URL |
| Billing meter events | meter summary in Dashboard |
| Stripe MCP + skills | listed under Coding Tools / build story |
| Checkout WebMCP | optional clip, only if a WebMCP-capable browser is available (UNVERIFIED) |

Demo video (90 s, fits PROJECT.md §7): 0-10 problem; 10-25 one-liner + agent POV; 25-70 live loop (agent hits API -> 402 -> Link approval -> 200 -> Supabase row + Dashboard payment); 70-85 name each Stripe piece once; 85-90 outcome price line.

## 5. Test mode

| What | How | Source |
|---|---|---|
| Sandbox keys without an account | `stripe sandbox create`; expires in 7 days, `stripe sandbox claim` to keep | https://docs.stripe.com/cli/sandbox |
| Test card (Checkout/Payment Links/Elements) | `4242 4242 4242 4242`, any future expiry, any CVC (standard Stripe test card; from shipbysundown/PROJECT.md) | shipbysundown.dev |
| Link Agent Wallet test mode | `--test` on `spend-request create` (and `mpp pay`). Returns test credentials, e.g. card `4000009990001984`, never charges the real method | link-wallet docs |
| MPP server E2E in sandbox | `npx mppx@latest validate <url>`: in a sandbox the CLI auto-completes roundtrip test transactions | mpp.md |
| MPP card/SPT manual test | `npx @stripe/link-cli mpp pay <url> ...` then check Dashboard > Payments | mpp.md |
| MPP stablecoin in sandbox | Use sandbox API key + sandbox profile (`profile_test_`) + a deposit address created with the sandbox key. `livemode` becomes `false`, mppx uses Tempo **testnet**. `mppx account create` auto-funds testnet | mpp.md, mppx README |
| Tempo CLI | `tempo wallet fund` etc. Docs warn it moves REAL funds if the server uses a live deposit address. Keep it sandbox-only | mpp.md |
| Meter events | Sandbox works; `stripe trigger v1.billing.meter.error_report_triggered --api-key <key>` for error events | recording-usage-api |
| Stripe Projects | Real provider accounts are created (free tiers; I did not verify free-tier terms per provider). Cap spend with `stripe projects billing update --limit` | projects docs |

## 6. Gotchas, limits, access

Verified from docs unless tagged.

| Topic | Fact | Impact today |
|---|---|---|
| Link payments geography | Agent payments: **US and Canadian consumers**. Financial insights: US consumers. Sellers can be anywhere | The human approver needs a US/CA Link account. We are in a Supabase event; confirm someone on the team qualifies. Otherwise demo with `--test`, which still needs `link-cli auth login` (whether `auth login` works for a non-US/CA user: UNVERIFIED) |
| Link OAuth for hosted agents | Requires application form -> Stripe sends `client_id`/`client_secret`. Turnaround UNVERIFIED | Use CLI `auth login`, not the SDK OAuth path |
| Link spend request | `--context` min 100 chars; human has 10 min; credential one-time-use; SPT retry with consumed token = `verification-failed` | Pre-write the context string |
| "Agents" side of Agentic Commerce (embed checkout in an AI interface, ACP/UCP product feeds) | **Private preview, waitlist** | Do not plan on it |
| MPP minimums | SPT/card >= 0.50 USD; stablecoin >= 0.01 USDC; sessions can accrue sub-cent but settle >= 0.01 USDC | Price per call >= 0.50 USD for card path, or enable stablecoin |
| Stablecoin enablement | Dashboard > payment methods > "Stablecoins and Crypto"; Stripe reviews the request. US except New York. Outside US: email machine-payments@stripe.com with account ID (30+ countries) | May not be approved today. Fallback: SPT path only |
| SPT availability | All US states; outside US check supported-country list (https://docs.stripe.com/agentic-commerce/concepts/shared-payment-tokens.md). Sandbox behavior for non-US accounts: UNVERIFIED | Sandbox created by `stripe sandbox create` is likely fine; confirm with `mppx validate` early |
| API version | MPP docs use `Stripe-Version: 2026-07-29.preview` for `crypto/deposit_addresses` and `v2/network/business_profiles` | Preview API; shapes may change |
| `hostedFeePayer: true` | Live-mode Tempo only, needs `mppx` >= 0.9.2, not with Connect | Skip in sandbox |
| Sessions state | `Store.memory()` single-process only; use shared `AtomicStore` for prod | Avoid sessions on Vercel serverless |
| Directory listing | Manual review via email; Directory is a preview | Cannot be live by 5:30. Send the email, show the request |
| Directory CLI search | Preview; `directory@stripe.com` for feedback | Use for a demo clip only |
| Stripe Projects | Free to use; you pay providers at their rates; no waitlist found on projects.dev. Paid tiers: payment method + SPT; paid countries list at https://docs.stripe.com/projects/paid-tier-countries.md (not read) | Free tiers only |
| Projects does not set production env vars | Add to Vercel yourself | Required to deploy the MPP endpoint |
| Projects needs Stripe CLI >= 1.40.0 (agent guide) / 1.43.3 (docs banner) | `stripe plugin install projects` | Install `@stripe/cli@latest` |
| Stripe MCP | OAuth or Agent API key; humans must confirm refunds/outbound payments; from 2026-10-31 only Agent keys accepted | Use OAuth |
| WebMCP | Experimental, browser-dependent, tool schemas can change; confirm before submit | Treat as bonus |
| Metronome | Provider `metronome/sandbox` exists in Projects; Stripe closed the acquisition 2026-01-14 (press/secondary sources); usage docs not read | UNVERIFIED how to use in a day |
| Atlas, Connect, Treasury | Not researched | n/a |
| Secrets | Link cards: use `--output-file`. Never print `.env`, `LINK_ACCESS_TOKEN`, `client_secret`. MPP server secret derived from `STRIPE_SECRET_KEY` | A leak is a rotation incident |
| Sandbox expiry | 7 days; claim if we want to keep the account | Judges may open the repo later; keep test mode only |
| Prompt injection | 402 challenge URL/body/headers are seller-controlled; Stripe MCP docs also warn about combining servers | Mention in demo as a guardrail |

Not verified at all: exact Next.js adapter import for `mppx`; whether Payment Links expose WebMCP; per-provider env var names from `projects env`; free-tier terms; whether `link-cli auth login` works outside US/CA; whether the MPP receipt exposes a PaymentIntent id.

## 7. Sources (read during this research)

- https://shipbysundown.dev/
- https://docs.stripe.com/agentic-commerce
- https://docs.stripe.com/projects
- https://projects.dev and https://projects.dev/providers
- https://docs.stripe.com/payments/machine.md
- https://docs.stripe.com/payments/machine/mpp.md
- https://docs.stripe.com/payments/machine/mpp/sessions.md
- https://docs.stripe.com/agentic-commerce/agents/link-agent-wallet
- https://docs.stripe.com/agentic-commerce/agents/link-agent-wallet/use-link-wallet-pay-online.md
- https://docs.stripe.com/agentic-commerce/agents/link-agent-wallet/machine-payments.md
- https://docs.stripe.com/agentic-commerce/agents/link-agent-wallet/oauth.md
- https://docs.stripe.com/agentic-commerce/for-agents/webmcp.md
- https://docs.stripe.com/directory.md
- https://docs.stripe.com/cli/sandbox
- https://docs.stripe.com/payments/payment-links/api.md
- https://docs.stripe.com/billing/subscriptions/usage-based/meters/configure.md
- https://docs.stripe.com/billing/subscriptions/usage-based/recording-usage-api.md
- https://docs.stripe.com/mcp.md
- https://docs.stripe.com/skills.md
- https://github.com/stripe/link-cli (README)
- https://raw.githubusercontent.com/stripe/link-cli/main/packages/sdk/README.md
- https://github.com/stripe-samples/machine-payments (README)
- https://github.com/wevm/mppx (README via raw.githubusercontent.com)
- https://mpp.dev/quickstart/agent and https://mpp.dev/quickstart/client
- Web search snippets only (not full reads): Stripe MPP launch blog (https://stripe.com/blog/machine-payments-protocol), Metronome acquisition coverage (https://stripe.com/newsroom/news/stripe-completes-metronome-acquisition)
- Failed to read (403/404): npmjs.com pages for `@stripe/link-cli` and `@stripe/link-sdk` (package names and install commands confirmed via docs/GitHub instead); `stripe-samples/machine-payments` per-sample READMEs.
