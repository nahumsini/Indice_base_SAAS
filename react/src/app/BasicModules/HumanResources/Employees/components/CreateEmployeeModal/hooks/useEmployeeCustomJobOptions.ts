import { useState } from 'react';
import {
  loadCustomJobOptions,
  mergeTextOptions,
  normalizeOptionLabel,
  saveCustomJobOptions,
} from '../model';
import type {
  CustomJobOptionKind,
  CustomJobOptions,
  EmployeeFormData,
} from '../types';

interface PersistCurrentJobOptionsParams {
  allPositionOptions: string[];
  departmentOptions: string[];
}

export function useEmployeeCustomJobOptions() {
  const [customJobOptions, setCustomJobOptions] = useState<CustomJobOptions>(() => loadCustomJobOptions());

  const addCustomJobOption = (
    kind: CustomJobOptionKind,
    value: string,
    baseOptions: string[],
  ) => {
    const normalizedValue = normalizeOptionLabel(value);
    if (!normalizedValue) {
      return false;
    }

    const existingOptions = mergeTextOptions(baseOptions, customJobOptions[kind]);
    const optionAlreadyExists = existingOptions.some(
      (option) => option.toLocaleLowerCase() === normalizedValue.toLocaleLowerCase(),
    );

    if (optionAlreadyExists) {
      return false;
    }

    let didAddOption = false;
    setCustomJobOptions((current) => {
      const nextOptions = mergeTextOptions(current[kind], [normalizedValue]);
      didAddOption = nextOptions.length !== current[kind].length;
      const next = {
        ...current,
        [kind]: nextOptions,
      };
      saveCustomJobOptions(next);
      return next;
    });

    return didAddOption;
  };

  const persistCurrentJobOptions = (
    data: EmployeeFormData,
    { allPositionOptions, departmentOptions }: PersistCurrentJobOptionsParams,
  ) => {
    addCustomJobOption('departments', data.department, departmentOptions);
    addCustomJobOption('positions', data.position, allPositionOptions);
  };

  return {
    addCustomJobOption,
    customJobOptions,
    persistCurrentJobOptions,
  };
}
