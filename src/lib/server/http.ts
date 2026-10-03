import { ZodError } from "zod";
import { ConflictError, NotFoundError, type Repo } from "@/lib/server/repo";
import { FIXTURE_FIELDS, FIXTURE_PROPERTIES, FIXTURE_QUESTIONS } from "@/lib/fixtures";
import { memoryRepo } from "@/lib/server/repo-memory";
import { ConfigError, supabaseRepo } from "@/lib/server/repo-supabase";
import { SEA_RANCH_RULES } from "@/lib/server/rules";

let repo: Repo | null = null;
/**
 * Supabase in every deployed environment. `DREAMHOUSE_REPO=memory` (never in production) serves the
 * coordinator's fixtures from memory so the HTTP plumbing can be exercised without a database.
 */
export function getRepo(): Repo {
  if (process.env.DREAMHOUSE_REPO === "memory" && process.env.NODE_ENV !== "production") {
    repo ??= memoryRepo({
      properties: [...FIXTURE_PROPERTIES],
      fields: [...FIXTURE_FIELDS],
      questions: [...FIXTURE_QUESTIONS],
      rules: [...SEA_RANCH_RULES],
    });
    return repo;
  }
  repo ??= supabaseRepo();
  return repo;
}

export function agentId(req: Request): string {
  const explicit = req.headers.get("x-agent-id")?.trim();
  if (explicit) return explicit.slice(0, 80);
  const ua = req.headers.get("user-agent")?.trim();
  return ua ? ua.slice(0, 80) : "anonymous";
}

export function errorResponse(e: unknown): Response {
  if (e instanceof ZodError) return Response.json({ error: "invalid_input", issues: e.issues }, { status: 400 });
  if (e instanceof NotFoundError) return Response.json({ error: "not_found", detail: e.message }, { status: 404 });
  if (e instanceof ConflictError) return Response.json({ error: "conflict", detail: e.message }, { status: 409 });
  if (e instanceof ConfigError) return Response.json({ error: "not_configured", detail: e.message }, { status: 503 });
  console.error(e);
  return Response.json({ error: "internal_error" }, { status: 500 });
}
