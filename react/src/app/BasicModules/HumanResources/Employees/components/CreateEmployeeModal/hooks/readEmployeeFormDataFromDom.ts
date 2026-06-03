import { resolveProfileCountry } from '../../../../../../shared/profileCountries';
import { normalizePhoneInputForCountry } from '../../../../../../shared/validation/phone';
import type { EmployeeFormData } from '../types';

const readDomValue = (nativeFormData: FormData, field: keyof EmployeeFormData) => {
  const value = nativeFormData.get(String(field));
  return typeof value === 'string' ? value : '';
};

const hasDomField = (formElement: HTMLFormElement, field: keyof EmployeeFormData) =>
  Boolean(formElement.elements.namedItem(String(field)));

export function readEmployeeFormDataFromDom(
  formElement: HTMLFormElement,
  currentFormData: EmployeeFormData,
): EmployeeFormData {
  const nativeFormData = new FormData(formElement);
  const nextCountryValue = readDomValue(nativeFormData, 'registrationCountry') || currentFormData.registrationCountry;
  const nextCountry = resolveProfileCountry(nextCountryValue);
  const normalizePhone = (value: string) => (
    nextCountry ? normalizePhoneInputForCountry(value, nextCountry) : value
  );

  return {
    ...currentFormData,
    employeeNumber: readDomValue(nativeFormData, 'employeeNumber') || currentFormData.employeeNumber,
    firstName: readDomValue(nativeFormData, 'firstName') || currentFormData.firstName,
    lastName: readDomValue(nativeFormData, 'lastName') || currentFormData.lastName,
    email: readDomValue(nativeFormData, 'email') || currentFormData.email,
    mobilePhone: normalizePhone(readDomValue(nativeFormData, 'mobilePhone') || currentFormData.mobilePhone),
    dateOfBirth: readDomValue(nativeFormData, 'dateOfBirth') || currentFormData.dateOfBirth,
    address: readDomValue(nativeFormData, 'address') || currentFormData.address,
    nationalId: readDomValue(nativeFormData, 'nationalId') || currentFormData.nationalId,
    taxId: readDomValue(nativeFormData, 'taxId') || currentFormData.taxId,
    socialSecurityNumber: readDomValue(nativeFormData, 'socialSecurityNumber') || currentFormData.socialSecurityNumber,
    registrationCountry: nextCountryValue,
    stateProvince: readDomValue(nativeFormData, 'stateProvince') || currentFormData.stateProvince,
    city: readDomValue(nativeFormData, 'city') || currentFormData.city,
    postalCode: readDomValue(nativeFormData, 'postalCode') || currentFormData.postalCode,
    alternatePhone: normalizePhone(readDomValue(nativeFormData, 'alternatePhone') || currentFormData.alternatePhone),
    emergencyContactName:
      readDomValue(nativeFormData, 'emergencyContactName') || currentFormData.emergencyContactName,
    emergencyContactRelationship:
      readDomValue(nativeFormData, 'emergencyContactRelationship') || currentFormData.emergencyContactRelationship,
    emergencyContactPhone:
      normalizePhone(readDomValue(nativeFormData, 'emergencyContactPhone') || currentFormData.emergencyContactPhone),
    department: readDomValue(nativeFormData, 'department') || currentFormData.department,
    position: readDomValue(nativeFormData, 'position') || currentFormData.position,
    businessUnitId: readDomValue(nativeFormData, 'businessUnitId') || currentFormData.businessUnitId,
    businessId: readDomValue(nativeFormData, 'businessId') || currentFormData.businessId,
    hireDate: readDomValue(nativeFormData, 'hireDate') || currentFormData.hireDate,
    scheduleOnHire: hasDomField(formElement, 'scheduleOnHire')
      ? nativeFormData.has('scheduleOnHire')
      : currentFormData.scheduleOnHire,
    scheduleStartDate: readDomValue(nativeFormData, 'scheduleStartDate') || currentFormData.scheduleStartDate,
    scheduleEndDate: readDomValue(nativeFormData, 'scheduleEndDate') || currentFormData.scheduleEndDate,
    scheduleStartTime: readDomValue(nativeFormData, 'scheduleStartTime') || currentFormData.scheduleStartTime,
    scheduleEndTime: readDomValue(nativeFormData, 'scheduleEndTime') || currentFormData.scheduleEndTime,
    scheduleMealMinutes: readDomValue(nativeFormData, 'scheduleMealMinutes') || currentFormData.scheduleMealMinutes,
    scheduleRestMinutes: readDomValue(nativeFormData, 'scheduleRestMinutes') || currentFormData.scheduleRestMinutes,
    scheduleLateAfterMinutes:
      readDomValue(nativeFormData, 'scheduleLateAfterMinutes') || currentFormData.scheduleLateAfterMinutes,
    scheduleBlockAfterGracePeriod: hasDomField(formElement, 'scheduleBlockAfterGracePeriod')
      ? nativeFormData.has('scheduleBlockAfterGracePeriod')
      : currentFormData.scheduleBlockAfterGracePeriod,
    scheduleLocationRule:
      (readDomValue(nativeFormData, 'scheduleLocationRule') as EmployeeFormData['scheduleLocationRule'])
      || currentFormData.scheduleLocationRule,
    scheduleLocationId: readDomValue(nativeFormData, 'scheduleLocationId') || currentFormData.scheduleLocationId,
    salaryType:
      (readDomValue(nativeFormData, 'salaryType') as EmployeeFormData['salaryType']) || currentFormData.salaryType,
    workdayHours: readDomValue(nativeFormData, 'workdayHours') || currentFormData.workdayHours,
    salary: readDomValue(nativeFormData, 'salary') || currentFormData.salary,
    hourlyRate: readDomValue(nativeFormData, 'hourlyRate') || currentFormData.hourlyRate,
    payPeriod:
      (readDomValue(nativeFormData, 'payPeriod') as EmployeeFormData['payPeriod']) || currentFormData.payPeriod,
    contractType:
      (readDomValue(nativeFormData, 'contractType') as EmployeeFormData['contractType'])
      || currentFormData.contractType,
    contractStartDate: readDomValue(nativeFormData, 'contractStartDate') || currentFormData.contractStartDate,
    contractEndDate: readDomValue(nativeFormData, 'contractEndDate') || currentFormData.contractEndDate,
  };
}
