import type { EmployeeFormData } from '../components/CreateEmployeeModal';
import type { EmployeeStatus } from '../types/employees.types';
import { parseForeignKeyValue } from './employees.utils';

export const buildEmployeeSavePayload = (
  data: EmployeeFormData,
  status: EmployeeStatus,
) => {
  const trimmedFirstName = data.firstName.trim();
  const trimmedLastName = data.lastName.trim();
  const trimmedEmail = data.email.trim();
  const trimmedMobilePhone = data.mobilePhone.trim();
  const trimmedPosition = data.position.trim();
  const trimmedDepartment = data.department.trim();
  const parsedUnitId = parseForeignKeyValue(data.businessUnitId);
  const parsedBusinessId = parseForeignKeyValue(data.businessId);
  const trimmedSalary = data.salary.trim();
  const trimmedHourlyRate = data.hourlyRate.trim();
  const salaryAmount = data.salaryType === 'hourly' ? '' : trimmedSalary;
  const hourlyRateAmount = data.salaryType === 'hourly' ? trimmedHourlyRate : '';
  const trimmedAddress = data.address.trim();
  const trimmedNationalId = data.nationalId.trim();
  const trimmedTaxId = data.taxId.trim();
  const trimmedSocialSecurityNumber = data.socialSecurityNumber.trim();
  const trimmedStateProvince = data.stateProvince.trim();
  const trimmedCity = data.city.trim();
  const trimmedPostalCode = data.postalCode.trim();
  const trimmedAlternatePhone = data.alternatePhone.trim();
  const trimmedEmergencyContactName = data.emergencyContactName.trim();
  const trimmedEmergencyContactRelationship = data.emergencyContactRelationship.trim();
  const trimmedEmergencyContactPhone = data.emergencyContactPhone.trim();
  const trimmedWorkdayHours = data.workdayHours.trim();
  const trimmedWorkdaysPerWeek = data.workdaysPerWeek.trim();

  return {
    first_name: trimmedFirstName,
    last_name: trimmedLastName,
    email: trimmedEmail,
    phone: trimmedMobilePhone,
    position: trimmedPosition,
    department: trimmedDepartment,
    unit_id: parsedUnitId,
    business_id: parsedBusinessId,
    hire_date: data.hireDate,
    salary: salaryAmount,
    pay_period: data.payPeriod,
    salary_type: data.salaryType,
    hourly_rate: hourlyRateAmount,
    contract_type: data.contractType,
    contract_start_date: data.contractStartDate,
    contract_end_date: data.contractEndDate,
    user_code: data.employeeNumber.trim(),
    employee: {
      user_code: data.employeeNumber.trim(),
      first_name: trimmedFirstName,
      last_name: trimmedLastName,
      email: trimmedEmail,
      phone: trimmedMobilePhone,
      position: trimmedPosition,
      department: trimmedDepartment,
      unit_id: parsedUnitId,
      business_id: parsedBusinessId,
      hire_date: data.hireDate,
      salary: salaryAmount,
      pay_period: data.payPeriod,
      salary_type: data.salaryType,
      hourly_rate: hourlyRateAmount,
      contract_type: data.contractType,
      contract_start_date: data.contractStartDate,
      contract_end_date: data.contractEndDate,
    },
    date_of_birth: data.dateOfBirth,
    address: trimmedAddress,
    national_id: trimmedNationalId,
    tax_id: trimmedTaxId,
    social_security_number: trimmedSocialSecurityNumber,
    registration_country: data.registrationCountry,
    state_province: trimmedStateProvince,
    city: trimmedCity,
    postal_code: trimmedPostalCode,
    alternate_phone: trimmedAlternatePhone,
    emergency_contact_name: trimmedEmergencyContactName,
    emergency_contact_relationship: trimmedEmergencyContactRelationship,
    emergency_contact_phone: trimmedEmergencyContactPhone,
    workday_hours: trimmedWorkdayHours,
    workdays_per_week: trimmedWorkdaysPerWeek,
    profile: {
      date_of_birth: data.dateOfBirth,
      address: trimmedAddress,
      national_id: trimmedNationalId,
      tax_id: trimmedTaxId,
      social_security_number: trimmedSocialSecurityNumber,
      registration_country: data.registrationCountry,
      state_province: trimmedStateProvince,
      city: trimmedCity,
      postal_code: trimmedPostalCode,
      alternate_phone: trimmedAlternatePhone,
      emergency_contact_name: trimmedEmergencyContactName,
      emergency_contact_relationship: trimmedEmergencyContactRelationship,
      emergency_contact_phone: trimmedEmergencyContactPhone,
      workday_hours: trimmedWorkdayHours,
      workdays_per_week: trimmedWorkdaysPerWeek,
    },
    status,
  };
};
