# Supabase Select 2026: builder's reference

Researched 2026-10-03 from primary sources (supabase.com blog, changelog, docs, Stripe docs). Every claim below was read on the page listed in section 7. Anything not read is marked **UNVERIFIED**.

## 1. TL;DR

- **Supabase Compute** (private alpha, waitlist): long-running services and agent sandboxes next to the database. No run-time limit, full Linux, deploy with `supabase compute deploy`. No pricing, regions or limits published. Matt gets us access; nobody can self-serve today.
- **Your app's MCP server** (available now): `npx shadcn@latest add @supabase/mcp` drops an authed Edge Function MCP server into the repo. Users' agents sign in through your Auth (OAuth 2.1) and RLS applies. This is the best fit for "build something agents want" and works today without alpha access.
- **Supabase Compute is not required to win.** Everything else in the agent path (MCP block, Auth OAuth server, Realtime, pgvector, Queues, Edge Functions, Stripe Projects) is usable now.
- Also announced: Docker-free local dev (alpha), Declarative Schemas 2.0, `query_logs` MCP tool, Health Advisors, Notebooks, Pipelines destinations (public alpha), Multigres (private alpha), OrioleDB (public beta), Supabase acquires Turso, $150M new funding.

## 2. Announced at Select 2026 (San Francisco, 2026-10-02)

Select was one day: **2026-10-02** (select.supabase.com). Blog posts are dated 2026-10-02. OrioleDB changelog is dated 2026-10-01.

| Feature | What it is | Status | Link |
|---|---|---|---|
| Supabase Compute | Web services and agent sandboxes in the same project and network as Postgres | Private alpha, waitlist | https://supabase.com/compute |
| Your app's MCP server | shadcn block: authed MCP server as an Edge Function, per-user via RLS | Available now | https://supabase.com/library/docs/headless/mcp |
| Local dev without Docker | Native-process local stack; several instances per directory | Alpha, off by default | https://supabase.com/docs/guides/local-development/cli/getting-started |
| Declarative Schemas 2.0 | SQL files in `supabase/schemas/` are source of truth; `pg-delta` generates migrations | Default for new projects; opt-in for existing | https://supabase.com/docs/guides/local-development/declarative-database-schemas |
| Config in code | `config.toml` holds auth providers, API limits, buckets; `supabase config pull`, `supabase pull` | Available | https://supabase.com/blog/select-2026-build-anything |
| `query_logs` MCP tool | Raw SQL access to project logs for agents | GA | https://supabase.com/blog/select-2026-operate-with-confidence |
| Health Check Advisors | Flags elevated error rates in Data API, Auth, Storage, Edge Functions | GA | https://supabase.com/changelog/50577-health-check-advisors |
| Database Connections viewer | Sessions, long queries, idle txns, blocked queries, lock holders | GA, on by default | https://supabase.com/dashboard/project/_/observability/connections |
| Explorer and Notebooks | New SQL workspace; notebooks sync with `supabase notebooks pull/push` | GA; Explorer rolling out through 2026-10-12 | https://supabase.com/dashboard/project/_/explorer |
| Enterprise-managed MCP auth | Okta SSO, short-lived member-bound tokens | GA; Team or Enterprise with SSO | https://supabase.com/docs/guides/platform/sso/enterprise-mcp-authentication |
| Scoped personal access tokens | Limit to orgs, projects, permissions; read-only option | GA; default for new dashboard tokens | https://supabase.com/dashboard/account/tokens |
| MCP elicitations | Confirmation before paid project/branch creation and destructive SQL | GA, on by default | https://supabase.com/docs/guides/ai-tools/mcp |
| Pipelines destinations | Stream Postgres to BigQuery, ClickHouse, DuckLake, Snowflake | Public alpha; Pro, Team, Enterprise | https://supabase.com/docs/guides/database/replication/pipelines |
| Multigres | Multi-node HA Postgres (Vitess team) | Private alpha, invite only, not for production | https://supabase.com/go/multigres-early-access |
| OrioleDB | Undo-log storage engine; no bloat or VACUUM | Public beta (all plans) | https://supabase.com/docs/guides/database/orioledb |
| dbarena | Open, reproducible DB benchmarks | Live | https://dbarena.com |
| Turso acquisition | Supabase acquires Turso (per-agent databases at scale) | Announced; no integration timeline | https://supabase.com/blog/supabase-is-acquiring-turso |
| $150M funding | Led by GIC; CapitalG, IronArc, SquarePeg | Announced 2026-10-02 | https://www.prnewswire.com/news-releases/supabase-announces-150m-in-new-funding-and-turso-acquisition-302896752.html |

