import { z } from "zod";
import { parseAnswer } from "@/lib/server/answers";
import { errorResponse, getRepo } from "@/lib/server/http";
import { NotFoundError } from "@/lib/server/repo";

const Body = z.object({ answer: z.string().trim().min(1).max(1000) });

/** Updates the question and the matching spec_field in one transaction, so Realtime fires once. */
export async function POST(request: Request, ctx: RouteContext<"/api/questions/[id]/answer">): Promise<Response> {
  try {
    const { id } = await ctx.params;
    const { answer } = Body.parse(await request.json().catch(() => ({})));
    const repo = getRepo();
    const [q] = (await repo.listQuestions({})).filter((x) => x.id === id);
    if (!q) throw new NotFoundError(`question ${id}`);
    const question = await repo.answerQuestion(id, answer, parseAnswer(q.fieldKey, answer));
    return Response.json({ question });
  } catch (e) {
    return errorResponse(e);
  }
}
