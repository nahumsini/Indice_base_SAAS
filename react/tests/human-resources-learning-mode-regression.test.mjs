import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildHumanResourcesLearningSignals,
  humanResourcesLearningJourneyOrder,
  isEmployeeLearningRequirementSatisfied,
} from '../src/app/BasicModules/HumanResources/operationalGuidance/humanResourcesLearningModel.ts';
import {
  normalizeHumanResourcesLearningProgress,
} from '../src/app/BasicModules/HumanResources/operationalGuidance/humanResourcesLearningProgress.ts';

const documents = {
  birth_certificate: null,
  government_id: null,
  proof_of_address: null,
  resume: null,
  profile_photo: null,
};

function createEmployee(overrides = {}) {
  return {
    id: 7,
    code: 'COL-7',
    firstName: 'Ana',
    lastName: 'López',
    fullName: 'Ana López',
    email: 'ana@example.com',
    phone: '+5215555555555',
    dateOfBirth: '1990-01-01',
    address: 'Calle 1',
    nationalId: 'ID-7',
    taxId: '',
    socialSecurityNumber: '',
    registrationCountry: 'MX',
    stateProvince: 'CMX',
    city: 'Ciudad de México',
    postalCode: '01000',
    alternatePhone: '',
    emergencyContactName: '',
    emergencyContactRelationship: '',
    emergencyContactPhone: '',
    position: 'Gerente',
    department: 'Operaciones',
    unitId: '2',
    unitLabel: 'Centro',
    businessId: '3',
    businessLabel: 'Sucursal Centro',
    joinDate: '2026-01-01',
    scheduleOnHire: false,
    scheduleStartDate: '',
    scheduleEndDate: '',
    scheduleStartTime: '',
    scheduleEndTime: '',
    scheduleMealMinutes: null,
    scheduleRestMinutes: null,
    scheduleLateAfterMinutes: null,
    scheduleLocationRule: '',
    scheduleLocationId: '',
    salary: 24000,
    payPeriod: 'monthly',
    salaryType: 'daily',
    workdayHours: 8,
    workdaysPerWeek: 5,
    payrollTreatment: 'fiscal_payroll',
    hourlyRate: 0,
    contractType: 'permanent',
    contractStartDate: '2026-01-01',
    contractEndDate: '',
    status: 'active',
    documents,
    ...overrides,
  };
}

test('la ruta de RH sigue el ciclo laboral aprobado y no el orden visual', () => {
  assert.deepEqual(humanResourcesLearningJourneyOrder, [
    'collaborators',
    'control',
    'attendance',
    'permissions',
    'payroll',
    'announcements',
    'assets',
    'records',
    'incentives',
    'kpis',
  ]);
});

test('las señales usan colaboradores reales y detectan faltantes de configuración', () => {
  const signals = buildHumanResourcesLearningSignals([createEmployee()], []);

  assert.equal(signals.totalEmployeeCount, 1);
  assert.equal(signals.activeEmployeeCount, 1);
  assert.equal(signals.missingScheduleCount, 1);
  assert.equal(signals.missingLocationCount, 1);
  assert.equal(signals.missingDocumentsCount, 1);
  assert.equal(signals.missingAccessCount, 1);
  assert.equal(signals.missingOrganizationCount, 0);
  assert.equal(signals.missingCompensationCount, 0);
});

test('No aplica satisface solo la vista de aprendizaje cuando conserva una razón', () => {
  const candidate = buildHumanResourcesLearningSignals([createEmployee()], []).candidates[0];

  assert.equal(isEmployeeLearningRequirementSatisfied(candidate, 'schedule', undefined), false);
  assert.equal(isEmployeeLearningRequirementSatisfied(candidate, 'schedule', {
    schedule: { reason: 'Trabajo remoto sin control de asistencia', updatedAt: '2026-09-05T00:00:00.000Z' },
  }), true);
  assert.equal(isEmployeeLearningRequirementSatisfied(candidate, 'schedule', {
    schedule: { reason: '   ', updatedAt: '2026-09-05T00:00:00.000Z' },
  }), false);
});

test('la normalización conserva Entendido y Aplicado por separado', () => {
  const progress = normalizeHumanResourcesLearningProgress({
    version: 1,
    activeAreaId: 'payroll',
    expanded: true,
    selectedEmployeeId: 7,
    understoodAreaIds: ['collaborators', 'invalid'],
    appliedAreaIds: ['control'],
    employeeExceptions: {},
  });

  assert.equal(progress.activeAreaId, 'payroll');
  assert.deepEqual(progress.understoodAreaIds, ['collaborators']);
  assert.deepEqual(progress.appliedAreaIds, ['control']);
  assert.equal(progress.selectedEmployeeId, 7);
});