Shipped shortly before Select (also usable now):

| Date | Feature | Status | Link |
|---|---|---|---|
| 2026-09-30 | `@supabase/middleware` 1.0 (`withSupabase`) | Stable | https://supabase.com/changelog/supabase-middleware-1-0 |
| 2026-08-05 | Postgres Changes: AND filters, new operators, column selection | Available | https://supabase.com/blog/postgres-changes-filters-and-column-selection |
| 2026-08-24 | Enterprise-managed auth for the Supabase MCP server | GA | https://supabase.com/blog/enterprise-managed-auth-for-the-supabase-mcp-server |
| 2026-07-31 | Supabase Evals (agents vs Supabase tasks) | Open source | https://supabase.com/blog/introducing-supabase-evals |
| 2026-07-29 | Sign in with ChatGPT | Beta, **Supabase dashboard login only**, not an app-auth feature | https://supabase.com/blog/sign-in-with-chatgpt-beta |

## 3. Usable today: quickstarts, limits, gotchas

### 3.1 Your app's MCP server (headline feature for this hackathon)

What: a shadcn "library block" that adds a Deno Edge Function at `supabase/functions/mcp/`. Tools run as the signed-in user with a user-scoped Supabase client, so RLS decides what an agent sees. `supabaseAdmin` is deliberately not in the tool context.

Prerequisites (from the docs page):
- Supabase CLI **2.117.0 or later**
- Asymmetric JWT keys (ES256 or RS256), not legacy HS256 (Dashboard > Settings > JWT)

```bash
npx shadcn@latest add @supabase/mcp
```

Gotcha: the announcement blog says `@supabase/mcp-server`; the docs page says `@supabase/mcp`. Use the docs page name first. If it 404s, try the other. UNVERIFIED which one the registry serves today.

Generated tree: `supabase/functions/mcp/{.env.example,deno.json,deno.lock,index.ts,tools/{index,result,types,whoami}.ts}`.

Config:

```toml
# supabase/config.toml
[functions.mcp]
verify_jwt = false
```

```bash
cp supabase/functions/mcp/.env.example supabase/functions/.env   # set MCP_SERVER_NAME, MCP_SERVER_DESCRIPTION; gitignore it
```

Auth options:
- **Embedded agent** (your own backend calls it): forward `Authorization: Bearer <user access token>`. Keep the token server-side.
- **External MCP clients** (Claude Desktop, Cursor, etc.): install the OAuth Consent block, then:

```toml
[auth.oauth_server]
enabled = true
authorization_url_path = "/oauth/consent"
allow_dynamic_registration = true
```

Set Auth Site URL to the origin that serves `/oauth/consent` (HTTPS in production), then `supabase config push`.

Entry point (verbatim from docs):

```ts
Deno.serve(
  pipeline(
    [withOAuthProtectedResource(), withSupabase({ auth: 'user', cors: { headers: CORS_HEADERS } })],
    handleMcp
  )
)
```

Add a tool (`supabase/functions/mcp/tools/tasks.ts`):

```ts
import type { McpServer } from 'npm:@modelcontextprotocol/server@2.0.0'
import { z } from 'npm:zod@4.4.3'
import { jsonResult, runtimeErrorResult } from './result.ts'
import type { ToolContext } from './types.ts'

export function registerTasksTools(server: McpServer, { supabase }: ToolContext): void {
  server.registerTool(
    'close_task',
    {
      description: 'Mark a task as closed.',
      inputSchema: z.object({ id: z.string().uuid() }),
      annotations: { readOnlyHint: false, idempotentHint: true },
    },
    async ({ id }) => {
      try {
        const { data, error } = await supabase.from('tasks').update({ closed: true }).eq('id', id).select()
        if (error) throw error
        return jsonResult(data)
      } catch (error) {
        return runtimeErrorResult(error)
      }
    }
  )
}
```

Register it in `tools/index.ts` (`registerTools` calls `registerWhoamiTool` and `registerTasksTools`).

Test and deploy:

```bash
cd supabase/functions/mcp && deno task check     # run from that dir
supabase functions serve mcp --env-file supabase/functions/.env
supabase config push
supabase secrets set --env-file supabase/functions/.env
supabase functions deploy mcp
```

