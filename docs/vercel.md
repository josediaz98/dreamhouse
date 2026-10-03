# Vercel for agent builders — DREAMHOUSE reference

> Researched 2026-10-03 from vercel.com/docs (pages stamped last_updated Aug–Sep 2026), ai-sdk.dev, eve.dev, Stripe docs, GitHub.
> Everything here was read from a primary source unless marked **UNVERIFIED**.
> Model IDs are copied verbatim from the docs. They differ between pages. Before coding, list the real catalog: `GET https://ai-gateway.vercel.sh/v1/models` or https://vercel.com/ai-gateway/models.

## 1. TL;DR

- Default stack: **AI SDK (`ai`) + AI Gateway** for model calls, **Vercel Functions (Fluid compute)** for the API, **MCP server via `mcp-handler`** so agents can discover us, **Supabase via Marketplace** for data.
- Add **Workflow** (`'use workflow'` / `'use step'`, `WorkflowAgent`) only if the agent must pause, retry or wait for a human. Add **Sandbox** only if the agent runs untrusted or generated code.
- **eve** (open-source agent framework, Beta) is the fastest path to a durable deployed agent: `npx eve@latest init my-agent`, `eve deploy`. It bundles Workflow + Sandbox + AI Gateway.
- Python backend is first class: FastAPI/Flask/Django on the Python runtime, AI SDK for Python (`uv add ai`, public beta), Python Workflow SDK.
- "Best Use of Vercel" signal: use 3+ distinct primitives in the core flow (Gateway + Workflow/Sandbox + MCP hosting), not just hosting.

## 2. Product map

| Product | What it does | Use in our build | Link |
|---|---|---|---|
| AI SDK (TypeScript) | `generateText`, `streamText`, tools, `ToolLoopAgent`, structured output. Model strings route via AI Gateway | Agent loop + tools | https://ai-sdk.dev/docs/agents/building-agents |
| AI SDK for Python (**public beta**) | `ai.stream`, `ai.Agent`, `@ai.tool`, Pydantic output. Python 3.12+. Routes via AI Gateway by default | Python agent logic | https://vercel.com/docs/ai-gateway/sdks-and-apis/ai-sdk-python |
| AI Gateway | One endpoint, many models/providers. Logs, budgets, fallbacks, BYOK. Zero markup. All plans | Every LLM call | https://vercel.com/docs/ai-gateway |
| Workflows (Workflow SDK) | Durable code: retries, sleep, hooks (wait for external event), resumes across deploys. TS + Python | Long-running / human-approval agents | https://vercel.com/docs/workflows |
| `WorkflowAgent` (`@ai-sdk/workflow`) | Durable agent: persisted state, retried tool calls | Durable agent on serverless | https://vercel.com/kb/guide/ai-gateway-and-ai-sdk |
| Sandbox | Firecracker microVMs for agent-generated code. JS SDK `@vercel/sandbox`, Python `vercel.sandbox`, CLI `sandbox` | Run code the agent writes | https://vercel.com/docs/sandbox |
| Fluid compute | Default execution model for Functions: in-function concurrency, bytecode caching, `waitUntil`. Default on for new projects | Free with Functions | https://vercel.com/docs/fluid-compute |
| Functions: Python | ASGI/WSGI (FastAPI, Flask, Django) as Functions. 3.12 (default), 3.13, 3.14 | Python backend | https://vercel.com/docs/functions/runtimes/python |
| Functions: Go (**Beta**) | `net/http` server (chi, gin ok), listens on `PORT` | Go backend | https://vercel.com/docs/functions/runtimes/go |
| Functions: Rust (**Beta**) | `vercel_runtime` crate, handlers in `api/` | Rust backend | https://vercel.com/docs/functions/runtimes/rust |
| Services (**Beta**) | Several frontends/backends (e.g. Next.js + FastAPI) in one project, one domain | "Wall-to-wall" polyglot app | https://vercel.com/docs/services |
| MCP hosting (`mcp-handler`) | MCP server as a Next.js route, Streamable HTTP, OAuth helpers | Agent-facing interface | https://vercel.com/docs/mcp/deploy-mcp-servers-to-vercel |
| Vercel Connect (GA) | Runtime credentials/OAuth for third-party services (Stripe, Slack, GitHub, Linear...) via OIDC. `@vercel/connect` | Agent calls Stripe etc. without stored secrets | https://vercel.com/connect/stripe |
| eve (**Beta**) | Open-source, filesystem-first durable agent framework. Runs locally or on Vercel | Fastest deployed agent | https://vercel.com/docs/eve |
| Marketplace / integrations | Native integrations billed via Vercel (incl. Supabase). CLI: `vercel integration add` | Supabase | https://vercel.com/docs/integrations |
| BotID | Invisible CAPTCHA. `checkBotId()`. Basic free on all plans; Deep Analysis Pro+ | Protect paid/LLM endpoints from humans-pretending-bots; note: it blocks legit agents too | https://vercel.com/docs/botid |
| Vercel Blob | Object storage, private/public, `@vercel/blob`. All plans | Agent artifacts/files | https://vercel.com/docs/vercel-blob |
| Vercel Agent (**Public Beta**, Pro/Ent) | Built-in assistant: PR code review, incident investigation, chat | Dev tooling only, not part of the product | https://vercel.com/docs/agent |
| Global Config (Edge Config) | Edge-read data store for flags/redirects | Only if needed | https://vercel.com/docs/global-config (listed in runtimes page; **page itself not read**) |
| v0 | Referenced in docs (v0 creates Blob stores / DBs) | **UNVERIFIED** — no v0 page read |  |
| Firewall / WAF | Rate limiting, bypass rules for BotID | Rate-limit LLM endpoints | https://vercel.com/docs/vercel-firewall (linked, **not read**) |

