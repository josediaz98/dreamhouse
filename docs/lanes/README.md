# Parallel lanes — protocol

Four actors, one repo. Deadline **5:30 PM**; **feature freeze 3:30 PM**; submit by **5:15 PM**.

| Lane | Branch | Worktree | Brief |
|---|---|---|---|
| Coordinator | `dev` | `/Users/josediaz/dreamhouse` | Owns `PROJECT.md`, `src/lib/contract.ts`, `src/lib/fixtures.ts`, submission form |
| Back + setup | `lane/back` | `/Users/josediaz/dreamhouse-back` | `back.md` |
| Front | `lane/front` | `/Users/josediaz/dreamhouse-front` | `front.md` |
| Brand + demo | `lane/brand` | `/Users/josediaz/dreamhouse-brand` | `brand.md` |

## Read first (every lane)

1. `/Users/josediaz/dreamhouse/PROJECT.md` — §0 (what we build), §8 (architecture and tables), §14 (data sources).
2. `src/lib/contract.ts` — the shared types. **Do not edit it.** If a type is wrong or missing, write the request to the coordinator in your session summary.
3. `docs/demo-plan.md` — what the demo must show.
4. `AGENTS.md` in the repo root: this is a new Next.js version. Read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code.

## File ownership (never edit another lane's files)

| Path | Owner |
|---|---|
| `src/lib/contract.ts`, `src/lib/fixtures.ts`, `PROJECT.md`, `docs/lanes/*` | Coordinator |
| `supabase/`, `src/lib/server/**`, `src/app/api/**`, `scripts/**` | Back |
| `src/app/(site)/**`, `src/components/**`, `src/lib/client/**`, `src/app/layout.tsx` | Front |
| `src/styles/**`, `src/app/globals.css`, `public/brand/**`, `docs/brand.md`, `docs/video/**` | Brand |
| `package.json`, `pnpm-lock.yaml` | Shared. Add dependencies freely; after a rebase conflict run `pnpm install` and commit the lockfile |

## Setup in a fresh worktree

```bash
pnpm install
cp -R /Users/josediaz/dreamhouse/.vercel .      # project link, not a secret
vercel env pull .env.local                       # writes env vars; never print or commit it
```

Secrets rule: never read, print, or commit `.env*`. Env var **names** only in docs and code.

## Integrate every ~45 minutes (and at every milestone)

```bash
git fetch origin
git rebase origin/dev
pnpm install && pnpm exec tsc --noEmit && pnpm build   # must pass
git push origin HEAD:dev                                # fast-forward only; never force-push
```

If the rebase conflicts outside shared files, you edited another lane's files. Undo that edit.

## Rules for all lanes

- TypeScript strict. No `any`; use `unknown` and narrowing. Literal unions over enums. `interface` for object shapes. `readonly` where data is not mutated.
- Verdicts are deterministic. The LLM extracts and explains; it never decides pass or fail.
- Every number shown in the UI comes from the database or the fixtures and is labelled "demo data" when it is a fixture. No invented metrics, logos, or testimonials.
- Commit small and often. Commit messages end with: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Do not edit on `main`. A hook blocks it.
- Done means verified: typecheck, build, and the feature exercised in a running app.

## End of lane report

Finish with: what works (verified how), what is mocked, what is missing, any contract change requested. Under 15 lines.
