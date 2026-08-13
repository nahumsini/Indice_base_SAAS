export type AccountCreationCopy = {
  steps: { company: string; owner: string; access: string };
  modal: {
    eyebrow: string;
    title: string;
    description: string;
    successTitle: string;
    successDescription: string;
  };
  actions: {
    cancel: string;
    previous: string;
    next: string;
    validating: string;
    create: string;
    creating: string;
    signInAgain: string;
    finish: string;
    manageAccount: string;
    generate: string;
    showPassword: string;
    hidePassword: string;
  };
  progress: {
    label: string;
    step: (current: number, total: number, modules: number) => string;
    ready: (companyId: number) => string;
  };
  company: {
    title: string;
    description: string;
    name: string;
    namePlaceholder: string;
    country: string;
    accountType: string;
    superAdmin: string;
    distributor: string;
    industry: string;
    employees: string;
    employeesPlaceholder: string;
    employeesHint: string;
    unspecified: string;
  };
  owner: {
    title: string;
    description: string;
    name: string;
    namePlaceholder: string;
    email: string;
    emailPlaceholder: string;
    phone: string;
    phonePlaceholder: string;
    password: string;
  };
  access: {
    title: string;
    description: string;
    modules: string;
    baseGroup: string;
    baseGroupDescription: string;
    addonGroup: string;
    addonGroupDescription: string;
    moduleFallback: string;
    noModules: string;
    accessType: string;
    demo: string;
    permanent: string;
    capacityTitle: string;
    capacityDescription: string;
    package: string;
    packageName: (moduleCount: number) => string;
    requiredUsers: string;
    includedUsers: string;
    additionalUsers: string;
    duration: string;
    days: (days: number) => string;
    noExpiration: string;
  };
  context: {
    company: string;
    owner: string;
    directAccount: string;
  };
  notices: {
    restored: string;
    audit: string;
  };
  errors: {
    password: string;
    invalidPhone: string;
    duplicateEmail: string;
    selectModule: string;
    createFailed: string;
    modulesNotApplied: string;
    sessionExpired: string;
  };
  success: {
    created: (companyId: number) => string;
    initialAccess: string;
    oneTimePassword: string;
    copyAll: string;
    copiedAll: string;
    copy: string;
    copied: string;
    loginPage: string;
    company: string;
    email: string;
    password: string;
    loadedModules: string;
    loadedModulesDescription: (count: number) => string;
    accessDataTitle: string;
    securityReminder: string;
    securityShare: string;
  };
};
