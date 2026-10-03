/** Upsert the cited Sea Ranch rules. pnpm exec tsx --env-file=.env.local scripts/seed-rules.ts */
import { supabaseRepo } from "../src/lib/server/repo-supabase";
import { SEA_RANCH_RULES } from "../src/lib/server/rules";

supabaseRepo()
  .upsertRules(SEA_RANCH_RULES)
  .then(() => console.log(`seeded ${SEA_RANCH_RULES.length} rules`))
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  });
