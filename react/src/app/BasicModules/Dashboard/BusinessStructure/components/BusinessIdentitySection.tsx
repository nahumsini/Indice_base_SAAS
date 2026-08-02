import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useLanguage } from '../../../../shared/context';
import { PROFILE_COUNTRY_OPTIONS } from '../../../../shared/profileCountries';
import { inputClassName, textareaClassName } from '../constants';
import type { BusinessAddressFormValues, EstructuraType, LocationCoordinateFormValues } from '../types';
import { LocationCoordinateFields } from './LocationCoordinateFields';

type CountryConfig = {
  hasStates: boolean;
  taxIdLabel: string | null;
  taxIdFormat: RegExp | null;
};

const countryConfig: Record<string, CountryConfig> = {
  MX: { hasStates: true, taxIdLabel: 'RFC', taxIdFormat: null },
  US: { hasStates: true, taxIdLabel: 'EIN', taxIdFormat: null },
  CA: { hasStates: true, taxIdLabel: 'BN', taxIdFormat: null },
  CO: { hasStates: true, taxIdLabel: 'NIT', taxIdFormat: null },
  BR: { hasStates: true, taxIdLabel: 'CNPJ', taxIdFormat: null },
};
const priorityCountryCodes = ['CA', 'US', 'MX', 'CO', 'BR'] as const;

type StateDataset = typeof import('country-state-city/lib/state');

const countryOptionsSource = PROFILE_COUNTRY_OPTIONS;

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
    selectCountry: string;
    industryHint: string;
    logo: string;
    logoHolding: string;
    uploadImage: string;
    noFileSelected: string;
    uploadHint: string;
    removeLogo: string;
    description: string;
    address: string;
    country: string;
    state: string;
    city: string;
    postalCode: string;
    optional: string;
    logoPreviewAlt: string;
  };
  headquarters: {
    helper: string;
    context: string;
    basicInfo: string;
    industryHelper: string;
    locationTitle: string;
    locationHelper: string;
    addressTitle: string;
    addressHelper: string;
    addressNote: string;
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
  logo: string;
  industry: string;
  description: string;
  businessAddress: BusinessAddressFormValues;
  locationCoordinateValues: LocationCoordinateFormValues;
  onCompanyNameChange: (value: string) => void;
  onLogoChange: (value: string) => void;
  onIndustryChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onBusinessAddressChange: (updates: Partial<BusinessAddressFormValues>) => void;
  onLocationCoordinateChange: (updates: Partial<LocationCoordinateFormValues>) => void;
  disabled?: boolean;
}

