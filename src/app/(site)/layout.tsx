import Image from "next/image";
import { SiteHeader } from "@/components/site-header";
import "./site-theme.css";

const SOURCES = [
  "Sonoma County parcels (CDR_Parcels)",
  "FEMA National Flood Hazard Layer",
  "Caltrans State Highway Network",
  "Sea Ranch Design Manual (Oct 2013)",
  "public listing pages",
] as const;

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-root flex min-h-screen flex-col bg-bg font-sans text-fg">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-line">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 text-sm text-muted sm:px-6 md:grid-cols-[1fr_2fr]">
          <div className="flex flex-col gap-3">
            <Image src="/brand/wordmark.svg" alt="Lotline" width={120} height={24} unoptimized className="h-6 w-auto self-start" />
            <p className="text-xs text-faint">Pay per call with Stripe MPP (HTTP 402). Sandbox mode.</p>
          </div>
          <div className="flex flex-col gap-3">
            <p>
              <span className="label mr-2">Data</span>
              {SOURCES.join(" · ")}.
            </p>
            <p>
              County GIS data is for planning purposes only, not parcel-specific decisions.
            </p>
            <p>Seller answers in the demo are typed by the presenter.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
