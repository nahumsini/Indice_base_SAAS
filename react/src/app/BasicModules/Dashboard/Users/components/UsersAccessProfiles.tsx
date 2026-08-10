import { Check, Sparkles } from 'lucide-react';
import type { UsersTranslations } from '../usersTranslations';

export type UsersAccessProfileId = 'basic' | 'operation' | 'responsible' | 'admin' | 'custom';

interface UsersAccessProfileOption {
  disabled?: boolean;
  id: Exclude<UsersAccessProfileId, 'custom'>;
  moduleIds: string[];
}

interface UsersAccessProfilesProps {
  activeProfileId: UsersAccessProfileId;
  copy: UsersTranslations['accessProfiles'];
  onApply: (profile: UsersAccessProfileOption) => void;
  profiles: UsersAccessProfileOption[];
}

export function UsersAccessProfiles({ activeProfileId, copy, onApply, profiles }: UsersAccessProfilesProps) {
  return (
    <section className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900/70 dark:bg-blue-950/20">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-300">
          <Sparkles aria-hidden="true" className="h-4 w-4" />
        </span>
        <div>
          <h4 className="text-sm font-medium text-slate-900 dark:text-white">{copy.title}</h4>
          <p className="mt-0.5 text-xs leading-5 text-slate-600 dark:text-slate-300">{copy.description}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {profiles.map((profile) => {
          const profileCopy = copy[profile.id];
          const selected = activeProfileId === profile.id;
          return (
            <button
              key={profile.id}
              type="button"
              disabled={profile.disabled}
              aria-pressed={selected}
              onClick={() => onApply(profile)}
              className={`relative min-h-20 rounded-xl border px-3 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${selected
                ? 'border-blue-500 bg-white ring-2 ring-blue-100 dark:bg-slate-900 dark:ring-blue-900/40'
                : 'border-blue-100 bg-white/75 hover:border-blue-300 dark:border-blue-900/60 dark:bg-slate-900/70'}`}
            >
              <span className="flex items-center justify-between gap-2 text-sm font-medium text-slate-900 dark:text-white">
                {profileCopy.label}
                {selected ? <Check aria-hidden="true" className="h-4 w-4 text-blue-600 dark:text-blue-300" /> : null}
              </span>
              <span className="mt-1 block text-xs leading-4 text-slate-500 dark:text-slate-400">{profileCopy.description}</span>
            </button>
          );
        })}
      </div>

      {activeProfileId === 'custom' ? (
        <p className="mt-3 text-xs font-medium text-blue-700 dark:text-blue-300">{copy.custom.label}: {copy.custom.description}</p>
      ) : null}
    </section>
  );
}
