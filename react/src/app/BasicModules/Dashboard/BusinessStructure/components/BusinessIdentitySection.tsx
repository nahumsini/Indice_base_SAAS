import { inputClassName, textareaClassName } from '../constants';
import type { EstructuraType } from '../types';

interface StructureCopy {
  identity: {
    simple: string;
    simpleDesc: string;
    holding: string;
    holdingDesc: string;
    holdingNotice: string;
  };
  fields: {
    companyName: string;
    holdingName: string;
    industry: string;
    selectIndustry: string;
    industryHint: string;
    logo: string;
    logoHolding: string;
    uploadImage: string;
    noFileSelected: string;
    uploadHint: string;
    removeLogo: string;
    description: string;
    optional: string;
    logoPreviewAlt: string;
  };
  options: {
    businessIdentityIndustries: Array<{
      value: string;
      label: string;
    }>;
  };
}

interface BusinessIdentitySectionProps {
  estructuraType: EstructuraType;
  structure: StructureCopy;
  companyName: string;
  industry: string;
  description: string;
  onCompanyNameChange: (value: string) => void;
  onIndustryChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
}

export function BusinessIdentitySection({
  estructuraType,
  structure,
  companyName,
  industry,
  description,
  onCompanyNameChange,
  onIndustryChange,
  onDescriptionChange,
}: BusinessIdentitySectionProps) {
  const companyNameLabel = estructuraType === 'simple'
    ? structure.fields.companyName
    : structure.fields.holdingName;
  const logoLabel = estructuraType === 'simple'
    ? structure.fields.logo
    : structure.fields.logoHolding;

  return (
    <div
      key={`identity-${estructuraType}`}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6"
    >
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-5">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {estructuraType === 'simple' ? structure.identity.simple : structure.identity.holding}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {estructuraType === 'simple'
            ? structure.identity.simpleDesc
            : structure.identity.holdingDesc}
        </p>
      </div>

      {estructuraType === 'multi' && (
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 mb-5 border border-purple-200 dark:border-purple-700/30">
          <p className="text-sm text-purple-800 dark:text-purple-300">
            <strong>{structure.identity.holdingNotice}</strong>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {companyNameLabel}
          </label>
          <input
            type="text"
            value={companyName}
            onChange={(event) => onCompanyNameChange(event.target.value)}
            className={inputClassName}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {structure.fields.industry}
          </label>
          <select
            className={`${inputClassName} appearance-none cursor-pointer`}
            value={industry}
            onChange={(event) => onIndustryChange(event.target.value)}
          >
            <option value="">{structure.fields.selectIndustry}</option>
            {structure.options.businessIdentityIndustries.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
            {structure.fields.industryHint}
          </p>
        </div>
      </div>

      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {logoLabel}
        </label>
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <button className="px-4 py-2 bg-white dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-purple-500 dark:hover:border-purple-500 rounded-lg text-sm text-gray-700 dark:text-gray-300 font-medium transition-all">
            {structure.fields.uploadImage}
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {structure.fields.noFileSelected}
          </span>
        </div>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">{structure.fields.uploadHint}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {structure.fields.description}{' '}
          <span className="text-xs text-gray-500">{structure.fields.optional}</span>
        </label>
        <textarea
          rows={4}
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          className={textareaClassName}
        />
      </div>
    </div>
  );
}
