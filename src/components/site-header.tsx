import Image from "next/image";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" aria-label="Lotline home">
          <Image src="/brand/wordmark.svg" alt="Lotline" width={170} height={34} priority unoptimized />
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-4 whitespace-nowrap text-sm text-muted sm:gap-5">
          <Link href="/#demo" className="hover:text-fg max-sm:py-3">
            Live demo
          </Link>
          <Link href="/seller" className="hover:text-fg max-sm:py-3">
            Seller console
          </Link>
        </nav>
      </div>
    </header>
  );
}