export function BusinessIdentitySection({
  estructuraType,
  structure,
  companyName,
  logo,
  industry,
  description,
  businessAddress,
  locationCoordinateValues,
  onCompanyNameChange,
  onLogoChange,
  onIndustryChange,
  onDescriptionChange,
  onBusinessAddressChange,
  onLocationCoordinateChange,
  disabled = false,
}: BusinessIdentitySectionProps) {
  const { currentLanguage } = useLanguage();
  const [stateDataset, setStateDataset] = useState<StateDataset | null>(null);
  const companyNameLabel = estructuraType === 'simple'
    ? structure.fields.companyName
    : structure.fields.holdingName;
  const logoLabel = estructuraType === 'simple'
    ? structure.fields.logo
    : structure.fields.logoHolding;
  const countryOptions = useMemo(() => {
    let countryDisplayNames: Intl.DisplayNames | null = null;

    try {
      countryDisplayNames = new Intl.DisplayNames([currentLanguage.code], { type: 'region' });
    } catch {
      countryDisplayNames = null;
    }

    const options = countryOptionsSource
      .map((country) => {
        const countryName = countryDisplayNames?.of(country.code) ?? country.fallbackName;

        return {
          code: country.code,
          label: `${country.flag} ${countryName}`,
          sortName: countryName,
        };
      })
      .sort((firstCountry, secondCountry) => (
        firstCountry.sortName.localeCompare(secondCountry.sortName, currentLanguage.code)
      ));
    const priorityCodes = new Set<string>(priorityCountryCodes);
    const priorityOptions = priorityCountryCodes
      .map((countryCode) => options.find((country) => country.code === countryCode))
      .filter((country): country is typeof options[number] => Boolean(country));
    const remainingOptions = options.filter((country) => !priorityCodes.has(country.code));

    return [...priorityOptions, ...remainingOptions];
  }, [currentLanguage.code]);

  useEffect(() => {
    if (!countryConfig[businessAddress.country]?.hasStates) {
      setStateDataset(null);
      return undefined;
    }

    let isActive = true;

    void import('country-state-city/lib/state').then((dataset) => {
      if (isActive) {
        setStateDataset(dataset);
      }
    });

    return () => {
      isActive = false;
    };
  }, [businessAddress.country]);

  const stateOptions = useMemo(() => {
    if (!stateDataset || !countryConfig[businessAddress.country]?.hasStates) {
      return [];
    }

    return stateDataset.getStatesOfCountry(businessAddress.country)
      .map((state) => ({
        code: state.isoCode,
        name: state.name,
      }))
      .sort((firstState, secondState) => (
        firstState.name.localeCompare(secondState.name, currentLanguage.code)
      ));
  }, [businessAddress.country, currentLanguage.code, stateDataset]);
  const usesStateDropdown = Boolean(countryConfig[businessAddress.country]?.hasStates && stateOptions.length > 0);

  const handleAddressCountryChange = (country: string) => {
    onBusinessAddressChange({
      country,
      state: '',
    });
  };

  const handleLogoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      onLogoChange(String(reader.result ?? ''));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      key={`identity-${estructuraType}`}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6"
    >
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-5">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          {estructuraType === 'simple' ? structure.identity.simple : structure.identity.holding}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {structure.headquarters.helper}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
          {structure.headquarters.context}
        </p>
      </div>

      {estructuraType === 'multi' && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-5 border border-blue-200 dark:border-blue-700/30">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>{structure.identity.holdingNotice}</strong>
          </p>
        </div>
      )}

      <h4 className="mb-3 text-sm font-medium text-gray-900 dark:text-white">
        {structure.headquarters.basicInfo}
      </h4>

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
            disabled={disabled}
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
            disabled={disabled}
          >
            <option value="">{structure.fields.selectIndustry}</option>
            {structure.options.businessIdentityIndustries.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
            {structure.headquarters.industryHelper}
          </p>
        </div>
      </div>

      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {logoLabel}
        </label>
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          {logo ? (
            <img
              src={logo}
              alt={structure.fields.logoPreviewAlt}
              className="h-20 w-20 rounded-lg border-2 border-gray-200 object-cover dark:border-gray-600"
            />
          ) : null}

          <div className="flex flex-col items-start gap-2">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <label
                className={`px-4 py-2 bg-white dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-500 rounded-lg text-sm text-gray-700 dark:text-gray-300 font-medium transition-all ${
                  disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                }`}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={disabled}
                  className="sr-only"
                />
                {structure.fields.uploadImage}
              </label>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {logo ? structure.fields.logoPreviewAlt : structure.fields.noFileSelected}
              </span>
            </div>
            {logo ? (
              <button
                type="button"
                onClick={() => onLogoChange('')}
                disabled={disabled}
                className="text-xs text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-400"
              >
                {structure.fields.removeLogo}
              </button>
            ) : null}
          </div>
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
          disabled={disabled}
        />
      </div>

      <div className="mt-5">
        <h4 className="mb-3 text-sm font-medium text-gray-900 dark:text-white">
          {structure.headquarters.locationTitle}
        </h4>
        <p className="mb-3 text-xs text-gray-500 dark:text-gray-500">
          {structure.headquarters.locationHelper}
        </p>
        <div className="mb-5 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/40">
          <h5 className="text-sm font-medium text-gray-900 dark:text-white">
            {structure.headquarters.addressTitle}
          </h5>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
            {structure.headquarters.addressHelper}
          </p>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {structure.fields.address}
              </label>
              <input
                type="text"
                value={businessAddress.street}
                onChange={(event) => onBusinessAddressChange({ street: event.target.value })}
                className={inputClassName}
                disabled={disabled}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {structure.fields.country}
              </label>
              <select
                value={businessAddress.country}
                onChange={(event) => handleAddressCountryChange(event.target.value)}
                className={`${inputClassName} appearance-none cursor-pointer`}
                disabled={disabled}
              >
                <option value="">{structure.fields.selectCountry}</option>
                {countryOptions.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {structure.fields.state}
              </label>
              {usesStateDropdown ? (
                <select
                  value={businessAddress.state}
                  onChange={(event) => onBusinessAddressChange({ state: event.target.value })}
                  className={`${inputClassName} appearance-none cursor-pointer`}
                  disabled={disabled}
                >
                  <option value="">{structure.fields.state}</option>
                  {stateOptions.map((state) => (
                    <option key={state.code} value={state.code}>
                      {state.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={businessAddress.state}
                  onChange={(event) => onBusinessAddressChange({ state: event.target.value })}
                  className={inputClassName}
                  disabled={disabled}
                />
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {structure.fields.city}
              </label>
              <input
                type="text"
                value={businessAddress.city}
                onChange={(event) => onBusinessAddressChange({ city: event.target.value })}
                className={inputClassName}
                disabled={disabled}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {structure.fields.postalCode}
              </label>
              <input
                type="text"
                value={businessAddress.zip}
                onChange={(event) => onBusinessAddressChange({ zip: event.target.value })}
                className={inputClassName}
                disabled={disabled}
              />
            </div>
          </div>

          <p className="mt-3 text-xs text-gray-500 dark:text-gray-500">
            {structure.headquarters.addressNote}
          </p>
        </div>
        <LocationCoordinateFields
          values={locationCoordinateValues}
          onChange={onLocationCoordinateChange}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
