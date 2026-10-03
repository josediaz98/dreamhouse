import type { HouseProgram } from "@/lib/contract";

/** The demo buyer's house. 26 ft: over the 24 ft west-of-Hwy-1 limit, under the 35 ft east limit. */
export const DEMO_PROGRAM = { footprintSqFt: 2155, deckSqFt: 400, heightFt: 26, stories: 2 } as const satisfies HouseProgram;
