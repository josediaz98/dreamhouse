import Image from "next/image";
import { SiteHeader } from "@/components/site-header";
import { AERIAL_CREDIT } from "@/lib/aerials";
import "./site-theme.css";

const SOURCES = [
  "Sonoma County parcels (CDR_Parcels)",
  "FEMA National Flood Hazard Layer",
  "Caltrans State Highway Network",
  "Sea Ranch Design Manual (Oct 2013)",
  "search-result summaries of public listings (2026-10-03)",
] as const;

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-root flex min-h-screen flex-col bg-bg font-sans text-fg">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-line">
        <div className="mx-auto grid w-full max-w-6xl gap-x-10 gap-y-3 px-4 py-6 text-xs leading-5 text-faint sm:px-6 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <p className="flex items-center gap-3">
              <Image src="/brand/wordmark.svg" alt="Lotline" width={80} height={16} unoptimized className="h-4 w-auto opacity-80" />
              <span>
                For agents: <a href="/llms.txt" className="underline underline-offset-2 hover:text-fg">/llms.txt</a> · MCP at{" "}
                <code className="font-mono">/mcp</code>
              </span>
            </p>
            <p>
              Pricing: <code className="font-mono">get_spec</code> and <code className="font-mono">check_buildability</code> are
              metered at $0.50 per call in Stripe Billing (test mode, no real charges). Search and seller questions are free.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <p>
              <span className="mr-1.5 font-mono uppercase tracking-wide text-muted">Data</span>
              {SOURCES.join(" · ")}.
            </p>
            <p>
              County GIS data is for planning purposes only, not parcel-specific decisions. Seller answers in the demo are
              entered by the presenter.
            </p>
            <p>{AERIAL_CREDIT}. Parcel outlines: Sonoma County CDR_Parcels.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
