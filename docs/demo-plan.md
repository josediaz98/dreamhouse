# Demo plan — DREAMHOUSE

Sources: two research passes on 2025–2026 AI hackathon winners and on agent-tool startups' landing pages (Firecrawl, Composio, Exa, Context7, Mintlify, Vercel AI Gateway, Stripe MPP, Supabase). Caveats: the winner pages are mostly third-party recaps, no winner video was watched, and WebFetch returned text summaries, so visual-style notes are partly UNVERIFIED. No winner write-ups were found for AGI House, YC, Stripe, Supabase or Vercel events.

## TL;DR

- Judges mostly see the video and the opening screen. Both must show the value in the first 10–20 s.
- Open on **one real number from our own data**, then show **one flow** working end to end on a **live URL**.
- Make the agent visible: tool-call trace, unknowns becoming seller questions, pay-per-call receipt.
- Use a before/after: the same lot answered by a generic LLM guess vs by our sourced spec.
- Never show made-up numbers or logo walls. Label demo data as demo data.

## 1. What winners did (verified from recaps)

| Pattern | Evidence |
|---|---|
| Opens with a stat that hurts | CrossBeam (1st, Anthropic x Cerebral Valley, Feb 2026): "90%+ first-submission rejection, ~6 months, $30k" |
| One quantified claim on screen | "Weeks → five hours" (TARA); "forecast within 0.4%" (Sim Francisco); "claims in under two minutes" (TAXLY) |
| Every output traces to a source | Tekton: every 3D component traced to a historical source |
| One flow, working within ~90 s | Judge advice (JetBrains judging notes) |
| Before/after contrast | Same judge notes: "show what used to be frustrating, show the new version" |
| Live URL judges can open | Lablab guide: a demo judges cannot access scores as if it does not work |

Mistakes to avoid: scope creep, editors and terminals on screen, "it's not working right now", slides before the product, a generic chat UI.

## 2. What agent-tool startups do (from their landing pages)

| Company | Pattern to copy |
|---|---|
| Firecrawl | Hero "Give your AI agents web data…", code tabs next to live JSON output, proof bar (P95 latency, reliability) |
| Composio | Task trace that goes "resolving intent…" → "Resolved", 5-line setup snippet |
| Exa | Proof as latency numbers vs competitors, "API Playground" CTA |
| Context7 | One prompt + before/after as 3 "without" bullets vs 1 "with" sentence |
| Mintlify | Live-looking counters |
| Vercel AI Gateway | Real code block plus one setup command |

## 3. Landing / demo page (above the fold first)

Build in this order. Stop when time runs out; the top items carry the score.

1. **Hero:** "Can I build on this lot? Your agent can finally answer." Sub: "Agent-readable property specs for coastal land. MCP server + pay-per-call API." One CTA next to a copy-ready install line.
2. **Live widget:** one input (APN or address) with 3 preset Sea Ranch lot chips so it never fails live. Output: JSON verdict per rule (pass / fail / unknown) with source links. Under it, real p50 latency and cost per call.
3. **Tool-call trace panel** (mono type, status dot, ms per line): `resolve_parcel` → `check_buildability` → `get_spec`. Last line: "N unknowns → seller questions drafted". Animate the unknown becoming a question. This is the unique beat.
4. **Before/after:** left "Agent without spec" (guesses from listing text, invents setbacks); right "With spec" (conditional, N open questions, each sourced). Three bullets vs one sentence.
5. **Counters** from the real demo dataset: lots indexed, rules encoded, facts sourced %, unknowns turned into questions. Label "demo data".
6. **Install snippet** with tabs: Claude Code / cURL. Syntax to verify before shipping: `claude mcp add --transport http <name> https://<host>/mcp`.
7. **Pricing line:** "Pay per call with Stripe MPP (HTTP 402). Sandbox mode."

Style: dark, one accent colour, mono font for traces and JSON, restrained grid. No purple gradients, no blobs, no logo wall, no "trusted by".

## 4. Video script (target 2:30; check the rules page for a maximum length)

| Time | Beat | On screen |
|---|---|---|
| 0:00–0:15 | Hook with a number from our data, e.g. "N of M listed lots can't hold a [X sq ft, Y ft] house, and no listing says so" | Listing page next to the rule PDF |
| 0:15–0:35 | One-sentence solution | Hero of the live URL |
| 0:35–1:45 | **Live flow:** buyer prompt → agent searches → `check_buildability` kills lots → counter "visits avoided" moves | Tool-call trace + results |
| 1:45–2:10 | **Unknown → seller question → answer → live re-rank** (Realtime) | Seller console beside the agent |
| 2:10–2:25 | Pay-per-call receipt (MPP sandbox) and sponsors used, one mention each | Receipt, stack strip |
| 2:25–2:30 | Vision, one line: lot facts first, then design, financing, builders | Closing frame |

Before/after goes at 1:20, one cut. Record the live flow twice; keep the better take. The final file must be MP4 under 100 MB.

## 5. Images for the form (up to 10, PNG/JPEG/WebP, 5 MB each)

1. Hero + live widget
2. Tool-call trace with an unknown highlighted
3. Before/after
4. Seller console with an open question
5. Verdict JSON with sources
6. Architecture diagram (from PROJECT.md §8)
7. MPP receipt / pay-per-call log
8. Counters strip (demo data)

## 6. Pre-flight

- [ ] 3 preset lots that are fully ingested and return in under 2 s
- [ ] Mock or cache slow calls (LLM extraction, GIS) for the recording
- [ ] Test account and instructions in Demo Notes
- [ ] Every number on screen comes from the database or is labelled "demo data"
- [ ] The "1–2 year approval" figure comes from a press article. Do not state it as fact; say "per press" or leave it out
- [ ] Repo flipped to public, demo URL opens in a private window
