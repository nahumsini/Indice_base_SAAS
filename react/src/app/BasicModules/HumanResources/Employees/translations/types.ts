export type EmployeesLocale =
  | 'es-MX'
  | 'es-CO'
  | 'en-US'
  | 'en-CA'
  | 'fr-CA'
  | 'pt-BR'
  | 'ko-CA'
  | 'zh-CA';

export type EmployeeStatusTranslationKey = 'active' | 'inactive' | 'terminated';
export type EmployeePayPeriodTranslationKey = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
export type EmployeeSalaryTypeTranslationKey = 'daily' | 'hourly';
export type EmployeeContractTypeTranslationKey = 'permanent' | 'temporary';
export type EmployeeScheduleLocationRuleTranslationKey = 'business' | 'exact';
export type EmployeeIdentifierCountryKey = 'BR' | 'CA' | 'CO' | 'MX' | 'US';
export type EmployeeDocumentTranslationKey =
  | 'birth_certificate'
  | 'government_id'
  | 'proof_of_address'
  | 'resume'
  | 'profile_photo';

export type EmployeeColumnTranslationKey =
  | 'selection'
  | 'employee'
  | 'employeeNumber'
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'phone'
  | 'dateOfBirth'
  | 'address'
  | 'nationalId'
  | 'taxId'
  | 'socialSecurityNumber'
  | 'registrationCountry'
  | 'stateProvince'
  | 'city'
  | 'postalCode'
  | 'alternatePhone'
  | 'emergencyContactName'
  | 'emergencyContactRelationship'
  | 'emergencyContactPhone'
  | 'position'
  | 'department'
  | 'unit'
  | 'business'
  | 'status'
  | 'scheduleOnHire'
  | 'scheduleStartDate'
  | 'scheduleEndDate'
  | 'scheduleStartTime'
  | 'scheduleEndTime'
  | 'scheduleMealMinutes'
  | 'scheduleRestMinutes'
  | 'scheduleLateAfterMinutes'
  | 'scheduleLocationRule'
  | 'scheduleLocationId'
  | 'salaryType'
  | 'workdayHours'
  | 'workdaysPerWeek'
  | 'salary'
  | 'hourlyRate'
  | 'payPeriod'
  | 'contractType'
  | 'contractStartDate'
  | 'contractEndDate'
  | 'joinDate'
  | 'birthCertificate'
  | 'governmentId'
  | 'proofOfAddress'
  | 'resume'
  | 'profilePhoto'
  | 'actions';

export interface EmployeesSummaryInsightArgs {
  activeCount: number;
  activeRate: string;
  missingDocumentsCount: number;
  noScheduleCount: number;
  payroll: string;
  statusReviewCount: number;
  totalCount: number;
  visibleCount: number;
}

export interface EmployeeModalStepTranslation {
  id: number;
  label: string;
}

export interface EmployeeOptionTranslation<TValue extends string = string> {
  value: TValue;
  label: string;
}

