import { errorResponse, getRepo } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    return Response.json({ calls: await getRepo().listCalls(50) });
  } catch (e) {
    return errorResponse(e);
  }
}
