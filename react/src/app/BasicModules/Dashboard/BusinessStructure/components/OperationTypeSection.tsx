import { Badge } from '../../../../components/ui/badge';
import type { EstructuraType } from '../types';

interface StructureCopy {
  mode: {
    title: string;
    description: string;
    simpleTitle: string;
    simpleDescription: string;
    multiTitle: string;
    multiDescription: string;
    selected: string;
  };
}

interface OperationTypeSectionProps {
  estructuraType: EstructuraType;
  structure: StructureCopy;
  isSimpleDisabled?: boolean;
  disabled?: boolean;
  onEstructuraTypeChange: (nextType: EstructuraType) => void;
}

export function OperationTypeSection({
  estructuraType,
  structure,
  isSimpleDisabled = false,
  disabled = false,
  onEstructuraTypeChange,
}: OperationTypeSectionProps) {
  const simpleDisabled = disabled || isSimpleDisabled;
  const options = [
    {
      description: structure.mode.simpleDescription,
      disabled: simpleDisabled,
      title: structure.mode.simpleTitle,
      type: 'simple' as const,
    },
    {
      description: structure.mode.multiDescription,
      disabled,
      title: structure.mode.multiTitle,
      type: 'multi' as const,
    },
  ];

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:p-5">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">{structure.mode.title}</h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{structure.mode.description}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {options.map((option) => {
          const selected = estructuraType === option.type;
          return (
            <button
              key={option.type}
              type="button"
              onClick={() => onEstructuraTypeChange(option.type)}
              disabled={option.disabled}
              aria-pressed={selected}
              className={`min-h-20 rounded-xl border p-3 text-left transition-colors ${selected
                ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-100 dark:border-blue-400 dark:bg-blue-900/25 dark:ring-blue-900/40'
                : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/40 dark:border-gray-700 dark:hover:border-blue-700'} ${option.disabled ? 'cursor-not-allowed opacity-55' : ''}`}
            >
              <div className="flex items-center gap-2">
                <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${selected ? 'border-blue-500' : 'border-gray-300 dark:border-gray-600'}`}>
                  {selected ? <span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> : null}
                </span>
                <span className="font-medium text-gray-950 dark:text-white">{option.title}</span>
                {selected ? <Badge className="bg-blue-600 text-white dark:bg-blue-500">{structure.mode.selected}</Badge> : null}
              </div>
              <p className="ml-7 mt-1 text-xs text-gray-600 dark:text-gray-400">{option.description}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