export interface EmployeeModalTranslations {
  titleCreate: string;
  titleEdit: string;
  subtitle: string;
  steps: readonly EmployeeModalStepTranslation[];
  buttons: {
    cancel: string;
    back: string;
    continue: string;
    next: string;
    save: string;
    createEmployee: string;
    saveCompleteLater: string;
    chooseFile: string;
    replaceFile: string;
    removeCurrent: string;
    undoRemove: string;
    viewCurrent: string;
    closeModal: string;
  };
  feedback: {
    profileStarted: string;
    draftSaved: string;
  };
  sections: {
    employee: string;
    employeeDescription: string;
    contact: string;
    contactDescription: string;
    role: string;
    roleDescription: string;
    documents: string;
  };
  groups: {
    identity: string;
    account: string;
    location: string;
    phones: string;
    identifiers: string;
    role: string;
    organization: string;
    schedule: string;
    compensation: string;
    contract: string;
  };
  identifierProfiles: Record<EmployeeIdentifierCountryKey, {
    group: string;
    labels: {
      nationalId: string;
      taxId: string;
      socialSecurityNumber: string;
    };
    placeholders: {
      nationalId: string;
      taxId: string;
      socialSecurityNumber: string;
    };
    helpers: {
      taxId: string;
      socialSecurityNumber: string;
    };
  }>;
  labels: {
    employeeNumber: string;
    firstName: string;
    lastName: string;
    email: string;
    dateOfBirth: string;
    address: string;
    nationalId: string;
    taxId: string;
    socialSecurityNumber: string;
    registrationCountry: string;
    stateProvince: string;
    city: string;
    postalCode: string;
    mobilePhone: string;
    alternatePhone: string;
    emergencyContactName: string;
    emergencyContactRelationship: string;
    emergencyContactPhone: string;
    department: string;
    position: string;
    businessUnitId: string;
    businessId: string;
    hireDate: string;
    scheduleOnHire: string;
    scheduleStartDate: string;
    scheduleEndDate: string;
    scheduleStartTime: string;
    scheduleEndTime: string;
    scheduleMealMinutes: string;
    scheduleRestMinutes: string;
    scheduleLateAfterMinutes: string;
    scheduleBlockAfterGracePeriod: string;
    scheduleLocationRule: string;
    scheduleLocationId: string;
    salaryType: string;
    workdayHours: string;
    workdaysPerWeek: string;
    salary: string;
    hourlyRate: string;
    payPeriod: string;
    contractType: string;
    contractStartDate: string;
    contractEndDate: string;
  };
  helpers: {
    email: string;
    employeeNumberAuto: string;
    alternatePhone: string;
    taxId: string;
    socialSecurityNumber: string;
    documents: string;
    documentRemoved: string;
    scheduleOnHire: string;
    scheduleBusinessLocation: string;
    scheduleExactLocation: string;
    noScheduleLocations: string;
    salaryPeriodMeaning: string;
    hourlySalaryMeaning: string;
  };
  belonging: {
    businessUnitHelper: string;
    businessHelper: string;
    selectUnitFirst: string;
    noHeadquartersOption: string;
    corporateUnitBadge: string;
    businessUnitBadge: string;
    corporateBusinessBadge: string;
    unitHeadquartersBadge: string;
    operatingBusinessBadge: string;
    autoAssignedBadge: string;
    corporateUnitDescription: string;
    businessUnitDescription: string;
    corporateBusinessDescription: string;
    unitHeadquartersDescription: (unit: string) => string;
    operatingBusinessDescription: string;
    belongingSummary: (unit: string, business: string, kind: string) => string;
    corporateAutoSummary: string;
  };
  creatableOptions: {
    add: string;
    helper: string;
    saved: string;
    suggestedForDepartment: (department: string) => string;
  };
  placeholders: {
    employeeNumber: string;
    firstName: string;
    lastName: string;
    email: string;
    address: string;
    nationalId: string;
    taxId: string;
    socialSecurityNumber: string;
    phone: string;
    emergencyContactName: string;
    emergencyContactRelationship: string;
    stateProvince: string;
    city: string;
    postalCode: string;
    workdayHours: string;
    workdaysPerWeek: string;
    salary: string;
    hourlyRate: string;
    scheduleMealMinutes: string;
    scheduleRestMinutes: string;
    scheduleLateAfterMinutes: string;
    select: string;
    noFile: string;
    fileUploaded: string;
  };
  options: {
    departments: readonly string[];
    positions: readonly string[];
    salaryTypes: readonly EmployeeOptionTranslation<EmployeeSalaryTypeTranslationKey>[];
    payPeriods: readonly EmployeeOptionTranslation<EmployeePayPeriodTranslationKey>[];
    contractTypes: readonly EmployeeOptionTranslation<EmployeeContractTypeTranslationKey>[];
    scheduleLocationRules: readonly EmployeeOptionTranslation<EmployeeScheduleLocationRuleTranslationKey>[];
  };
  documents: Record<EmployeeDocumentTranslationKey, string>;
  validation: {
    required: string;
    invalidEmail: string;
    invalidPhone: string;
    invalidHours: string;
    invalidWorkdaysPerWeek: string;
    invalidAmount: string;
    invalidScheduleTime: string;
    invalidMinutes: string;
    scheduleStartPast: string;
    scheduleEndBeforeStart: string;
    contractDates: string;
    documentType: string;
    documentSize: string;
  };
  stepOf: (current: number, total: number) => string;
}

