import { Check, ShieldCheck } from 'lucide-react';
import {
  ACTION_SCOPE_CODES,
  READ_SCOPE_CODES,
  READ_SCOPE_GROUPS,
  type AiScopeCode,
} from '../constants';
import type { IntegrationsTranslations } from '../translations';

const readScopeSet = new Set<AiScopeCode>(READ_SCOPE_CODES);

type ConnectionPermissionChoicesProps = {
  copy: IntegrationsTranslations;
  mode: 'information' | 'actions';
  onChange: (scopes: AiScopeCode[]) => void;
  selectedScopes: AiScopeCode[];
};

export function ConnectionPermissionChoices({ copy, mode, onChange, selectedScopes }: ConnectionPermissionChoicesProps) {
  const toggleScopes = (scopeCodes: AiScopeCode[]) => {
    const allSelected = scopeCodes.every((scope) => selectedScopes.includes(scope));
    onChange(allSelected
      ? selectedScopes.filter((scope) => !scopeCodes.includes(scope))
      : [...new Set([...selectedScopes, ...scopeCodes])]);
  };

  if (mode === 'actions') {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {ACTION_SCOPE_CODES.map((scopeCode) => {
          const selected = selectedScopes.includes(scopeCode);
          const scope = copy.scopes[scopeCode];
          return (
            <label key={scopeCode} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${selected ? 'border-amber-400 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/25' : 'border-slate-200 bg-white hover:border-amber-200 dark:border-slate-700 dark:bg-slate-900'}`}>
              <input type="checkbox" checked={selected} onChange={() => toggleScopes([scopeCode])} className="sr-only" />
              <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border ${selected ? 'border-amber-600 bg-amber-600 text-white' : 'border-slate-300 bg-white text-transparent dark:border-slate-600 dark:bg-slate-800'}`}>
                <Check className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-sm font-medium text-slate-950 dark:text-white">{scope.label}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">{scope.description}</span>
              </span>
            </label>
          );
        })}
      </div>
    );
  }

  const allReadSelected = READ_SCOPE_CODES.every((scope) => selectedScopes.includes(scope));
  return (
    <div>
      <div className="mb-3 flex justify-end gap-3">
        <button type="button" onClick={() => onChange([...new Set([...selectedScopes, ...READ_SCOPE_CODES])])} className="text-xs font-medium text-[#177D66] hover:text-[#126553]">
          {copy.wizard.selectAll}
        </button>
        {allReadSelected ? (
          <button type="button" onClick={() => onChange(selectedScopes.filter((scope) => !readScopeSet.has(scope)))} className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
            {copy.wizard.clearAll}
          </button>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {READ_SCOPE_GROUPS.map((group) => {
          const selected = group.scopeCodes.every((scope) => selectedScopes.includes(scope));
          const groupCopy = copy.scopeGroups[group.id];
          const scopeNames = group.scopeCodes.map((scope) => copy.scopes[scope].label).join(' · ');
          return (
            <label key={group.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${selected ? 'border-[#59C3A5] bg-[#59C3A5]/10' : 'border-slate-200 bg-white hover:border-[#59C3A5]/60 dark:border-slate-700 dark:bg-slate-900'}`}>
              <input type="checkbox" checked={selected} onChange={() => toggleScopes(group.scopeCodes)} className="sr-only" />
              <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${selected ? 'bg-[#177D66] text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'}`}>
                {selected ? <Check className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
              </span>
              <span>
                <span className="block text-sm font-medium text-slate-950 dark:text-white">{groupCopy.label}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">{groupCopy.description}</span>
                <span className="mt-2 block text-xs leading-5 text-[#177D66] dark:text-[#8FE0CA]">{scopeNames}</span>
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
