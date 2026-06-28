import { useCallback, useEffect, useState } from 'react';
import {
  humanResourcesApi,
  type BackendHrUser,
} from '../../../../api/humanResources';
import type { EmployeesTranslations } from '../translations';
import type {
  EmployeeViewModel,
  InlineEditableEmployeeField,
  InlineEmployeeUpdateOverrides,
} from '../types/employees.types';
import {
  normalizeErrorMessage,
  parseForeignKeyValue,
} from '../utils/employees.utils';

const buildInlineEmployeePayload = (
  employee: EmployeeViewModel,
  overrides: InlineEmployeeUpdateOverrides,
) => {
  const nextPosition = (overrides.position ?? employee.position).trim();
  const nextDepartment = (overrides.department ?? employee.department).trim();
  const nextUnitId = overrides.unitId ?? employee.unitId;
  const nextBusinessId = overrides.businessId ?? employee.businessId;
  const parsedUnitId = parseForeignKeyValue(nextUnitId);
  const parsedBusinessId = parseForeignKeyValue(nextBusinessId);
  const salary = employee.salaryType === 'hourly' ? '' : String(employee.salary ?? 0);
  const hourlyRate = employee.salaryType === 'hourly' ? String(employee.hourlyRate ?? 0) : '';
  const workdayHours = String(employee.workdayHours ?? 8);
  const workdaysPerWeek = String(employee.workdaysPerWeek ?? 5);

  if (!nextPosition || !nextDepartment || !parsedUnitId || !parsedBusinessId) {
    return null;
  }

  return {
    first_name: employee.firstName.trim(),
    last_name: employee.lastName.trim(),
    email: employee.email.trim(),
    phone: employee.phone.trim(),
    position: nextPosition,
    department: nextDepartment,
    unit_id: parsedUnitId,
    business_id: parsedBusinessId,
    hire_date: employee.joinDate,
    salary,
    pay_period: employee.payPeriod,
    salary_type: employee.salaryType,
    hourly_rate: hourlyRate,
    contract_type: employee.contractType,
    contract_start_date: employee.contractStartDate,
    contract_end_date: employee.contractEndDate,
    user_code: employee.code.trim(),
    employee: {
      user_code: employee.code.trim(),
      first_name: employee.firstName.trim(),
      last_name: employee.lastName.trim(),
      email: employee.email.trim(),
      phone: employee.phone.trim(),
      position: nextPosition,
      department: nextDepartment,
      unit_id: parsedUnitId,
      business_id: parsedBusinessId,
      hire_date: employee.joinDate,
      salary,
      pay_period: employee.payPeriod,
      salary_type: employee.salaryType,
      hourly_rate: hourlyRate,
      contract_type: employee.contractType,
      contract_start_date: employee.contractStartDate,
      contract_end_date: employee.contractEndDate,
    },
    date_of_birth: employee.dateOfBirth,
    address: employee.address.trim(),
    national_id: employee.nationalId.trim(),
    tax_id: employee.taxId.trim(),
    social_security_number: employee.socialSecurityNumber.trim(),
    registration_country: employee.registrationCountry,
    state_province: employee.stateProvince.trim(),
    city: employee.city.trim(),
    postal_code: employee.postalCode.trim(),
    alternate_phone: employee.alternatePhone.trim(),
    emergency_contact_name: employee.emergencyContactName.trim(),
    emergency_contact_relationship: employee.emergencyContactRelationship.trim(),
    emergency_contact_phone: employee.emergencyContactPhone.trim(),
    workday_hours: workdayHours,
    workdays_per_week: workdaysPerWeek,
    profile: {
      date_of_birth: employee.dateOfBirth,
      address: employee.address.trim(),
      national_id: employee.nationalId.trim(),
      tax_id: employee.taxId.trim(),
      social_security_number: employee.socialSecurityNumber.trim(),
      registration_country: employee.registrationCountry,
      state_province: employee.stateProvince.trim(),
      city: employee.city.trim(),
      postal_code: employee.postalCode.trim(),
      alternate_phone: employee.alternatePhone.trim(),
      emergency_contact_name: employee.emergencyContactName.trim(),
      emergency_contact_relationship: employee.emergencyContactRelationship.trim(),
      emergency_contact_phone: employee.emergencyContactPhone.trim(),
      workday_hours: workdayHours,
      workdays_per_week: workdaysPerWeek,
    },
    status: employee.status,
  };
};

const hasInlineEmployeeChanges = (
  employee: EmployeeViewModel,
  overrides: InlineEmployeeUpdateOverrides,
) => {
  const nextUnitId = overrides.unitId ?? employee.unitId;
  const nextBusinessId = overrides.businessId ?? employee.businessId;
  const nextDepartment = overrides.department ?? employee.department;
  const nextPosition = overrides.position ?? employee.position;

  return nextUnitId !== employee.unitId
    || nextBusinessId !== employee.businessId
    || nextDepartment !== employee.department
    || nextPosition !== employee.position;
};