## 3. Quickstarts

### 3.1 Deploy from CLI

```bash
npm i -g vercel
vercel link            # connect folder to a project
vercel                 # preview deploy; stdout = deployment URL
vercel --prod          # production deploy (first deploy of a new project is always production)
vercel env pull        # writes .env.local (incl. VERCEL_OIDC_TOKEN for local dev)
vercel deploy --logs   # also print build logs
```

Source: https://vercel.com/docs/cli/deploy. `--yes` skips project setup questions. `vercel dev` runs all Services locally (`vercel dev -L` without Vercel auth).

### 3.2 AI Gateway call (model string)

```bash
export AI_GATEWAY_API_KEY="..."   # create at vercel.com dashboard > AI Gateway > API Keys
```

```ts
// pnpm add ai@latest   (Node 22.18+ for .mts)
import { generateText } from 'ai';
const { text } = await generateText({
  model: 'openai/gpt-6-astra',            // format: provider/model, ID copied from docs
  prompt: 'Explain AI Gateway in one sentence.',
});
```

```bash
curl https://ai-gateway.vercel.sh/v1/chat/completions \
  -H "Authorization: Bearer $AI_GATEWAY_API_KEY" -H "Content-Type: application/json" \
  -d '{"model":"openai/gpt-6-astra","messages":[{"role":"user","content":"hi"}]}'
```

Also OpenAI Chat Completions (`baseURL: https://ai-gateway.vercel.sh/v1`), Responses, and Anthropic Messages (`baseURL: https://ai-gateway.vercel.sh`) are compatible.

Model fallbacks (verbatim pattern):

```ts
providerOptions: { gateway: { models: ['anthropic/claude-opus-5', 'google/gemini-3.1-pro-preview'] } }
```

Route Claude Code itself through the Gateway: `npx vercel@latest ai-gateway setup`.

### 3.3 AI SDK agent with tools

