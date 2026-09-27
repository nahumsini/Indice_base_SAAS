import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react';

const changeEvent = 'indice:local-storage-state';

export function useLocalStorageState<T>(key: string, initialValue: T, synchronize = false) {
  const initialRef = useRef(initialValue);
  const readValue = useCallback((): T => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored === null) return initialRef.current;
      const parsed: unknown = JSON.parse(stored);
      // A malformed theme must not turn the string "false" into night mode.
      if (synchronize && typeof initialRef.current === 'boolean' && typeof parsed !== 'boolean') return initialRef.current;
      return parsed as T;
    } catch { return initialRef.current; }
  }, [key, synchronize]);
  const [value, setValue] = useState<T>(readValue);
  const valueRef = useRef(value);

  useEffect(() => {
    if (!synchronize) {
      try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* Keep the UI available. */ }
    }
  }, [key, synchronize, value]);

  useEffect(() => {
    if (!synchronize) return;
    const restore = () => {
      const next = readValue();
      valueRef.current = next;
      setValue(next);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === key || event.key === null) restore();
    };
    const onLocalChange = (event: Event) => {
      if ((event as CustomEvent<string>).detail === key) restore();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(changeEvent, onLocalChange);
    // Read after subscribing; mounting another pane must never write a stale default.
    restore();
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(changeEvent, onLocalChange);
    };
  }, [key, readValue, synchronize]);

  const setSynchronizedValue = useCallback((update: SetStateAction<T>) => {
    const next = typeof update === 'function' ? (update as (previous: T) => T)(valueRef.current) : update;
    valueRef.current = next;
    setValue(next);
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent(changeEvent, { detail: key }));
    } catch { /* Storage restrictions must not block the local theme control. */ }
  }, [key]);
  return [value, synchronize ? setSynchronizedValue : setValue] as const;
}