Gotchas (from the docs):
- Frontend repos: add `"supabase/functions/**"` to `tsconfig.json` `exclude`.
- Anyone with a valid user token can call the function directly. Keep RLS on.
- OAuth scopes control identity, not database or tool access. Never authorize from user-editable metadata. Use `client_id` in policies for per-client rules.
- Edge Function limits apply (below).

### 3.2 Auth OAuth 2.1 server (agents sign in as users)

- Supabase Auth acts as an OAuth 2.1 / OIDC provider. Authorization code flow with PKCE. Tokens are normal Supabase JWTs with `user_id`, `role`, `client_id`.
- Supports automatic (dynamic) registration for MCP clients (`allow_dynamic_registration = true`).
- No separate charge. Users count toward MAU.
- Docs: https://supabase.com/docs/guides/auth/oauth-server (sub-guides: Getting Started, OAuth Flows, MCP Authentication, Token Security and RLS).
- Gotcha: tokens obey existing RLS automatically. A loose policy leaks across OAuth clients.

### 3.3 Supabase MCP server (agent manages your project)

```bash
claude mcp add --scope project --transport http supabase "https://mcp.supabase.com/mcp"
```

URL params: `?read_only=true`, `?project_ref=<id>`, `?features=database,docs`, `?skip_elicitations=execute_sql,apply_migration`. Local CLI endpoint: `http://localhost:54321/mcp`.

Tool groups: Database, Debugging, Development, Edge Functions, Account Management, Docs, Branching (paid plans), Storage (off by default). New: `query_logs`.

Plugin with MCP plus agent skills in one install:

```bash
npx plugins add supabase-community/supabase-plugin
```

Security: scope to one project (`project_ref`), prefer `read_only=true` for monitoring, keep manual approval on. Elicitations block paid-project creation and destructive SQL, but "it's not a guarantee".

### 3.4 Realtime

Postgres Changes now supports AND filters, more operators and column selection:

```ts
filter: 'status=eq.open,team=eq.billing'     // comma = AND
filter: 'email=like.%@example.com'
filter: 'deleted_at=is.null'
filter: 'status=not.eq.archived'
select: ['id', 'subject', 'updated_at']      // PK always included
```

Operators added: `like`, `ilike`, `is`, `match`, `imatch`, `isdistinct`, `not.` prefix.

Gotchas: column selection needs `@supabase/supabase-js` **2.109.0+**. DELETE events carry only the primary key. No OR. No array/JSON containment, full-text or range operators. RLS still applies.

Limits (docs page, Free / Pro):

| Metric | Free | Pro |
|---|---|---|
| Concurrent connections | 200 | 500 |
| Messages per second | 100 | 500 |
| Channel joins per second | 100 | 500 |
| Channels per connection | 100 | 100 |
| Presence messages per second | 20 | 50 |
| Broadcast payload | 256 KB | 3,000 KB |
| Postgres change payload | 1,024 KB | 1,024 KB |
| Broadcast replay retention | 72 h | 72 h |

### 3.5 Edge Functions (limits that matter for agents)

| Limit | Value |
|---|---|
| Memory | 256 MB |
| Wall clock | 150 s (Free) / 400 s (Paid) |
| CPU time per request | 2 s (excludes async I/O) |
| Request idle timeout | 150 s (504 after) |
| Function size | 20 MB (CLI bundle) / 5 MB (server-side bundle) |
| Recursive calls | 30 requests per trace in a 60 s window |

Anything that needs longer than this is the Compute use case.

### 3.6 pgvector

```sql
create extension vector with schema extensions;

create table documents (
  id serial primary key,
  title text not null,
  body text not null,
  embedding extensions.vector(384)
);

create or replace function match_documents (
  query_embedding extensions.vector(384),
  match_threshold float,
  match_count int
)
returns table (id bigint, title text, body text, similarity float)
language sql stable
as $$
  select documents.id, documents.title, documents.body,
         1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where 1 - (documents.embedding <=> query_embedding) > match_threshold
  order by (documents.embedding <=> query_embedding) asc
  limit match_count;
$$;
```

HNSW index SQL was not on the page I read. UNVERIFIED; see https://supabase.com/docs/guides/ai/vector-indexes. Note: `id serial` vs `returns id bigint` is as written in the docs; cast if the function errors.

### 3.7 Queues (pgmq)