```ts
import { ToolLoopAgent, tool, isStepCount } from 'ai';
import { z } from 'zod';

const agent = new ToolLoopAgent({
  model: 'anthropic/claude-sonnet-5.5',   // ID as shown on the building-agents page
  instructions: 'You are a helpful assistant.',
  stopWhen: isStepCount(20),
  tools: {
    getWeather: tool({
      description: 'Get the current weather for a location',
      inputSchema: z.object({ location: z.string() }),
      execute: async ({ location }) => ({ location, temperature: 72 }),
    }),
  },
});

const result = await agent.generate({ prompt: 'Weather in Tokyo?' });
console.log(result.text);
// streaming: const r = await agent.stream({ prompt }); for await (const c of r.textStream) ...
```

Python equivalent (AI SDK for Python, beta):

```bash
uv add ai          # or: uv add "ai[vercel]" for automatic OIDC auth on Vercel
```

```python
import asyncio, ai

@ai.tool
async def get_weather(city: str) -> str:
    """Get the current weather for a city."""
    return 'Sunny, 72F'

async def main() -> None:
    model = ai.get_model('anthropic/claude-sonnet-5')
    agent = ai.Agent(tools=[get_weather])
    async with agent.run(model, [ai.user_message("Weather in Tokyo?")]) as stream:
        async for event in stream:
            if isinstance(event, ai.events.TextDelta):
                print(event.chunk, end='', flush=True)

asyncio.run(main())
```

Run a one-off script: `uv run --with ai quickstart.py`.

### 3.4 Host an MCP server

Requires an existing Next.js App Router app and Node 20+.

```bash
pnpm i mcp-handler@2.1.1 @modelcontextprotocol/server@2 zod@4
```

```ts
// app/api/mcp/route.ts
import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';

const handler = createMcpHandler((server) => {
  server.registerTool(
    'roll_dice',
    { description: 'Roll an N-sided die', inputSchema: z.object({ sides: z.number().int().min(2) }) },
    async ({ sides }) => ({ content: [{ type: 'text', text: `You rolled a ${1 + Math.floor(Math.random() * sides)}` }] }),
  );
});
export { handler as GET, handler as POST };
```

- Clients connect to `https://<app>.vercel.app/api/mcp` over Streamable HTTP. Cursor config: `{"mcpServers":{"name":{"url":"https://<app>.vercel.app/api/mcp"}}}`.
- Test locally: `npx @modelcontextprotocol/inspector@latest`, URL `http://localhost:3000/api/mcp`.
- Auth: `withMcpAuth(handler, verifyToken, { required: true, requiredScopes: [...], resourceMetadataPath: '/.well-known/oauth-protected-resource' })` + `protectedResourceHandler` route. `mcp-handler` does not issue tokens. No token = `401`; missing scope = `403`.
- Deployment Protection on preview URLs blocks MCP clients unless automation bypass is configured.
- Consume an MCP server from our own agent: `pnpm i ai @ai-sdk/mcp`, `createMCPClient({ transport: { type: 'http', url } })`, `await client.tools()`.

### 3.5 Durable workflow / durable agent

```bash
npm i workflow      # Workflow SDK; guide: https://workflow-sdk.dev/docs/getting-started
```

```ts
export async function aiContentWorkflow(topic: string) {
  'use workflow';
  const draft = await generateDraft(topic);   // each step fn has 'use step'
  return { draft };
}
// start a run:  import { start } from 'workflow/api';  await start(myWorkflow, [input]);
```

Durable agent (from vercel.com/kb/guide/ai-gateway-and-ai-sdk):

```ts
import { WorkflowAgent, type ModelCallStreamPart } from '@ai-sdk/workflow';
import { convertToModelMessages, tool, type UIMessage } from 'ai';
import { getWritable } from 'workflow';

async function searchFlightsStep(input: { origin: string }) { 'use step'; /* fetch... */ }

export async function chat(messages: UIMessage[]) {
  'use workflow';
  const agent = new WorkflowAgent({
    model: 'openai/gpt-6-astra',
    instructions: 'You are a flight booking assistant.',
    tools: { searchFlights: tool({ description: '...', inputSchema: /* zod */, execute: searchFlightsStep }) },
  });
  const result = await agent.stream({
    messages: await convertToModelMessages(messages),
    writable: getWritable<ModelCallStreamPart>(),
  });
  return { messages: result.messages };
}
```

