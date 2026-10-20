import { useSearchParams } from 'react-router';

/** Presentation-only section routing. The owning workspace still authorizes every section. */
export function useQuerySection<T extends string>(parameter: string, sections: readonly T[], fallback: T) {
  const [params, setParams] = useSearchParams();
  const requested = params.get(parameter);
  const section = sections.find(value => value === requested) ?? fallback;
  const setSection = (next: T) => {
    if (next === section || !sections.includes(next)) return;
    setParams(previous => {
      const updated = new URLSearchParams(previous);
      updated.set(parameter, next);
      return updated;
    });
  };
  return { section, setSection };
}