Postgres-native queue on the `pgmq` extension. Guaranteed delivery, exactly-once within a visibility window, RLS and API permissions, dashboard management. Docs: https://supabase.com/docs/guides/queues. Quickstart SQL was **not** on the page I read: UNVERIFIED. Cron (`pg_cron`) and Edge Function invocation from SQL were not researched: UNVERIFIED.

### 3.8 Local dev, schemas, config

```toml
# supabase/config.toml: Docker-free local stack (alpha)
[experimental]
stack = true
# or: SUPABASE_EXPERIMENTAL_STACK=1
```

Declarative schemas:

```bash
# edit supabase/schemas/*.sql, then:
supabase db schema declarative sync
supabase db push
```

```toml
# existing projects opt in:
[experimental.pgdelta]
enabled = true
```

```bash
supabase config pull     # dashboard settings into config.toml
supabase pull            # config, schema, Edge Functions
supabase notebooks pull  # / push
```

Node 20+ is required for the CLI via `npx`. Update the CLI first; the experimental stack needs a recent version (exact minimum UNVERIFIED).

### 3.9 `@supabase/middleware` 1.0

```sh
npm install @supabase/middleware
```

`withSupabase(config)` as a pipeline entry, or `withSupabase(config, handler)`. `auth: 'user'` scopes DB access to the caller via RLS. Built-ins: `withCors`, `withFeatureFlag`. Subpath exports under `@supabase/server/middleware/*`: `withClaims`, `withRequiredClaims`, `withSupabaseClient`, `withSupabaseAdminClient`, `withPostgresClient`, `withPostgresAdminClient`. Runs on Edge Functions, Vercel Functions, Cloudflare Workers, Deno, Bun, Node 22+. Good for MCP/API routes on Vercel.

### 3.10 Other