Python Workflows (`pyproject.toml`: `dependencies = ["vercel-workflow"]`, `[[tool.vercel.workflows]] entrypoint = "app.workflows:wf"`):

```python
from vercel import workflow
wf = workflow.Workflows()

@wf.workflow
async def my_workflow(*, topic: str): ...
@wf.step
async def my_step(*, input: str): ...

run = await workflow.start(my_workflow, topic="x")   # run.run_id, run.status(), run.return_value()
```

Multi-region needs `workflow` >= `5.0.0-beta.33`. Inspect runs: dashboard > project > Observability > Workflows.

### 3.6 Python function (FastAPI)

```python
# app.py  (entrypoint names: app.py, index.py, server.py, main.py, wsgi.py, asgi.py; also in src/ or app/)
from fastapi import FastAPI
app = FastAPI()

@app.get("/")
def home():
    return {"message": "Hello from Python on Vercel"}
```

```toml
# pyproject.toml
[project]
name = "my-python-api"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = ["fastapi>=0.117.1"]
# optional: [tool.vercel] entrypoint = "my_package.api:app"
```

Then `vercel`. Streaming is on by default for Python Functions.

### 3.7 Sandbox

```bash
vercel link && vercel env pull      # OIDC token in .env.local; project need not have code
npm install @vercel/sandbox dotenv tsx typescript     # Python: uv add vercel python-dotenv
```

```ts
import { config } from 'dotenv'; config({ path: '.env.local' });
import { Sandbox } from '@vercel/sandbox';
const sandbox = await Sandbox.create();
const r = await sandbox.runCommand('echo', ['Hello from Vercel Sandbox!']);
console.log(await r.stdout());
await sandbox.stop();
```

Options seen in docs: `Sandbox.create({ resources: { vcpus: 2 }, timeout: 120_000, persistent: false })`, `sandbox.writeFiles([{ path, content }])`, `sandbox.runCommand({ cmd, args })`. CLI smoke test: `sandbox run echo "Hello Sandbox!"`.

### 3.8 eve (agent framework)

```bash
npx eve@latest init my-agent          # Node 24+. --model <id> --reasoning high are init flags
cd my-agent && npm run dev            # terminal UI
eve link && eve deploy                # deploy to Vercel
curl https://<agent>.vercel.app/eve/v1/health
```

```ts
// agent/agent.ts
import { defineAgent } from 'eve';
export default defineAgent({ model: 'openai/gpt-6-astra' });
// agent/tools/get_weather.ts  (filename = tool name)
import { defineTool } from 'eve/tools'; import { z } from 'zod';
export default defineTool({ description: '...', inputSchema: z.object({ city: z.string() }), async execute({ city }) { return { city }; } });
```

Plus `agent/instructions.md` (system prompt). Session API: `POST /eve/v1/session` with `{"message": "..."}`, stream at `/eve/v1/session/<id>/stream`. Channels: Slack, Discord, Teams, GitHub, Linear (`eve add channel/<name>`). Connections: `defineMcpClientConnection({ url, description, auth })` and `defineOpenAPIConnection`.

## 4. Credits and access

