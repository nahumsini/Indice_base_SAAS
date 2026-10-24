import { useLayoutEffect, useRef, type RefObject } from 'react';
import { useAuthorizationRevision } from '../../hooks/useAuthorizationRevision';

/** Presentation only: keep a tab's position on its owning viewport, never the page. */
export function bindContainedModuleScroll(viewport: HTMLElement, content: Element, routeKey: string, positions: Map<string, number>, phone: boolean) {
  const saved = phone ? 0 : positions.get(routeKey) ?? 0;
  let restoring = true;
  let frame: number | undefined;
  const finish = () => {
    restoring = false;
    observer.disconnect();
    positions.set(routeKey, viewport.scrollTop);
  };
  const remember = () => { if (!restoring) positions.set(routeKey, viewport.scrollTop); };
  const restore = () => {
    frame = undefined;
    if (!restoring) return;
    viewport.scrollTo({ top: saved, left: 0, behavior: 'instant' });
    if (Math.abs(viewport.scrollTop - saved) < 1) finish();
  };
  const observer = new ResizeObserver(() => {
    if (frame === undefined && restoring) frame = window.requestAnimationFrame(restore);
  });
  const onIntent = () => { finish(); remember(); };
  const intentEvents = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const;
  viewport.addEventListener('scroll', remember, { passive: true });
  intentEvents.forEach(event => viewport.addEventListener(event, onIntent, { passive: true }));
  observer.observe(content);
  observer.observe(viewport);
  restore();
  return () => {
    viewport.removeEventListener('scroll', remember);
    intentEvents.forEach(event => viewport.removeEventListener(event, onIntent));
    observer.disconnect();
    if (frame !== undefined) window.cancelAnimationFrame(frame);
  };
}

/** Opt-in: existing owners retain their scroll behavior until deliberately adopted. */
export function useContainedModuleScroll(routeKey: string, viewportRef: RefObject<HTMLElement | null>, enabled: boolean) {
  const authorization = useAuthorizationRevision();
  const positions = useRef(new Map<string, number>());
  const previousAuthorization = useRef(authorization);
  useLayoutEffect(() => {
    if (previousAuthorization.current !== authorization) {
      positions.current.clear();
      previousAuthorization.current = authorization;
    }
    if (!enabled) return;
    const viewport = viewportRef.current;
    const content = viewport?.firstElementChild;
    if (!viewport || !content) return;
    return bindContainedModuleScroll(viewport, content, routeKey, positions.current, window.matchMedia('(max-width: 767px)').matches);
  }, [authorization, enabled, routeKey, viewportRef]);
}

/** Reveal a guide's destination without moving a surrounding shell or another pane. */
export function scrollModuleContentIntoView(content: HTMLElement | null) {
  const viewport = content?.closest('main');
  if (!content || !viewport) return;
  viewport.scrollTo({
    top: viewport.scrollTop + content.getBoundingClientRect().top - viewport.getBoundingClientRect().top,
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
  });
}
