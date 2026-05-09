import { useEffect, useMemo, useRef, useState } from 'react';
import type { ICity, IState } from 'country-state-city';
import { cn } from './ui/utils';

const inputClassName =
  'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all';
const labelClassName = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2';

export interface ManualLocationValues {
  ciudad: string;
  estado: string;
  pais: string;
  cp: string;
}

interface ManualLocationFieldsProps {
  values: ManualLocationValues;
  countries: Array<{
    value: string;
    label: string;
  }>;
  labels: {
    country: string;
    selectCountry: string;
    city: string;
    state: string;
    postalCode: string;
  };
  placeholders: {
    city: string;
    state: string;
    postalCode: string;
  };
  onChange: (updates: Partial<ManualLocationValues>) => void;
  fieldNames?: Partial<Record<keyof ManualLocationValues, string>>;
  stateDropdownCountryCodes?: readonly string[];
  countryError?: string;
  disabled?: boolean;
  controlClassName?: string;
  labelClassName?: string;
}

type PostalCodeRule = {
  format: string;
  message: string;
  normalize: (value: string) => string;
  pattern: RegExp;
};

type LocationDataset = typeof import('country-state-city');

type SuggestionOption = {
  value: string;
  label: string;
  detail?: string;
};

const postalCodeRules: Record<string, PostalCodeRule> = {
  AR: {
    format: 'C1000AAA or 1000',
    message: 'Postal code must be 4 digits or CPA format like C1000AAA.',
    normalize: (value) => value.trim().toUpperCase(),
    pattern: /^(?:[A-Z]\d{4}[A-Z]{3}|\d{4})$/,
  },
  BR: {
    format: '00000-000',
    message: 'Postal code must use Brazilian CEP format, for example 01001-000.',
    normalize: (value) => {
      const digits = value.replace(/\D/g, '');
      return digits.length === 8 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : value.trim();
    },
    pattern: /^\d{5}-?\d{3}$/,
  },
  CA: {
    format: 'A1A 1A1',
    message: 'Postal code must use Canadian format, for example M5V 2T6.',
    normalize: (value) => {
      const compact = value.replace(/\s+/g, '').toUpperCase();
      return compact.length === 6 ? `${compact.slice(0, 3)} ${compact.slice(3)}` : value.trim().toUpperCase();
    },
    pattern: /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][ -]?\d[ABCEGHJ-NPRSTV-Z]\d$/i,
  },
  CL: {
    format: '0000000',
    message: 'Postal code must be 7 digits.',
    normalize: (value) => value.replace(/\D/g, ''),
    pattern: /^\d{7}$/,
  },
  CO: {
    format: '000000',
    message: 'Postal code must be 6 digits.',
    normalize: (value) => value.replace(/\D/g, ''),
    pattern: /^\d{6}$/,
  },
  ES: {
    format: '01000-52999',
    message: 'Postal code must be 5 digits with a valid Spanish province prefix.',
    normalize: (value) => value.replace(/\D/g, ''),
    pattern: /^(?:0[1-9]|[1-4]\d|5[0-2])\d{3}$/,
  },
  MX: {
    format: '00000',
    message: 'Postal code must be 5 digits.',
    normalize: (value) => value.replace(/\D/g, ''),
    pattern: /^\d{5}$/,
  },
  US: {
    format: '00000 or 00000-0000',
    message: 'ZIP code must be 5 digits or ZIP+4 format.',
    normalize: (value) => value.trim(),
    pattern: /^\d{5}(?:-\d{4})?$/,
  },
};

