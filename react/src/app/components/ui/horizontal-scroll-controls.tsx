import type { RefObject } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../shared/context';
import { getHorizontalScrollLabels } from './horizontalScrollTranslations';
import { cn } from './utils';

type HorizontalScrollState = {
  canScrollLeft: boolean;
  canScrollRight: boolean;
};

const SCROLL_EDGE_TOLERANCE = 2;

export interface IndiceHorizontalScrollControlsProps {
  scrollRef: RefObject<HTMLElement | null>;
  className?: string;
  buttonClassName?: string;
  verticalPositionClassName?: string;
  scrollAmount?: number;
}

/**
 * Discoverable mouse and keyboard controls for an existing horizontal-scroll
 * viewport. Touch, trackpad and native scrollbar behavior remain untouched.
 */
export function IndiceHorizontalScrollControls({
  scrollRef,
  className,
  buttonClassName,
  verticalPositionClassName = 'top-1/2 -translate-y-1/2',
  scrollAmount,
}: IndiceHorizontalScrollControlsProps) {
  const { currentLanguage } = useLanguage();
  const labels = getHorizontalScrollLabels(currentLanguage.code);
  const [scrollState, setScrollState] = useState<HorizontalScrollState>({
    canScrollLeft: false,
    canScrollRight: false,
  });

  const updateScrollState = useCallback(() => {
    const viewport = scrollRef.current;
    if (!viewport) return;

    const maximumScrollLeft = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    const nextState = {
      canScrollLeft: viewport.scrollLeft > SCROLL_EDGE_TOLERANCE,
      canScrollRight: viewport.scrollLeft < maximumScrollLeft - SCROLL_EDGE_TOLERANCE,
    };

    setScrollState((currentState) => (
      currentState.canScrollLeft === nextState.canScrollLeft
      && currentState.canScrollRight === nextState.canScrollRight
        ? currentState
        : nextState
    ));
  }, [scrollRef]);

  useEffect(() => {
    const viewport = scrollRef.current;
    if (!viewport) return undefined;

    let animationFrame = 0;
    const scheduleUpdate = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(updateScrollState);
    };

    viewport.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);

    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? undefined
      : new ResizeObserver(scheduleUpdate);
    resizeObserver?.observe(viewport);
    Array.from(viewport.children).forEach((child) => resizeObserver?.observe(child));

    const mutationObserver = typeof MutationObserver === 'undefined'
      ? undefined
      : new MutationObserver(scheduleUpdate);
    mutationObserver?.observe(viewport, { childList: true, subtree: true });

    scheduleUpdate();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      viewport.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [scrollRef, updateScrollState]);

  const scroll = (direction: 'left' | 'right') => {
    const viewport = scrollRef.current;
    if (!viewport) return;

    const resolvedAmount = scrollAmount
      ?? Math.min(640, Math.max(240, viewport.clientWidth * 0.72));
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    viewport.scrollBy({
      left: direction === 'left' ? -resolvedAmount : resolvedAmount,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  };

  const sharedButtonClassName = cn(
    'pointer-events-auto absolute z-20 hidden h-9 w-9 items-center justify-center rounded-full border border-slate-300/70 bg-white/75 text-slate-700 shadow-lg backdrop-blur-sm transition hover:scale-105 hover:bg-white/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--indice-brand-action)] focus-visible:ring-offset-2 dark:border-slate-600/70 dark:bg-slate-900/75 dark:text-slate-200 dark:hover:bg-slate-900/95 md:inline-flex',
    verticalPositionClassName,
    buttonClassName,
  );

  if (!scrollState.canScrollLeft && !scrollState.canScrollRight) return null;

  return (
    <div className={cn('pointer-events-none absolute inset-0 z-20', className)}>
      {scrollState.canScrollLeft ? (
        <button
          type="button"
          aria-label={labels.left}
          title={labels.left}
          className={cn(sharedButtonClassName, 'left-2')}
          onClick={() => scroll('left')}
        >
          <ChevronLeft aria-hidden="true" className="h-5 w-5" />
        </button>
      ) : null}
      {scrollState.canScrollRight ? (
        <button
          type="button"
          aria-label={labels.right}
          title={labels.right}
          className={cn(sharedButtonClassName, 'right-2')}
          onClick={() => scroll('right')}
        >
          <ChevronRight aria-hidden="true" className="h-5 w-5" />
        </button>
      ) : null}
    </div>
  );
}
