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
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-fail-line bg-fail-soft px-4 py-3 text-sm text-fg"
    >
      <span className="min-w-0 break-words">{message}</span>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded border border-line-strong px-3 py-1 text-sm hover:bg-raised max-sm:min-h-11"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