const normalizeComparableText = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const uniqueCities = (cities: ICity[]) => {
  const seen = new Set<string>();
  return cities.filter((city) => {
    const key = `${normalizeComparableText(city.name)}::${city.stateCode}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const findSelectedState = (states: IState[], stateValue: string) => {
  const normalizedState = normalizeComparableText(stateValue);
  if (!normalizedState) {
    return undefined;
  }

  const exactMatch = states.find((state) =>
    normalizeComparableText(state.name) === normalizedState
    || normalizeComparableText(state.isoCode) === normalizedState
  );
  if (exactMatch) {
    return exactMatch;
  }

  const prefixMatches = states.filter((state) =>
    normalizeComparableText(state.name).startsWith(normalizedState)
    || normalizeComparableText(state.isoCode).startsWith(normalizedState)
  );

  return prefixMatches.length === 1 ? prefixMatches[0] : undefined;
};

const filterSuggestionOptions = (options: SuggestionOption[], query: string) => {
  const normalizedQuery = normalizeComparableText(query);
  if (!normalizedQuery) {
    return options.slice(0, 80);
  }

  return options
    .filter((option) =>
      normalizeComparableText(option.label).includes(normalizedQuery)
      || normalizeComparableText(option.detail ?? '').includes(normalizedQuery)
    )
    .slice(0, 80);
};

export const normalizePostalCodeForCountry = (country: string, postalCode: string) => {
  const rule = postalCodeRules[country.trim().toUpperCase()];
  return rule ? rule.normalize(postalCode) : postalCode.trim();
};

export const getPostalCodeFormatForCountry = (country: string) =>
  postalCodeRules[country.trim().toUpperCase()]?.format ?? '';

export const validatePostalCodeForCountry = (
  country: string,
  postalCode: string,
): { ok: true; normalized: string } | { ok: false; message: string } => {
  const trimmedPostalCode = postalCode.trim();
  if (!trimmedPostalCode) {
    return { ok: true, normalized: '' };
  }

  const normalizedCountry = country.trim().toUpperCase();
  const rule = postalCodeRules[normalizedCountry];
  if (!rule) {
    return { ok: true, normalized: trimmedPostalCode };
  }

  const normalizedPostalCode = rule.normalize(trimmedPostalCode);
  if (!rule.pattern.test(normalizedPostalCode)) {
    return { ok: false, message: rule.message };
  }

  return { ok: true, normalized: normalizedPostalCode };
};

export function ManualLocationFields({
  values,
  countries,
  labels,
  placeholders,
  onChange,
  fieldNames,
  stateDropdownCountryCodes,
  countryError,
  disabled = false,
  controlClassName,
  labelClassName: customLabelClassName,
}: ManualLocationFieldsProps) {
  const [locationDataset, setLocationDataset] = useState<LocationDataset | null>(null);
  const normalizedCountry = values.pais.trim().toUpperCase();

  useEffect(() => {
    let isActive = true;

    void import('country-state-city').then((dataset) => {
      if (isActive) {
        setLocationDataset(dataset);
      }
    });

    return () => {
      isActive = false;
    };
  }, []);

  const stateOptions = useMemo(
    () => locationDataset?.State.getStatesOfCountry(normalizedCountry) ?? [],
    [locationDataset, normalizedCountry],
  );
  const selectedState = useMemo(
    () => findSelectedState(stateOptions, values.estado),
    [stateOptions, values.estado],
  );
  const cityOptions = useMemo(() => {
    if (!normalizedCountry) {
      return [];
    }

    if (!locationDataset) {
      return [];
    }

    if (values.estado.trim() && !selectedState) {
      return [];
    }

    const cities = selectedState
      ? locationDataset.City.getCitiesOfState(normalizedCountry, selectedState.isoCode)
      : locationDataset.City.getCitiesOfCountry(normalizedCountry) ?? [];

    return uniqueCities(cities).sort((left, right) =>
      left.name.localeCompare(right.name) || left.stateCode.localeCompare(right.stateCode),
    );
  }, [locationDataset, normalizedCountry, selectedState, values.estado]);
  const stateSuggestionOptions = useMemo(
    () => stateOptions.map((state) => ({
      value: state.name,
      label: state.name,
      detail: state.isoCode,
    })),
    [stateOptions],
  );
  const citySuggestionOptions = useMemo(
    () => cityOptions.map((city) => ({
      value: city.name,
      label: city.name,
      detail: selectedState ? undefined : city.stateCode,
    })),
    [cityOptions, selectedState],
  );
  const postalValidation = validatePostalCodeForCountry(values.pais, values.cp);
  const postalFormat = getPostalCodeFormatForCountry(values.pais);
  const resolvedFieldNames = {
    pais: fieldNames?.pais ?? 'pais',
    estado: fieldNames?.estado ?? 'estado',
    ciudad: fieldNames?.ciudad ?? 'ciudad',
    cp: fieldNames?.cp ?? 'cp',
  };
  const stateDropdownCountries = useMemo(
    () => new Set((stateDropdownCountryCodes ?? []).map((countryCode) => countryCode.trim().toUpperCase())),
    [stateDropdownCountryCodes],
  );
  const usesStateDropdown = stateDropdownCountries.has(normalizedCountry) && stateOptions.length > 0;
  const resolvedControlClassName = controlClassName ?? inputClassName;
  const resolvedLabelClassName = customLabelClassName ?? labelClassName;

  return (
    <div className="space-y-3">
      <div>
        <label className={resolvedLabelClassName}>
          {labels.country}
        </label>
        <select
          name={resolvedFieldNames.pais}
          value={values.pais}
          onChange={(event) => onChange({
            pais: event.target.value,
            estado: '',
            ciudad: '',
            cp: '',
          })}
          className={cn(resolvedControlClassName, 'appearance-none cursor-pointer')}
          disabled={disabled}
        >
          <option value="">{labels.selectCountry}</option>
          {countries.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {countryError ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{countryError}</p> : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          {usesStateDropdown ? (
            <>
              <label className={resolvedLabelClassName}>
                {labels.state}
              </label>
              <select
                name={resolvedFieldNames.estado}
                value={selectedState?.name ?? values.estado}
                onChange={(event) => onChange({ estado: event.target.value, ciudad: '' })}
                className={cn(resolvedControlClassName, 'appearance-none cursor-pointer')}
                disabled={disabled || !normalizedCountry || !locationDataset}
              >
                <option value="">{placeholders.state}</option>
                {stateOptions.map((state) => (
                  <option key={state.isoCode} value={state.name}>
                    {state.name}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <AutocompleteInput
              label={labels.state}
              name={resolvedFieldNames.estado}
              value={values.estado}
              placeholder={placeholders.state}
              options={stateSuggestionOptions}
              minQueryLength={1}
              onChange={(value) => onChange({ estado: value, ciudad: '' })}
              onSelect={(value) => onChange({ estado: value, ciudad: '' })}
              disabled={disabled || !normalizedCountry || !locationDataset}
              controlClassName={resolvedControlClassName}
              labelClassName={resolvedLabelClassName}
            />
          )}
        </div>

        <div>
          <AutocompleteInput
            label={labels.city}
            name={resolvedFieldNames.ciudad}
            value={values.ciudad}
            placeholder={placeholders.city}
            options={citySuggestionOptions}
            onChange={(value) => onChange({ ciudad: value })}
            onSelect={(value) => onChange({ ciudad: value })}
            disabled={disabled || !normalizedCountry || !locationDataset}
            controlClassName={resolvedControlClassName}
            labelClassName={resolvedLabelClassName}
          />
        </div>

        <div>
          <label className={resolvedLabelClassName}>
            {labels.postalCode}
          </label>
          <input
            type="text"
            name={resolvedFieldNames.cp}
            value={values.cp}
            onBlur={() => onChange({ cp: normalizePostalCodeForCountry(values.pais, values.cp) })}
            onChange={(event) => onChange({ cp: event.target.value })}
            placeholder={postalFormat || placeholders.postalCode}
            className={cn(
              resolvedControlClassName,
              !postalValidation.ok && 'border-red-500 focus:ring-red-500',
            )}
            disabled={disabled || !normalizedCountry}
          />
          {values.cp.trim() && 'message' in postalValidation ? (
            <p className="mt-1 text-xs text-red-600 dark:text-red-300">
              {postalValidation.message}
            </p>
          ) : postalFormat ? (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Format: {postalFormat}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AutocompleteInput({
  label,
  name,
  value,
  placeholder,
  options,
  onChange,
  onSelect,
  minQueryLength = 2,
  disabled,
  controlClassName,
  labelClassName: customLabelClassName,
}: {
  label: string;
  name: string;
  value: string;
  placeholder: string;
  options: SuggestionOption[];
  onChange: (value: string) => void;
  onSelect: (value: string) => void;
  minQueryLength?: number;
  disabled?: boolean;
  controlClassName?: string;
  labelClassName?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const blurTimeoutRef = useRef<number | null>(null);
  const visibleOptions = useMemo(
    () => filterSuggestionOptions(options, value),
    [options, value],
  );
  const shouldShowOptions = isOpen && !disabled && value.trim().length >= minQueryLength && visibleOptions.length > 0;

  const handleBlur = () => {
    blurTimeoutRef.current = window.setTimeout(() => setIsOpen(false), 120);
  };

  const handleFocus = () => {
    if (blurTimeoutRef.current !== null) {
      window.clearTimeout(blurTimeoutRef.current);
    }
    setIsOpen(true);
  };

  const handleSelect = (nextValue: string) => {
    onSelect(nextValue);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <label className={customLabelClassName ?? labelClassName}>
        {label}
      </label>
      <input
        type="text"
        name={name}
        value={value}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onChange={(event) => {
          onChange(event.target.value);
          setIsOpen(true);
        }}
        placeholder={placeholder}
        className={controlClassName ?? inputClassName}
        autoComplete="off"
        disabled={disabled}
      />
      {shouldShowOptions ? (
        <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {visibleOptions.map((option) => (
            <button
              key={`${option.detail ?? ''}-${option.value}`}
              type="button"
              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
              onMouseDown={(event) => {
                event.preventDefault();
                handleSelect(option.value);
              }}
            >
              <span className="truncate">{option.label}</span>
              {option.detail ? (
                <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                  {option.detail}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
