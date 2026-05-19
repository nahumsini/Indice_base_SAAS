import { useEffect } from 'react';
import { cn } from './ui/utils';

interface LoadingBarOverlayProps {
  isVisible: boolean;
  title: string;
  description?: string;
  className?: string;
}

const DEFAULT_MINIMUM_DURATION_MS = 700;
const wait = (durationMs: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, durationMs);
  });

const getNow = () => (
  typeof performance !== 'undefined' ? performance.now() : Date.now()
);

let activeScrollLocks = 0;
let scrollLockSnapshot: {
  bodyOverflow: string;
  bodyPaddingRight: string;
  bodyPosition: string;
  bodyTop: string;
  bodyWidth: string;
  htmlOverflow: string;
} | null = null;

const lockPageScroll = () => {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return () => {};
  }

  activeScrollLocks += 1;

  if (activeScrollLocks === 1) {
    const body = document.body;
    const html = document.documentElement;
    const scrollbarWidth = window.innerWidth - html.clientWidth;
    const currentBodyPaddingRight = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0;

    scrollLockSnapshot = {
      bodyOverflow: body.style.overflow,
      bodyPaddingRight: body.style.paddingRight,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
      htmlOverflow: html.style.overflow,
    };

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';

    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${currentBodyPaddingRight + scrollbarWidth}px`;
    }
  }

  return () => {
    activeScrollLocks = Math.max(0, activeScrollLocks - 1);

    if (activeScrollLocks > 0 || !scrollLockSnapshot) {
      return;
    }

    const body = document.body;
    const html = document.documentElement;

    body.style.overflow = scrollLockSnapshot.bodyOverflow;
    body.style.paddingRight = scrollLockSnapshot.bodyPaddingRight;
    body.style.position = scrollLockSnapshot.bodyPosition;
    body.style.top = scrollLockSnapshot.bodyTop;
    body.style.width = scrollLockSnapshot.bodyWidth;
    html.style.overflow = scrollLockSnapshot.htmlOverflow;
    scrollLockSnapshot = null;
  };
};

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
  useEffect(() => {
    if (!isVisible) {
      return undefined;
    }

    return lockPageScroll();
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed inset-0 z-[90] flex overscroll-contain items-center justify-center bg-slate-950/35 px-4 backdrop-blur-[2px]',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className="flex min-w-[240px] max-w-[340px] flex-col items-center gap-3 rounded-xl bg-white px-6 py-5 text-center text-slate-900 shadow-[0_18px_38px_rgba(0,0,0,0.18)]"
        style={{ fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif" }}
      >
        <div className="text-[15px] font-semibold">
          {title}
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#1f4d9f]/15" aria-hidden="true">
          <div className="h-full w-1/2 rounded-full bg-[#1f4d9f] animate-loading-bar" />
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