- **OrioleDB** (public beta): pick at project creation; per-table `USING orioledb` or `USING heap`. Up to 1.8x throughput over heap on TPC-C (Supabase's claim). Skip for a 1-day build.
- **Multigres**: invite-only, "not for production". Skip.
- **Pipelines**: public alpha, paid plans only. Skip.
- **Turso**: "nothing changes" today. Turso Cloud itself is available from Turso (per-agent databases). Not a Supabase product yet.
- **Supabase Evals**: https://supabase.com/evals, repo https://github.com/supabase/evals. Finding: agents pass most scenarios with no skill loaded.
- **Agent footgun from Supabase's own study**: agents grant anonymous write access to all tables when writing RLS. Review every policy the agent writes.

## 4. Supabase Compute: everything known

Status: **private alpha, waitlist** at https://supabase.com/compute. Announced 2026-10-02.

| Topic | Verified fact | Source |
|---|---|---|
| What it runs | Web services and agents "in any language", in the same project as the DB, full Linux environment per service | build-anything blog |
| Languages (conflict) | The compute page says "Node, Deno, or custom Dockerfiles (Private Alpha)". The blog says "any language" and its example uses `language = "python"`. Treat Dockerfile as the safe path for Python. | compute page vs blog |
| Workload types | Ephemeral sandboxes for untrusted code; persistent HTTP services | compute page |
| Run duration | No limit ("as long as the work takes") | both |
| Resources | Configurable memory and CPU per service | blog |
| Scaling | Configurable instance count with request balancing; idle workloads suspend and resume "within one second" | blog, compute page |
| Networking | Public HTTP URL, or private (no HTTP endpoint) for DB-queue background jobs and agent sandboxes. Per-workload firewall for external endpoints. DB access restricted to Compute instances | both |
| Co-location | Same region and network as Postgres, single-digit-ms queries | compute page |
| Env | Services get default env vars (DB credentials, Supabase access) | blog |
| Secrets | Workload-scoped secrets | compute page |
| Auth | Access control via Supabase Auth, short-lived credentials | compute page |
| Observability | Dashboard shows runtime, invocations, logs per service; also traces, audit logs, metrics | both |
| Deploy safety | Branching, progressive rollouts, automatic rollback | compute page |
| Deploy methods | `supabase compute deploy`; Management API; MCP server for sandbox management; GitHub Actions; a "Compute skill" for coding agents | compute page |
| Pricing | **Not published** | both |
| Regions | **Not published** | compute page |
| Quotas and limits | **Not published** (only "configurable") | -- |

Config example from the announcement (verbatim; the TOML header looks like pseudo-syntax, so confirm against alpha docs):

```toml
[service example]
language = "python"
instances = 3
memory = 2048
cpu = 1
```

```bash
supabase compute deploy
```

How to get access:
1. Join the waitlist: https://supabase.com/compute.
2. In person: ask staff member **Matt** (from the kickoff talk; not verifiable from the web).
3. Ask Matt for the alpha docs. `https://supabase.com/docs/guides/compute` returns **404**; no public Compute docs exist yet. I could not find `supabase compute` CLI reference anywhere public. Everything past the snippet above (flags, Dockerfile layout, skill name, MCP tool names) is UNVERIFIED.

Hackathon: the Compute prize exists per PROJECT.md. The hackathon page (https://hackathon.supabase.com/supabase-select-2026-hackathon) shows no prize or Compute details in what I could read.

Fallback if access does not arrive by ~12:00: put the long-running piece in a Vercel function or Edge Function (400 s wall clock on paid) and say in the demo what Compute would replace. Do not claim Compute use without running it.

## 5. Agent angle: fit and ideas

| Tool | Role in "something agents want" |
|---|---|
| App MCP server (3.1) | The product surface. An agent discovers tools, acts as a signed-in user, RLS keeps it in bounds |
| Auth OAuth 2.1 server (3.2) | Zero-friction agent onboarding: dynamic client registration, PKCE, per-client policies via `client_id` |
| Realtime | A human watches the agent live (Broadcast or Postgres Changes on an `agent_actions` table). Makes the demo visible |
| Postgres + RLS | Audit log, idempotency keys, per-agent budgets and quotas as rows |
| pgvector | Agent memory and retrieval, with RLS-scoped recall |
| Edge Functions | Typed, fast tool endpoints (256 MB, 2 s CPU, 150/400 s wall) |
| Queues (pgmq) | Async jobs and retries for agent work |
| Compute (alpha) | Long-running agent loops, sandboxed code execution, hosting MCP servers |
| Stripe Projects (6) | An agent can provision the whole stack from the CLI |

Ideas (hypotheses, not from sources):

1. **Agent-facing task marketplace.** Humans post tasks; agents connect via your OAuth MCP server, claim and complete tasks, and get paid per outcome via Stripe. RLS enforces per-agent visibility. Realtime board for humans.
2. **Per-agent workspace service.** An agent calls one tool and gets an isolated schema or database with a budget cap and an audit trail; a human dashboard shows every action live. (Turso is the same bet at scale.)
3. **Agent inbox and approvals.** Agents file typed requests (spend, deploy, send) into a table; a human approves from a Realtime UI; the agent resumes via a Queue message. Maps directly to "a human can watch what the agent did".
4. **Sandbox-as-a-tool.** If Compute access lands: an MCP tool that runs untrusted code in a Compute sandbox next to the data, returning typed results. Prize-eligible and genuinely novel.
5. **Outcome-priced data API for agents.** Your app's MCP server exposes a curated dataset; each call is metered per outcome with a spend cap. Stripe MPP charges the agent, Supabase logs each call.

Pick one. Keep to 3 to 4 sponsors in the core flow (PROJECT.md section 11).

## 6. Stripe Projects and Vercel

### Stripe Projects (verified, developer preview)

Supabase joined the Stripe Projects developer preview on **2026-03-19**. Supabase is listed as a provider (categories: Database, authentication, storage).

Commands per Stripe docs (current):

```bash
stripe plugin install projects
stripe projects init
stripe projects add supabase/project
stripe projects add vercel/project
stripe projects env --pull
```

Discrepancies with PROJECT.md section 4:
- The service name is **`supabase/project`**, not `supabase`. `stripe projects add supabase` may work as a shorthand; UNVERIFIED. If it fails, use `supabase/project`.
- Supabase's own page says `stripe projects env --sync`; Stripe's page says `env --pull`. Use `--pull` (Stripe docs are newer, and they list `--pull` as the sync command). If it errors, try `--sync`.
- A search snippet mentioned `stripe projects add supabase/supabase:free`. I did not find it on a page. UNVERIFIED.
- Check available tiers and pricing live: `stripe projects catalog supabase`.

What it provisions: a Supabase project with Postgres, Auth, Storage, Edge Functions, Realtime. Credentials go to local `.env`, encrypted in `.projects/vault/`, and are stored in Stripe's Secret Store. Commit `.projects/state.json` and `.projects/state.local.json`; never `.env` or `.projects/vault/`. No proxy: you keep full access.

Gotchas:
- Stripe account email is matched to the Supabase organization. There is no CLI option to pick a different existing org.
- A newly created org needs `stripe projects open supabase` to reach the dashboard (or the password-reset flow).
- First run opens a browser to confirm the link. For agent runs, do `stripe projects link supabase` and `stripe projects billing add` before the agent starts.
- Agent flags: `--json`, `--no-interactive`, `--auto-confirm`, `--accept-tos`.
- Spend caps: `stripe projects billing update --limit <amount> [--provider <provider>]`.
- `stripe projects env --pull` does **not** push env vars to Vercel. Add them in the Vercel dashboard yourself.
- Stripe CLI v1.43.3+ per the docs header (bootstrap text says 1.40.0+).
- Rotate DB creds: `stripe projects rotate supabase/project`.
- Agent skill: `npx skills add https://docs.stripe.com --skill stripe-projects -g -y`.

Fast path if the Supabase project already exists: skip Projects for Supabase, link it, or just create the project in the dashboard. Do not spend more than 10 minutes on this for the Stripe side quest.

### Vercel (verified from Supabase docs)

- Supabase project created through the Vercel Marketplace integration is synced to the connected Vercel project. Supabase doc: marketplace setup details are "coming soon"; the documented path is the **Next.js Supabase Starter Template**.
- Env vars created: `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`, `POSTGRES_USER`, `POSTGRES_HOST`, `POSTGRES_PASSWORD`, `POSTGRES_DATABASE`, `SUPABASE_SECRET_KEY`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, `SUPABASE_JWT_SECRET`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`.
- Gotchas: projects can only be created from the Vercel dashboard; billing goes through Vercel; no custom domains; cannot add owners manually in Supabase; roles sync from Vercel; branching and preview behavior is not documented there (UNVERIFIED).
- If we use an existing standalone Supabase project, set the `NEXT_PUBLIC_SUPABASE_*` and server keys by hand in Vercel. `@supabase/middleware` runs on Vercel Functions.

Not verified: any announced Select 2026 Vercel x Supabase feature. Vercel and Stripe were headline sponsors per select.supabase.com; no joint launch found.

## 7. Sources read

Primary (Supabase):
- https://select.supabase.com
- https://supabase.com/blog (index)
- https://supabase.com/changelog (index)
- https://supabase.com/blog/select-2026-build-anything
- https://supabase.com/blog/select-2026-operate-with-confidence
- https://supabase.com/blog/select-2026-scale-without-limits
- https://supabase.com/blog/supabase-select-2026-recap
- https://supabase.com/blog/supabase-is-acquiring-turso
- https://supabase.com/compute
- https://supabase.com/library/docs/headless/mcp
- https://supabase.com/blog/sign-in-with-chatgpt-beta
- https://supabase.com/blog/postgres-changes-filters-and-column-selection
- https://supabase.com/blog/introducing-supabase-evals
- https://supabase.com/blog/are-supabase-docs-agent-friendly
- https://supabase.com/blog/supabase-joins-the-stripe-projects-developer-preview
- https://supabase.com/changelog/supabase-middleware-1-0
- https://supabase.com/docs/guides/integrations/stripe-projects.md
- https://supabase.com/docs/guides/integrations/vercel-marketplace
- https://supabase.com/docs/guides/ai-tools/mcp
- https://supabase.com/docs/guides/ai-tools/plugins
- https://supabase.com/docs/guides/auth/oauth-server
- https://supabase.com/docs/guides/functions/limits
- https://supabase.com/docs/guides/realtime/limits
- https://supabase.com/docs/guides/queues
- https://supabase.com/docs/guides/ai/vector-columns
- https://supabase.com/docs/guides/local-development/cli/getting-started (no Docker-free instructions on it; those come from the blog)
- https://hackathon.supabase.com/supabase-select-2026-hackathon

Other:
- https://docs.stripe.com/stripe-projects
- https://www.prnewswire.com/news-releases/supabase-announces-150m-in-new-funding-and-turso-acquisition-302896752.html

Tried and failed: https://supabase.com/docs/guides/compute (404). Search-result titles only, not read: siliconangle Turso article, daily.dev recap, GitHub PR supabase/supabase#51160.

Not found anywhere: public Compute docs, pricing, regions or quotas; any hackathon-specific Supabase prize details. Note: the hackathon page states the theme "Build in a weekend, scale to millions" and dates Oct 3-4; PROJECT.md says "Build something agents want" and a 1-day format. The kickoff talk is the source of truth; I did not reconcile this.
