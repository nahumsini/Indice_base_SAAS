import type { EstructuraType } from '../types';

interface StructureCopy {
  mode: {
    title: string;
    description: string;
    helper: string;
    simpleTitle: string;
    simpleDescription: string;
    simpleExample: string;
    multiTitle: string;
    multiDescription: string;
    multiExample: string;
    switchPrompt: string;
    switchAction: string;
    multiNote: string;
    structurePreviewTitle: string;
    structurePreviewLines: string[];
  };
}

interface OperationTypeSectionProps {
  estructuraType: EstructuraType;
  structure: StructureCopy;
  isSimpleDisabled?: boolean;
  onEstructuraTypeChange: (nextType: EstructuraType) => void;
}

export function OperationTypeSection({
  estructuraType,
  structure,
  isSimpleDisabled = false,
  onEstructuraTypeChange,
}: OperationTypeSectionProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-5">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{structure.mode.title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {structure.mode.description}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
          {structure.mode.helper}
        </p>
      </div>

      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <button
            type="button"
            onClick={() => {
              if (!isSimpleDisabled) {
                onEstructuraTypeChange('simple');
              }
            }}
            disabled={isSimpleDisabled}
            className={`p-4 rounded-lg border-2 transition-all text-left ${
              estructuraType === 'simple'
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            } ${
              isSimpleDisabled
                ? 'cursor-not-allowed opacity-55 hover:border-gray-200 dark:hover:border-gray-700'
                : ''
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  estructuraType === 'simple'
                    ? 'border-purple-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                {estructuraType === 'simple' && (
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-500"></div>
                )}
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">
                {structure.mode.simpleTitle}
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 ml-7 mb-2">
              {structure.mode.simpleDescription}
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-500 ml-7 italic">
              {structure.mode.simpleExample}
            </p>
          </button>

          <button
            type="button"
            onClick={() => onEstructuraTypeChange('multi')}
            className={`p-4 rounded-lg border-2 transition-all text-left ${
              estructuraType === 'multi'
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  estructuraType === 'multi'
                    ? 'border-purple-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                {estructuraType === 'multi' && (
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-500"></div>
                )}
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">
                {structure.mode.multiTitle}
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 ml-7 mb-2">
              {structure.mode.multiDescription}
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-500 ml-7 italic">
              {structure.mode.multiExample}
            </p>
          </button>
        </div>

        {estructuraType === 'simple' ? (
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-700/30 text-center">
            <p className="text-sm text-purple-700 dark:text-purple-400">
              {structure.mode.switchPrompt}{' '}
              <button
                type="button"
                onClick={() => onEstructuraTypeChange('multi')}
                className="font-semibold hover:underline"
              >
                {structure.mode.switchAction}
              </button>
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {structure.mode.multiNote}
            </p>
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {structure.mode.structurePreviewTitle}
              </p>
              <pre className="text-xs text-gray-600 dark:text-gray-400 font-mono">
{structure.mode.structurePreviewLines.join('\n')}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
