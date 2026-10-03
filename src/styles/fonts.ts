import { Fraunces, IBM_Plex_Mono, Instrument_Sans } from "next/font/google";

/** UI text. */
export const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  display: "swap",
});

/** Headlines and the wordmark. Variable font with optical size. */
export const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
});

/** Tool-call traces, JSON, IDs, receipts. */
export const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

/** Apply on <html>: className={fontVariables}. */
export const fontVariables: string = [
  instrumentSans.variable,
  fraunces.variable,
  plexMono.variable,
].join(" ");
