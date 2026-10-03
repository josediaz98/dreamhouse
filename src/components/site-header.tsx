import Image from "next/image";
import Link from "next/link";
import { ConnectAgent } from "@/components/connect-agent";

export function SiteHeader() {
  return (
    <header className="relative z-20 border-b border-line">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <Link href="/" aria-label="Lotline home" className="inline-flex min-h-11 shrink-0 items-center rounded-sm">
          <Image
            src="/brand/wordmark.svg"
            alt="Lotline"
            width={150}
            height={30}
            priority
            unoptimized
            className="h-6 w-auto sm:h-7"
          />
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-1 whitespace-nowrap text-sm sm:gap-3">
          <Link
            href="/seller"
            className="inline-flex min-h-11 items-center rounded-md px-2 text-muted transition-colors duration-150 hover:text-fg sm:min-h-9 sm:px-3"
          >
            Seller console
          </Link>
          <ConnectAgent />
        </nav>
      </div>
    </header>
  );
}
