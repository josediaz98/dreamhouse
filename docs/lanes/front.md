# Lane: Front

Branch `lane/front`, worktree `/Users/josediaz/dreamhouse-front`. Read `docs/lanes/README.md` first.

## Goal

The page judges open and the screens the video records: landing + live widget, tool-call trace panel, before/after, seller console, receipt panel. Follow `docs/demo-plan.md` §3.

## Start immediately, on fixtures

`src/lib/fixtures.ts` has 3 placeholder lots, their spec fields, buildability results, and 2 open questions. Build against them behind one client module:

- `src/lib/client/api.ts` — a typed function per route in `API_ROUTES` (`contract.ts`). When `NEXT_PUBLIC_USE_FIXTURES=1`, return fixtures with a realistic 300–900 ms delay; otherwise call the real route. Switching to the real Back must be a one-line env change.
- Realtime: `src/lib/client/realtime.ts` subscribes to `postgres_changes` on `spec_fields` and `questions` (see the contract note). With fixtures, simulate an answer event with a timer.

## Brand dependency

The Brand lane commits `src/styles/tokens.css` within ~20 min. Until then use neutral placeholders, then switch. Never hard-code colours or fonts: use the tokens.

## Steps

1. **Shell + hero (30 min).** `src/app/(site)/page.tsx`. Headline: "Can I build on this lot? Your agent can finally answer." Subhead: "Agent-readable property specs for coastal land. MCP server + pay-per-call API." One CTA beside a copy-ready install line (`claude mcp add --transport http <name> https://<host>/mcp`; check the syntax against current Claude Code docs before shipping).
2. **Live widget (45 min).** Input plus 3 preset lot chips (never fails live). Shows the JSON verdict per rule (pass / fail / unknown) with source links, and p50 latency and cost per call under it.
3. **Trace panel (45 min).** Renders `TraceEvent`s: status dot, tool name, ms. Last line: "N unknowns → seller questions drafted". Animate the unknown becoming a question.
4. **Before/after (20 min).** Left "Agent without spec" (guesses from listing text, invents setbacks) vs right "With spec" (conditional, N open questions, each sourced). Three bullets against one sentence.
5. **Seller console (45 min).** `/seller`: list of open questions, answer box, submit. On answer, the buyer view re-ranks over Realtime. This is the demo moment; make the change visible (row highlight, verdict flips).
6. **Receipt panel + counters (30 min).** `GET /api/calls` list; counters strip (lots indexed, rules encoded, facts sourced %, visits avoided = `eliminatedCount`). Fixture-driven numbers carry a "demo data" label.
7. **Responsive + polish (rest).** Phone width, empty and error states, keyboard focus, a fresh-browser pass.

## Definition of done

- `pnpm exec tsc --noEmit` and `pnpm build` pass; page renders in a browser at 1440 px and 390 px (check with a real browser run, not only the build).
- Flow works on fixtures; with `NEXT_PUBLIC_USE_FIXTURES=0` it works against the Back once that lane has pushed.
- No horizontal scroll at 390 px. No default Next.js template content left.

## Do not

- Edit `contract.ts`, `fixtures.ts`, or anything under `src/styles/`.
- Add logo walls, "trusted by", invented numbers, purple gradients, or decorative blobs.
- Show fixture data in the final recording. The coordinator swaps in real rows.
