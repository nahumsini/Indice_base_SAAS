import { Badge } from '../../../../components/ui/badge';
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
    selected: string;
    structurePreviewTitle: string;
    structurePreviewLines: string[];
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
              if (!simpleDisabled) {
                onEstructuraTypeChange('simple');
              }
            }}
            disabled={simpleDisabled}
            className={`p-4 rounded-lg border-2 text-left transition-all duration-150 ease-in-out hover:-translate-y-0.5 hover:shadow-md ${
              estructuraType === 'simple'
                ? 'border-blue-600 bg-blue-50/80 shadow-sm ring-2 ring-blue-100 dark:border-blue-400 dark:bg-blue-900/25 dark:ring-blue-900/40'
                : 'border-gray-200 bg-transparent opacity-95 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
            } ${
              simpleDisabled
                ? 'cursor-not-allowed opacity-55 hover:translate-y-0 hover:border-gray-200 hover:shadow-none dark:hover:border-gray-700'
                : ''
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  estructuraType === 'simple'
                    ? 'border-blue-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                {estructuraType === 'simple' && (
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                )}
              </div>
              <span className={`font-semibold ${
                estructuraType === 'simple'
                  ? 'text-gray-950 dark:text-white'
                  : 'text-gray-800 dark:text-gray-200'
              }`}>
                {structure.mode.simpleTitle}
              </span>
              {estructuraType === 'simple' ? (
                <Badge className="bg-blue-600 text-white dark:bg-blue-500">
                  {structure.mode.selected}
                </Badge>
              ) : null}
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
            onClick={() => {
              if (!disabled) {
                onEstructuraTypeChange('multi');
              }
            }}
            disabled={disabled}
            className={`p-4 rounded-lg border-2 text-left transition-all duration-150 ease-in-out hover:-translate-y-0.5 hover:shadow-md ${
              estructuraType === 'multi'
                ? 'border-blue-600 bg-blue-50/80 shadow-sm ring-2 ring-blue-100 dark:border-blue-400 dark:bg-blue-900/25 dark:ring-blue-900/40'
                : 'border-gray-200 bg-transparent opacity-95 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
            } ${disabled ? 'cursor-not-allowed opacity-55 hover:translate-y-0 hover:shadow-none' : ''}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  estructuraType === 'multi'
                    ? 'border-blue-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                {estructuraType === 'multi' && (
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                )}
              </div>
              <span className={`font-semibold ${
                estructuraType === 'multi'
                  ? 'text-gray-950 dark:text-white'
                  : 'text-gray-800 dark:text-gray-200'
              }`}>
                {structure.mode.multiTitle}
              </span>
              {estructuraType === 'multi' ? (
                <Badge className="bg-blue-600 text-white dark:bg-blue-500">
                  {structure.mode.selected}
                </Badge>
              ) : null}
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
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700/30 text-center">
            <p className="text-sm text-blue-700 dark:text-blue-400">
              {structure.mode.switchPrompt}{' '}
              <button
                type="button"
                onClick={() => {
                  if (!disabled) {
                    onEstructuraTypeChange('multi');
                  }
                }}
                disabled={disabled}
                className="font-semibold hover:underline disabled:cursor-not-allowed disabled:opacity-60"
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
