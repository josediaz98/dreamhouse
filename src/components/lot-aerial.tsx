import type { Verdict } from "@/lib/contract";
import { aerialFor, type LotAerial as LotAerialData } from "@/lib/aerials";

type Variant = "thumb" | "header";

interface LotAerialProps {
  readonly propertyId: string;
  readonly address: string;
  readonly verdict: Verdict;
  readonly variant: Variant;
  readonly className?: string;
}

const STROKE: Record<Verdict, string> = {
  pass: "stroke-pass fill-pass/10",
  fail: "stroke-fail fill-fail/10",
  unknown: "stroke-unknown fill-unknown/10",
};

function pathOf(outline: NonNullable<LotAerialData["outline"]>): string {
  return outline.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`).join("") + "Z";
}

/** The county parcel line over the photo. Same viewBox as the image + `slice` = object-cover. */
function Outline({
  aerial,
  verdict,
  variant,
}: {
  readonly aerial: LotAerialData;
  readonly verdict: Verdict;
  readonly variant: Variant;
}) {
  if (!aerial.outline) return null;
  const d = pathOf(aerial.outline);
  const width = variant === "thumb" ? 1.5 : 2.25;
  const dash = verdict === "unknown" ? (variant === "thumb" ? "4 3" : "7 5") : undefined;
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${aerial.width} ${aerial.height}`}
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 size-full"
    >
      {/* Dark halo keeps the line readable on bright meadow and surf. */}
      <path
        d={d}
        fill="none"
        className="stroke-bg/60"
        strokeWidth={width + 2}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={d}
        className={STROKE[verdict]}
        strokeWidth={width}
        strokeDasharray={dash}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function Unresolved({ variant }: { readonly variant: Variant }) {
  const thumb = variant === "thumb";
  return (
    <span className="absolute inset-0 flex items-center justify-center bg-raised p-2">
      <span
        className={`flex flex-col items-center justify-center rounded-sm border border-dashed border-accent/70 text-center ${
          thumb ? "h-full w-full max-w-48 gap-0.5" : "h-3/4 w-2/3 max-w-80 gap-1"
        }`}
      >
        <span aria-hidden className={`font-display leading-none text-accent ${thumb ? "text-xl" : "text-4xl"}`}>
          ?
        </span>
        <span className="font-mono text-[0.6875rem] leading-tight text-muted">parcel not resolved</span>
      </span>
    </span>
  );
}

/**
 * Real aerial of the lot (USDA NAIP, public domain) with the county parcel outline.
 * thumb: 3:2 card thumbnail (a banner on phones, sized by the caller). header: 16:9 panel header.
 */
export function LotAerial({ propertyId, address, verdict, variant, className = "" }: LotAerialProps) {
  const aerial = aerialFor(propertyId);
  const resolved = aerial !== undefined && aerial.src !== null && aerial.outline !== null;
  const aspect = variant === "header" ? (resolved ? "aspect-video" : "h-36") : "";

  return (
    <span className={`relative block overflow-hidden bg-raised ${aspect} ${className}`}>
      {resolved ? (
        <>
          {/* Plain img: static, pre-sized public-domain file; next/image adds nothing here. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={aerial.src ?? undefined}
            width={aerial.width}
            height={aerial.height}
            alt={`Aerial photo of ${address} with the county parcel outline`}
            loading="lazy"
            decoding="async"
            className={`absolute inset-0 size-full object-cover ${verdict === "fail" ? "grayscale" : ""}`}
          />
          <Outline aerial={aerial} verdict={verdict} variant={variant} />
          {variant === "header" ? (
            <>
              <AerialLegend />
              <span className="pointer-events-none absolute bottom-2 right-2 rounded bg-bg/80 px-2 py-1 font-mono text-[0.6875rem] leading-4 text-muted backdrop-blur-sm max-sm:hidden">
                USDA NAIP · USGS
              </span>
            </>
          ) : null}
        </>
      ) : (
        <Unresolved variant={variant} />
      )}
    </span>
  );
}

/** Tiny key for the header photo. */
function AerialLegend() {
  return (
    <span className="pointer-events-none absolute bottom-2 left-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded bg-bg/80 px-2 py-1 font-mono text-[0.6875rem] leading-4 text-muted backdrop-blur-sm">
      <span className="inline-flex items-center gap-1.5">
        <svg aria-hidden viewBox="0 0 16 2" className="h-0.5 w-4">
          <line x1="0" y1="1" x2="16" y2="1" className="stroke-fg" strokeWidth={2} />
        </svg>
        county parcel line
      </span>
      <span className="inline-flex items-center gap-1.5">
        <svg aria-hidden viewBox="0 0 16 2" className="h-0.5 w-4">
          <line x1="0" y1="1" x2="16" y2="1" className="stroke-fg" strokeWidth={2} strokeDasharray="4 3" />
        </svg>
        still unknown
      </span>
    </span>
  );
}
