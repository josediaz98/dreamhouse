import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="font-mono text-sm font-semibold tracking-wide text-fg">
          DREAMHOUSE
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-5 text-sm text-muted">
          <Link href="/#demo" className="hover:text-fg">
            Live demo
          </Link>
          <Link href="/seller" className="hover:text-fg">
            Seller console
          </Link>
        </nav>
      </div>
    </header>
  );
}