export interface EmployeesTranslations {
  title: string;
  subtitle: string;
  addEmployee: string;
  configureColumns: string;
  preferredCurrency: string;
  exchangeRates: {
    action: string;
    apply: string;
    baseCurrency: string;
    dailyMode: string;
    dailyResetNote: string;
    dailySource: string;
    invalid: string;
    manualMode: string;
    manualPersistenceNote: string;
    manualSource: string;
    preferredRate: (params: { currency: string; rate: string }) => string;
    rateInputLabel: (currency: string) => string;
    reset: string;
    sourceDetails: (params: { base: string; date: string; mode: string; source: string }) => string;
    title: string;
  };
  retryLoad: string;
  detailLoadingTitle: string;
  detailLoadingDescription: string;
  loadLoadingTitle: string;
  loadLoadingDescription: string;
  loadingTitle: string;
  loadingDescription: string;
  terminateLoadingTitle: string;
  terminateLoadingDescription: string;
  deleteLoadingTitle: string;
  deleteLoadingDescription: string;
  successMessages: {
    created: string;
    createdWithSchedule: string;
    updated: string;
    terminated: string;
    deleted: string;
  };
  errorMessages: {
    load: string;
    detail: string;
    save: string;
    scheduleAssign: string;
    delete: string;
    terminate: string;
  };
  summary: {
    total: string;
    active: string;
    inactive: string;
    noSchedule: string;
    documentsPending: string;
    payroll: string;
    payrollMultiCurrencyAlert: (count: number) => string;
    payrollNative: string;
    visible: string;
    terminated: string;
    activeRate: string;
    statusReview: (count: number) => string;
    noScheduleAlert: (count: number) => string;
    documentsPendingAlert: (count: number) => string;
    summaryInsight: (args: EmployeesSummaryInsightArgs) => string;
  };
  views: {
    label: string;
    table: string;
  };
  bulk: {
    title: string;
    selected: (count: number) => string;
    changeUnit: string;
    changeBusiness: string;
    changeDepartment: string;
    changePosition: string;
    exportSelected: string;
    clear: string;
    mixedSelection: string;
    selectUnitFirst: string;
    updateSuccess: (count: number) => string;
    updateError: string;
    exportFileName: (date: string) => string;
  };
  filters: {
    title: string;
    searchLabel: string;
    searchPlaceholder: string;
    unit: string;
    business: string;
    department: string;
    status: string;
    all: string;
  };
  statusLabels: Record<EmployeeStatusTranslationKey, string>;
  columns: Record<EmployeeColumnTranslationKey, string>;
  table: {
    emptyState: string;
    selectAllVisible: string;
    selectEmployee: (name: string) => string;
    resizeColumn: string;
    deleteConfirm: string;
    editHrUserLabel: string;
    terminateHrUserLabel: string;
    deleteHrUserLabel: string;
  };
  columnDescriptions: Record<Exclude<EmployeeColumnTranslationKey, 'selection' | 'actions'>, string>;
  payPeriodLabels: Record<EmployeePayPeriodTranslationKey, string>;
  salaryTypeLabels: Record<EmployeeSalaryTypeTranslationKey, string>;
  contractTypeLabels: Record<EmployeeContractTypeTranslationKey, string>;
  scheduleLocationRuleLabels: Record<EmployeeScheduleLocationRuleTranslationKey, string>;
  binaryLabels: {
    yes: string;
    no: string;
  };
  documentStatusLabels: {
    uploaded: string;
    missing: string;
    upload: string;
    replace: string;
    view: string;
    viewImage: string;
    uploading: string;
  };
  pagination: {
    previous: string;
    next: string;
    showing: (start: number, end: number, total: number) => string;
    page: (current: number, total: number) => string;
  };
  businessFallback: string;
  unitFallback: string;
  dateFallback: string;
  fieldFallback: string;
  modal: EmployeeModalTranslations;
}
