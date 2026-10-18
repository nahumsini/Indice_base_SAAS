import { useCallback, useEffect, useState, type CSSProperties, type Ref } from 'react';

export interface DialogViewport {
  height: number;
  offsetTop: number;
}

/** Observe only mounted dialogs, coalescing keyboard/viewport movement per frame. */
export function subscribeToDialogViewport(onChange: (value: DialogViewport) => void, target: Window = window) {
  const viewport = target.visualViewport;
  let frame: number | undefined;
  const measure = () => {
    frame = undefined;
    const height = viewport?.height ?? target.innerHeight;
    onChange({
      height: Math.max(1, Number.isFinite(height) ? height : target.innerHeight),
      offsetTop: Math.max(0, viewport?.offsetTop ?? 0),
    });
  };
  const schedule = () => {
    if (frame === undefined) frame = target.requestAnimationFrame(measure);
  };
  measure();
  viewport?.addEventListener('resize', schedule);
  viewport?.addEventListener('scroll', schedule);
  target.addEventListener('resize', schedule);
  return () => {
    viewport?.removeEventListener('resize', schedule);
    viewport?.removeEventListener('scroll', schedule);
    target.removeEventListener('resize', schedule);
    if (frame !== undefined) target.cancelAnimationFrame(frame);
  };
}

export function useDialogViewport(forwardedRef?: Ref<HTMLDivElement>) {
  const [mounted, setMounted] = useState(false);
  const [viewport, setViewport] = useState<DialogViewport | null>(null);
  const ref = useCallback((node: HTMLDivElement | null) => {
    setMounted(Boolean(node));
    if (typeof forwardedRef === 'function') {
      const cleanup = forwardedRef(node);
      if (typeof cleanup === 'function') return () => { setMounted(false); cleanup(); };
    } else if (forwardedRef) forwardedRef.current = node;
  }, [forwardedRef]);
  useEffect(() => {
    if (!mounted) return;
    return subscribeToDialogViewport(value => setViewport(current =>
      current?.height === value.height && current.offsetTop === value.offsetTop ? current : value));
  }, [mounted]);
  return {
    ref,
    compact: viewport ? viewport.height < 520 : undefined,
    style: viewport ? {
      '--indice-dialog-viewport-height': `${viewport.height}px`,
      '--indice-dialog-viewport-top': `${viewport.offsetTop}px`,
    } as CSSProperties : undefined,
  };
}
