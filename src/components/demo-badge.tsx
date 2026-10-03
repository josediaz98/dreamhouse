export function DemoBadge({ label = "demo data" }: { readonly label?: string }) {
  return (
    <span className="inline-flex items-center rounded border border-line-strong px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted">
      {label}
    </span>
  );
}