export function useEmployeeInlineEditing({
  copy,
  employees,
  refreshEmployees,
  replaceEmployee,
  setFailureToastMessage,
  setSuccessToastMessage,
}: {
  copy: EmployeesTranslations;
  employees: EmployeeViewModel[];
  refreshEmployees: () => Promise<void>;
  replaceEmployee: (employee: BackendHrUser) => void;
  setFailureToastMessage: (message: string) => void;
  setSuccessToastMessage: (message: string) => void;
}) {
  const [inlineSavingKey, setInlineSavingKey] = useState<string | null>(null);
  const [inlineDrafts, setInlineDrafts] = useState<Record<number, InlineEmployeeUpdateOverrides>>({});

  useEffect(() => {
    setInlineDrafts((currentDrafts) => {
      const employeeIds = new Set(employees.map((employee) => employee.id));
      const nextDrafts = Object.fromEntries(
        Object.entries(currentDrafts).filter(([employeeId]) => employeeIds.has(Number(employeeId))),
      );

      return Object.keys(nextDrafts).length === Object.keys(currentDrafts).length ? currentDrafts : nextDrafts;
    });
  }, [employees]);

  const handleInlineEmployeeUpdate = useCallback(async (
    employee: EmployeeViewModel,
    field: InlineEditableEmployeeField,
    overrides: InlineEmployeeUpdateOverrides,
  ) => {
    const nextDraft = {
      ...(inlineDrafts[employee.id] ?? {}),
      ...overrides,
    };

    setInlineDrafts((currentDrafts) => ({
      ...currentDrafts,
      [employee.id]: nextDraft,
    }));
    setFailureToastMessage('');

    const payload = buildInlineEmployeePayload(employee, nextDraft);
    if (!payload) {
      return;
    }

    if (!hasInlineEmployeeChanges(employee, nextDraft)) {
      return;
    }

    const savingKey = `${employee.id}:${field}`;
    setInlineSavingKey(savingKey);
    setFailureToastMessage('');

    try {
      const savedEmployee = await humanResourcesApi.updateHrUser(employee.id, payload);
      replaceEmployee(savedEmployee);
      setSuccessToastMessage(copy.successMessages.updated);
      setInlineDrafts((currentDrafts) => {
        const nextDrafts = { ...currentDrafts };
        delete nextDrafts[employee.id];
        return nextDrafts;
      });
      await refreshEmployees();
    } catch (error) {
      setFailureToastMessage(normalizeErrorMessage(error, copy.errorMessages.save));
    } finally {
      setInlineSavingKey(null);
    }
  }, [
    copy.errorMessages.save,
    copy.successMessages.updated,
    inlineDrafts,
    refreshEmployees,
    replaceEmployee,
    setFailureToastMessage,
    setSuccessToastMessage,
  ]);

  const handleBulkEmployeeUpdate = useCallback(async (
    selectedEmployees: EmployeeViewModel[],
    field: InlineEditableEmployeeField,
    overrides: InlineEmployeeUpdateOverrides,
  ) => {
    const employeesToUpdate = selectedEmployees.filter((employee) =>
      hasInlineEmployeeChanges(employee, overrides),
    );

    if (employeesToUpdate.length === 0) {
      return;
    }

    const payloads = employeesToUpdate.map((employee) => ({
      employee,
      payload: buildInlineEmployeePayload(employee, overrides),
    }));

    if (payloads.some(({ payload }) => !payload)) {
      setFailureToastMessage(copy.bulk.updateError);
      return;
    }

    setInlineSavingKey(`bulk:${field}`);
    setFailureToastMessage('');

    try {
      const savedEmployees = await Promise.all(
        payloads.map(({ employee, payload }) =>
          humanResourcesApi.updateHrUser(employee.id, payload!),
        ),
      );

      savedEmployees.forEach(replaceEmployee);
      setSuccessToastMessage(copy.bulk.updateSuccess(savedEmployees.length));
      setInlineDrafts((currentDrafts) => {
        const nextDrafts = { ...currentDrafts };
        employeesToUpdate.forEach((employee) => {
          delete nextDrafts[employee.id];
        });
        return nextDrafts;
      });
      await refreshEmployees();
    } catch (error) {
      setFailureToastMessage(normalizeErrorMessage(error, copy.bulk.updateError));
    } finally {
      setInlineSavingKey(null);
    }
  }, [
    copy.bulk,
    refreshEmployees,
    replaceEmployee,
    setFailureToastMessage,
    setSuccessToastMessage,
  ]);

  return {
    handleBulkEmployeeUpdate,
    handleInlineEmployeeUpdate,
    inlineDrafts,
    inlineSavingKey,
  };
}
