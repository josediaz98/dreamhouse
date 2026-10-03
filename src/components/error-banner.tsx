export function ErrorBanner({
  message,
  onRetry,
}: {
  readonly message: string;
  readonly onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-fail bg-fail-soft px-4 py-3 text-sm text-fg"
    >
      <span className="min-w-0 break-words">{message}</span>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded border border-line-strong px-3 py-1 text-sm hover-surface-2"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
