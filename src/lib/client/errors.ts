import { ApiError } from "@/lib/client/api";

/**
 * One plain sentence for the UI. Never the response body, the URL or a stack trace:
 * the technical detail goes to the console for whoever is debugging.
 */
export function plainError(error: unknown, action: string): string {
  console.error(`Could not ${action}`, error);
  if (error instanceof ApiError && error.status === 402) {
    return "This call needs payment and the browser demo cannot pay. Use the install line above to call it from an agent.";
  }
  return `Could not ${action}. Check your connection and try again.`;
}
