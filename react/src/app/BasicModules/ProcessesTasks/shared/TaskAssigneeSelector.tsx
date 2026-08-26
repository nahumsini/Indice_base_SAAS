import { Check, Crown, UserRound, UsersRound } from 'lucide-react';

export type TaskAssigneeSelectorOption = {
  email?: string | null;
  name: string;
  userCompanyId: number;
};

export type TaskAssigneeSelection = {
  leadUserCompanyId: number | null;
  userCompanyIds: number[];
};

export type TaskAssigneeSelectorCopy = {
  lead: string;
  limit: (max: number) => string;
  makeLead: string;
  selected: (count: number, max: number) => string;
  you: string;
};

type TaskAssigneeSelectorProps = {
  copy: TaskAssigneeSelectorCopy;
  currentUserCompanyId?: number | null;
  disabled?: boolean;
  leadUserCompanyId: number | null;
  maxSelections?: number;
  onChange: (selection: TaskAssigneeSelection) => void;
  options: TaskAssigneeSelectorOption[];
  selectedUserCompanyIds: number[];
};

function uniquePositiveIds(values: number[]) {
  return Array.from(new Set(values.filter((value) => Number.isInteger(value) && value > 0)));
}

export function TaskAssigneeSelector({
  copy,
  currentUserCompanyId = null,
  disabled = false,
  leadUserCompanyId,
  maxSelections = 2,
  onChange,
  options,
  selectedUserCompanyIds,
}: TaskAssigneeSelectorProps) {
  const selectedIds = uniquePositiveIds(selectedUserCompanyIds);
  const selectedSet = new Set(selectedIds);
  const selectionAtLimit = selectedIds.length >= maxSelections;

  const toggleOption = (userCompanyId: number) => {
    if (disabled) return;

    if (selectedSet.has(userCompanyId)) {
      const nextIds = selectedIds.filter((id) => id !== userCompanyId);
      const nextLeadId = leadUserCompanyId === userCompanyId || !nextIds.includes(leadUserCompanyId ?? -1)
        ? nextIds[0] ?? null
        : leadUserCompanyId;
      onChange({ leadUserCompanyId: nextLeadId, userCompanyIds: nextIds });
      return;
    }

    if (selectionAtLimit) return;

    const nextIds = [...selectedIds, userCompanyId];
    onChange({
      leadUserCompanyId:
        leadUserCompanyId != null && nextIds.includes(leadUserCompanyId)
          ? leadUserCompanyId
          : userCompanyId,
      userCompanyIds: nextIds,
    });
  };

  const makeLead = (userCompanyId: number) => {
    if (disabled || !selectedSet.has(userCompanyId) || leadUserCompanyId === userCompanyId) return;
    onChange({
      leadUserCompanyId: userCompanyId,
      userCompanyIds: [userCompanyId, ...selectedIds.filter((id) => id !== userCompanyId)],
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full bg-[#F8C842]/15 px-3 py-1 text-xs font-medium text-[#8A6200] dark:text-[#F8C842]">
          {copy.selected(selectedIds.length, maxSelections)}
        </span>
        {selectionAtLimit ? (
          <span className="text-xs text-slate-500 dark:text-slate-400">{copy.limit(maxSelections)}</span>
        ) : null}
      </div>

      <div className="grid max-h-56 grid-cols-1 gap-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900/60 sm:grid-cols-2">
        {options.map((option) => {
          const selected = selectedSet.has(option.userCompanyId);
          const isLead = leadUserCompanyId === option.userCompanyId;
          const isCurrentUser = currentUserCompanyId === option.userCompanyId;
          const selectionDisabled = disabled || (!selected && selectionAtLimit);

          return (
            <div
              key={option.userCompanyId}
              className={`flex min-w-0 items-center gap-2 rounded-xl border px-3 py-2 transition-colors ${
                selected
                  ? 'border-[#F8C842] bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                  : 'border-transparent bg-white/70 text-slate-600 dark:bg-slate-800/50 dark:text-slate-300'
              } ${selectionDisabled ? 'opacity-55' : 'hover:border-slate-300'}`}
            >
              <button
                type="button"
                aria-pressed={selected}
                disabled={selectionDisabled}
                onClick={() => toggleOption(option.userCompanyId)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-not-allowed"
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  selected ? 'bg-[#F8C842] text-slate-950' : 'bg-slate-200 text-slate-500 dark:bg-slate-700'
                }`}>
                  {selected ? <Check className="h-4 w-4" /> : isCurrentUser ? <UserRound className="h-4 w-4" /> : <UsersRound className="h-4 w-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {option.name}{isCurrentUser ? ` · ${copy.you}` : ''}
                  </span>
                  <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                    {isLead ? copy.lead : option.email || ''}
                  </span>
                </span>
              </button>

              {selected && !isLead ? (
                <button
                  type="button"
                  disabled={disabled}
                  title={copy.makeLead}
                  aria-label={`${copy.makeLead}: ${option.name}`}
                  onClick={() => makeLead(option.userCompanyId)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-[#F8C842]/20 hover:text-[#8A6200] disabled:cursor-not-allowed"
                >
                  <Crown className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
