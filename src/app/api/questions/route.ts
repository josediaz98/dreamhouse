import { z } from "zod";
import { errorResponse, getRepo } from "@/lib/server/http";

export const dynamic = "force-dynamic";

const Query = z.object({ status: z.enum(["open", "answered"]).optional() });

export async function GET(request: Request): Promise<Response> {
  try {
    const { status } = Query.parse(Object.fromEntries(new URL(request.url).searchParams));
    return Response.json({ questions: await getRepo().listQuestions({ status }) });
  } catch (e) {
    return errorResponse(e);
  }
}
