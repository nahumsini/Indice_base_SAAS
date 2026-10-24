import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useMailTemplateVariablesCopy } from './mailTemplateVariablesCopy';

export function MailTemplateVariables({ names, disabled, onApply }: {
  names: string[]; disabled: boolean; onApply: (values: ReadonlyMap<string, string>) => void;
}) {
  const copy = useMailTemplateVariablesCopy();
  const [values, setValues] = useState(() => new Map<string, string>());
  const ready = names.every(name => {
    const value = values.get(name)?.trim();
    return !!value && !/\{\{[^{}]+\}\}/.test(value);
  });
  return <section aria-label={copy.title} className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900 dark:bg-amber-950/20">
    <h3 className="text-sm font-medium">{copy.title}</h3>
    <p className="text-xs text-slate-600 dark:text-slate-300">{copy.hint}</p>
    <div className="grid min-w-0 gap-3 sm:grid-cols-2">
      {names.map(name => <label key={name} className="min-w-0 space-y-1 text-sm">
        <span className="block break-all">{`{{${name}}}`}</span>
        <Input className="h-11" disabled={disabled} value={values.get(name) ?? ''} maxLength={20000}
          onChange={event => setValues(previous => new Map(previous).set(name, event.target.value))} />
      </label>)}
    </div>
    <Button type="button" variant="outline" className="min-h-11" disabled={disabled || !ready} onClick={() => onApply(values)}>{copy.apply}</Button>
  </section>;
}
