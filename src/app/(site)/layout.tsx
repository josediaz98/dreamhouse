import { SiteHeader } from "@/components/site-header";
import "./site-theme.css";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-root flex min-h-screen flex-col bg-bg font-sans text-fg">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-line">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 text-sm text-muted sm:px-6">
          Pay per call with Stripe MPP (HTTP 402). Sandbox mode.
        </div>
      </footer>
    </div>
  );
}
