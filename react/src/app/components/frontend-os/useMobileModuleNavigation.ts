import { useEffect, type RefObject } from 'react';

/** Move only the horizontal rail; do not scroll the page or steal input focus. */
export function revealCurrentNavigationItem(rail: HTMLElement | null) {
  const current = rail?.querySelector<HTMLElement>('[aria-current="page"]');
  if (!rail || !current || rail.clientWidth === 0) return;
  const bounds = rail.getBoundingClientRect();
  const item = current.getBoundingClientRect();
  if (item.left >= bounds.left && item.right <= bounds.right) return;
  rail.scrollTo({ left: rail.scrollLeft + item.left - bounds.left - (rail.clientWidth - item.width) / 2, behavior: 'auto' });
}

/** Phone route changes start the next tab at its heading and reveal its tab. */
export function useMobileModuleNavigation(
  routeKey: string,
  navigationKey: string,
  railRef?: RefObject<HTMLElement | null>,
  bodyRef?: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!window.matchMedia('(max-width: 767px)').matches) return;
    bodyRef?.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [routeKey, bodyRef]);
  useEffect(() => {
    if (!railRef) return;
    let frame: number | undefined;
    const schedule = () => {
      if (!window.matchMedia('(max-width: 767px)').matches || frame !== undefined) return;
      frame = window.requestAnimationFrame(() => {
        frame = undefined;
        revealCurrentNavigationItem(railRef.current);
      });
    };
    schedule();
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('resize', schedule);
      if (frame !== undefined) window.cancelAnimationFrame(frame);
    };
  }, [routeKey, navigationKey, railRef]);
}
