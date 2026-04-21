import { cn } from './ui/utils';

interface LoadingBarOverlayProps {
  isVisible: boolean;
  title: string;
  description?: string;
  className?: string;
}

const DEFAULT_MINIMUM_DURATION_MS = 2500;
const wait = (durationMs: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, durationMs);
  });

const getNow = () => (
  typeof performance !== 'undefined' ? performance.now() : Date.now()
);

export async function runWithMinimumDuration<T>(
  task: Promise<T>,
  minimumDurationMs = DEFAULT_MINIMUM_DURATION_MS,
) {
  const startedAt = getNow();

  try {
    const result = await task;
    const elapsedMs = getNow() - startedAt;

    if (elapsedMs < minimumDurationMs) {
      await wait(minimumDurationMs - elapsedMs);
    }

    return result;
  } catch (error) {
    const elapsedMs = getNow() - startedAt;

    if (elapsedMs < minimumDurationMs) {
      await wait(minimumDurationMs - elapsedMs);
    }

    throw error;
  }
}

export function LoadingBarOverlay({
  isVisible,
  title,
  description,
  className,
}: LoadingBarOverlayProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-[2px]',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className="flex min-w-[220px] flex-col items-center gap-3 rounded-xl bg-white px-6 py-5 text-center text-slate-900 shadow-[0_18px_38px_rgba(0,0,0,0.18)]"
        style={{ fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif" }}
      >
        <div
          className="h-10 w-10 animate-spin rounded-full border-4 border-[#1f4d9f]/20 border-t-[#1f4d9f]/90"
          aria-hidden="true"
        />
        <div className="text-[15px] font-semibold">
          {title}
        </div>
        {description ? (
          <p className="max-w-[280px] text-sm leading-6 text-slate-600">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
