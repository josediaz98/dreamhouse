import Image from "next/image";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" aria-label="Lotline home">
          <Image src="/brand/wordmark.svg" alt="Lotline" width={170} height={34} priority unoptimized />
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