| Item | Status |
|---|---|
| Hackathon Notion page (credits + Pro) | **FAILED to load.** WebFetch returned only the word "Notion" (client-rendered). Open it manually: https://app.notion.com/p/vercel/Supabase-Select-Hackathon-Hacker-Resources-3eee06b059c481c18fe3e32a1f41a3ef |
| How hackers claim hackathon credits / Pro | **UNVERIFIED.** Not in public docs. Follow the Notion page. |
| AI Gateway free tier (public docs) | Every team has it. "To use free AI Gateway Credits, add a valid payment method to your team." Free credits start at first Gateway request. Subset of models only (https://vercel.com/ai-gateway/models?freeTier=true). Lower per-model rate limits; `429` on excess. |
| Paid tier | Buying Gateway Credits moves team to paid tier. Gateway adds no rate limits (provider limits still apply). Once you buy, the monthly free credit no longer applies. Hackathon credits probably land as Gateway Credits or Pro credit: **UNVERIFIED**, check balance in dashboard > AI Gateway (top right). |
| Pro plan (public) | $20/month platform fee, includes 1 deploying seat and $20 monthly usage credit (expires monthly). Extra seats $20/month. |

Env vars (names only):

| Name | Used by | Notes |
|---|---|---|
| `AI_GATEWAY_API_KEY` | AI Gateway from anywhere | Team-scoped key. Shown once at creation. |
| `VERCEL_OIDC_TOKEN` | Gateway, Sandbox, Blob, Connect on Vercel / local | Created by `vercel link` + `vercel env pull` into `.env.local`. Auto on deployed Vercel. Local token is short-lived: re-pull when expired. |
| `MCP_SERVER_URL`, `MCP_SERVER_TOKEN` | Our MCP client (names from docs example) | Ours to define. |
| `MCP_DEMO_TOKEN` | Docs MCP auth example | Replace with real verification. |
| `BLOB_STORE_ID`, `BLOB_WEBHOOK_PUBLIC_KEY`, `BLOB_READ_WRITE_TOKEN` | Blob | RW token only for off-Vercel use or client uploads. |
| `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`, `SUPABASE_SECRET_KEY`, `SUPABASE_PUBLISHABLE_KEY` (+ `NEXT_PUBLIC_` variants) | Supabase Marketplace integration | 13 vars total; these are the ones the page names. |
| `LINK_ACCESS_TOKEN` | Stripe Link Agent Wallet CLI/SDK | OAuth token for one customer, not a Stripe key. |
| `VERCEL_SUPPORT_LARGE_FUNCTIONS` | Large functions (Beta) | Set `1` to opt in on existing projects. |

Never commit `.env*`. Stripe Projects adds them to `.gitignore` on `init`.

## 5. Reference repos

| Repo | Shows | Verified? |
|---|---|---|
| https://github.com/vercel-labs/notebook-factory | "Notebook publishing workspace with Jupyter editing in Vercel Sandbox and an AI assistant." Live at https://notebooks.playground-vercel.tools. Docs (deploy guide, local dev) live in its `lat.md/` directory | Repo and description read. **UNVERIFIED** that this is the repo behind the speaker's "notebooks.sh" demo (notebooks.sh itself returned only the title "Python Notebooks"). Ask the speaker/staff or check the Notion page |
| https://github.com/1st1/lat.md (also seen mirrored as vercel-labs/lat.md in a search result) | `lat.md/` dir of interlinked markdown with `[[wiki links]]`, source backlinks `// @lat: [[section-id]]`. `npm install -g lat.md`; CLI: `lat init`, `lat check`, `lat search "q"`, `lat section "file#heading"`, `lat locate "term"`, `lat mcp`. Semantic search can use an OpenAI or AI Gateway key | Yes (README) |
| https://github.com/vercel/sandbox | Sandbox SDK + CLI source | Yes |
| https://github.com/vercel/mcp-handler | MCP hosting library | Linked from docs, README **not read** |
| https://github.com/vercel-labs/ai-python/tree/main/examples | AI SDK for Python examples (single-file to end-to-end) | Linked from docs, **not read** |
| https://github.com/stripe/link-cli | Link Agent Wallet CLI/SDK (TS + Go) | Linked from Stripe docs, **not read** |
| https://github.com/stripe/projects-template-registry | Templates for `stripe projects build` | Linked from Stripe docs, **not read** |
| https://github.com/vercel/examples/tree/main/rust | Rust examples | Linked from docs, **not read** |
| https://eve.dev/docs | eve docs; templates for Slack agent and others | Partially read |

## 6. Agent-angle: project ideas and "Best Use of Vercel"

Fit with the keynote thesis (sell the outcome, agents are the user). Each idea hosts the agent-facing surface on Vercel and uses Supabase for the audit trail.

| # | Idea | Vercel primitives | Why agents want it |
|---|---|---|---|
| 1 | **Outcome-priced MCP service** (a task agents can't do alone: e.g. "verify this claim against 5 sources and return a typed verdict") | `mcp-handler` on Functions + AI Gateway (model fallbacks, per-key budget) + Workflow for slow jobs + Supabase audit log + Stripe MPP | Typed output, zero signup, pay per outcome. Auditable in a Supabase table |
| 2 | **Code-execution API for agents**: agent POSTs code or a notebook cell, gets result + artifacts | Sandbox (snapshots, non-persistent) + Functions + Blob for outputs + BotID off (we want agents) | Safe execution without owning infra. Echoes notebooks demo |
| 3 | **Human-in-the-loop agent errand runner**: agent hands a long task, a human approves a step, run resumes days later | Workflow (hooks, sleep, `WorkflowAgent`) + Vercel Connect (Slack/Stripe) + Supabase realtime board | Durable pause/resume is the thing agents can't do on plain serverless |
| 4 | **Agent wallet concierge**: agent requests a purchase, user approves, agent pays | eve agent (Slack channel) + Vercel Connect + Stripe Link Agent Wallet (`@stripe/link-cli`, US/CA consumers only) | Spending guardrails + approval. Feeds Best Use of Stripe too |
| 5 | **Polyglot "wall-to-wall" backend**: Next.js UI + FastAPI agent + Go/Rust hot path in one project | Services (Beta) + Python AI SDK + Workflow Python + Gateway | Direct echo of the talk. Heavy for 1 day; only if the team knows the stack |

How to hit "Best Use of Vercel" (judging criteria not published; this is our inference):

- Use at least 3 of: AI Gateway, Workflow, Sandbox, MCP hosting, Connect, eve/Services. Name each once in the demo video (PROJECT.md §7).
- Show the Vercel dashboard once: Gateway logs (model, provider attempts, cost) and Observability > Workflows trace. These are visual proof of "real use".
- Deploy early (Demo URL is required) and keep every deploy on Vercel. Use `vercel --prod`, not a local-only demo.
- Put the Gateway key under a budget (Gateway budgets per project or key) so a runaway agent loop does not burn credits.

## 7. Integration notes

**Supabase on Vercel**

- Marketplace native integration: Supabase projects as Vercel Storage resources, env vars auto-synced, redirect URLs auto-created for Preview branches, billing via Vercel.
- Install: `vc i supabase` (as stated on the Marketplace page; also general `vercel integration add <name>`, https://vercel.com/docs/cli/integration, **not read**).
- Alternative: Stripe Projects provisions both: `stripe projects add supabase/project` and `stripe projects add vercel/project`.
- If Supabase is created outside the integration, set the keys manually in Vercel project env. Note: `stripe projects env --pull` writes local `.env` only; it does not set production env on Vercel (Stripe docs say so explicitly).

**Stripe**

```bash
npm install -g @stripe/cli          # Stripe CLI v1.43.3+ (docs)
stripe plugin install projects
stripe projects init
stripe projects add vercel/project   # docs use <provider>/<service> form; PROJECT.md shows `stripe projects add vercel`
stripe projects env --pull
stripe projects billing add          # payment method; avoids browser pop-ups for agents
stripe projects catalog              # live provider list
```

- Stripe Projects lists Vercel (category Hosting) among 60+ providers, plus Supabase, Browserbase, E2B, Daytona etc.
- Link Agent Wallet: `npm install -g @stripe/link-cli` (agent shells out) or `npm install @stripe/link-sdk` (hosted service). Auth is an OAuth token per customer (`LINK_ACCESS_TOKEN`) against `api.link.com`, not a Stripe API key. Agent creates a spend request, the customer approves, Link returns a one-time-use credential. Availability: agent payments for US and Canadian consumers only; financial insights US only.
- Vercel Connect + Stripe (documented): `npm install @vercel/connect`, `vercel link`, `vercel connect create stripe --name acme-stripe`, `vercel env pull`, then `getToken('stripe/acme-stripe', { subject: { type: 'user', id } })`.
- **eve + Stripe Link wallet in "~2 lines": UNVERIFIED.** eve docs (docs/eve, eve.dev/docs/connections, Connect-for-eve page) show no Stripe or Link wallet integration. A web search showed Stripe/Vercel partnership pages only. Likely path: eve `defineMcpClientConnection`/Connect + the Link CLI/SDK. Ask the speaker for the exact snippet.

## 8. Gotchas and limits (verified)

| Area | Limit / behavior | Source |
|---|---|---|
| Function duration (Fluid) | Hobby: 300s default and max. Pro/Ent: 300s default, 800s max, 1800s extended max (Beta, set per function, only some runtime versions) | functions/limitations |
| Over duration | `504 FUNCTION_INVOCATION_TIMEOUT` | functions/limitations |
| Unlimited runtime | Use Workflows (no max run duration, no max sleep) | functions/limitations, workflows/pricing |
| Request/response body | **4.5 MB**, else `413 FUNCTION_PAYLOAD_TOO_LARGE`. Use Blob client uploads for bigger | functions/limitations |
| Memory | Hobby 2 GB/1 vCPU. Pro 2 GB default, 4 GB/2 vCPU max | functions/limitations |
| Bundle size | 250 MB uncompressed; Python 500 MB; large functions Beta up to 5 GB (needs Fluid + Active CPU) | functions/limitations |
| Concurrency | Auto-scales to 30,000 (Hobby, Pro) | functions/limitations |
| Default region | `iad1` single region. Pro up to 3 regions | runtimes, fluid-compute |
| Filesystem | Read-only; writable `/tmp` up to 500 MB | runtimes |
| File descriptors | 1,024 shared across concurrent executions | functions/limitations |
| Env vars | 64 KB total per deployment | runtimes |
| Hobby function count | 12 functions per deployment for non-framework `api/` style | runtimes |
| Cold starts | Fluid: bytecode caching (Node 20+, **production only**, first request not cached) + pre-warming on production. Archived functions (no invocation: 2 weeks prod, 48 h preview) cold start at least 1 s slower | fluid-compute, runtimes |
| Python | No tree-shaking; everything reachable at build time is bundled. Use `excludeFiles` in `vercel.json` | runtimes/python |
| Go / Rust / Services | All **Beta** | respective pages |
| Active CPU billing | Waiting on I/O (LLM calls) is not billed as CPU; memory is | limitations, sandbox |
| Sandbox | Default timeout 5 min; persistent by default (snapshots cost storage; pass `persistent: false`). Max 8 vCPU (Hobby/Pro), 2 GB RAM/vCPU. Duration max: 45 min Hobby, 24 h Pro/Ent (from GitHub README, not the docs page). Python SDK needs `vercel` package | sandbox/quickstart, github.com/vercel/sandbox |
| Workflow | Hobby free: 50,000 events/mo, 1 GB written. Pro on demand: $0.02 per 1K events, $0.50/GB written, $0.50/GB-month retained. 10,000 steps and 25,000 events per run. 50 MB max payload. Replay attempt max 240 s. Run data retained 1 day (Hobby), 7 days (Pro) | workflows/pricing |
| Gateway free tier | Subset of models, lower per-model limits, `429 rate_limit_exceeded`. Honor `retry-after`. AI SDK retries 2x by default | ai-gateway/rate-limits |
| Gateway budgets | Over-budget requests get `402 quota_for_entity_exceeded`. Budgets cover system-credential spend only (not BYOK). Soft cap, can overshoot | ai-gateway, rate-limits |
| Gateway log delay | Up to 90 s before a request shows in logs | ai-gateway/getting-started |
| BotID | Blocks `curl`/direct hits in production. Local dev always `isBot:false`. Deep Analysis $1 per 1000 `checkBotId()` calls (Pro). **Do not put BotID on the endpoint agents call** | botid |
| MCP on Vercel | Deployment Protection blocks preview MCP clients without bypass. `mcp-handler` v2 dropped HTTP+SSE and Redis config | mcp docs |
| Model IDs | Docs pages use different IDs (`openai/gpt-6-astra`, `anthropic/claude-fable-5.1`, `anthropic/claude-sonnet-5`, `anthropic/claude-sonnet-5.5`, `anthropic/claude-opus-5`, `google/gemini-3.8-flash`). Validate against `GET /v1/models` before use | multiple |
| eve | Beta, Node 24+, "APIs may change before GA" | docs/eve |

## 9. Sources (fetched)

- https://vercel.com/docs/ai-gateway
- https://vercel.com/docs/ai-gateway/getting-started
- https://vercel.com/docs/ai-gateway/pricing
- https://vercel.com/docs/ai-gateway/rate-limits
- https://vercel.com/docs/ai-gateway/models-and-providers/model-fallbacks
- https://vercel.com/docs/ai-gateway/sdks-and-apis/ai-sdk-python
- https://vercel.com/kb/guide/ai-gateway-and-ai-sdk
- https://ai-sdk.dev/docs/introduction (thin; no code)
- https://ai-sdk.dev/docs/agents/building-agents
- https://vercel.com/docs/workflows
- https://vercel.com/docs/workflows/pricing
- https://workflow-sdk.dev/docs/getting-started/python
- https://vercel.com/docs/sandbox
- https://vercel.com/docs/sandbox/quickstart
- https://github.com/vercel/sandbox
- https://vercel.com/docs/functions/runtimes
- https://vercel.com/docs/functions/runtimes/python
- https://vercel.com/docs/functions/runtimes/go
- https://vercel.com/docs/functions/runtimes/rust
- https://vercel.com/docs/functions/limitations
- https://vercel.com/docs/fluid-compute
- https://vercel.com/docs/services
- https://vercel.com/docs/cli/deploy
- https://vercel.com/docs/mcp/deploy-mcp-servers-to-vercel
- https://vercel.com/docs/mcp/integrations/ai-sdk
- https://vercel.com/docs/eve
- https://eve.dev/docs
- https://eve.dev/docs/connections
- https://eve.dev/docs/guides/deployment/vercel
- https://vercel.com/docs/connect/frameworks/eve
- https://vercel.com/connect/stripe
- https://vercel.com/docs/botid
- https://vercel.com/docs/botid/get-started
- https://vercel.com/docs/vercel-blob
- https://vercel.com/docs/agent
- https://vercel.com/docs/integrations
- https://vercel.com/marketplace/supabase
- https://vercel.com/docs/plans/pro-plan
- https://docs.stripe.com/projects
- https://docs.stripe.com/agentic-commerce/agents/link-agent-wallet
- https://github.com/vercel-labs/notebook-factory (page + raw README)
- https://github.com/1st1/lat.md
- Web searches: notebooks.sh / notebook-factory; lat.md; Stripe Link + Vercel eve (results only; no eve-Stripe snippet found)

Failed or empty: https://app.notion.com/p/vercel/Supabase-Select-Hackathon-Hacker-Resources-3eee06b059c481c18fe3e32a1f41a3ef (returned only "Notion"); https://notebooks.sh (returned only the title "Python Notebooks").
