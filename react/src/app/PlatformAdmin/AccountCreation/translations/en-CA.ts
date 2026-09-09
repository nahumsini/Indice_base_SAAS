import type { AccountCreationCopy } from "./types";

export const enCACopy: AccountCreationCopy = {
  steps: { company: "Company", owner: "Owner", access: "Access" },
  modal: {
    eyebrow: "Direct Root setup", title: "Create an Índice account",
    description: "Set up the company, owner, and access in three steps.",
    successTitle: "Account ready to deliver",
    successDescription: "Copy the credentials and share them through a secure channel.",
  },
  actions: {
    cancel: "Cancel", previous: "Back", next: "Next", validating: "Validating",
    create: "Create and enable", creating: "Creating account...", signInAgain: "Sign in again",
    finish: "Finish", manageAccount: "Manage account", generate: "Generate",
    showPassword: "Show password", hidePassword: "Hide password",
  },
  progress: {
    label: "Account creation progress",
    step: (current, total, modules) => `Step ${current} of ${total} · Modules: ${modules}`,
    ready: (companyId) => `Company #${companyId} · access ready to deliver`,
  },
  company: {
    title: "Company", description: "Commercial identity for the new account.",
    name: "Company name", namePlaceholder: "e.g. Horizon Group", country: "Country",
    accountType: "Account type", superAdmin: "Super Admin · client", distributor: "Distributor",
    industry: "Industry (optional)", employees: "Exact employee count",
    employeesPlaceholder: "e.g. 18",
    employeesHint: "Include the owner and everyone who will need access to Índice.",
    unspecified: "Not specified",
  },
  owner: {
    title: "Owner and access", description: "Initial credentials for the company owner.",
    name: "Owner name (optional)", namePlaceholder: "First and last name",
    email: "Email address", emailPlaceholder: "owner@company.com", phone: "Phone (optional)",
    phonePlaceholder: "+1 416 555 0123", password: "Temporary password",
  },
  access: {
    title: "Plan and modules", description: "Choose only the initial access that is needed.",
    modules: "Available modules",
    baseGroup: "Base package",
    baseGroupDescription: "The total number of basic modules determines the commercial package.",
    addonGroup: "Add-on modules",
    addonGroupDescription: "They are billed individually when the trial ends.",
    moduleFallback: "Operational module access.",
    noModules: "No active basic modules. Review Catalog and modules.", accessType: "Access type",
    demo: "Time-limited demo", permanent: "Permanent courtesy",
    capacityTitle: "Calculated package and capacity",
    capacityDescription: "Índice covers the stated employees with the package and required additional seats.",
    package: "Base package", requiredUsers: "Required employees",
    packageName: (moduleCount) => moduleCount <= 0
      ? "No package"
      : moduleCount === 1
        ? "1 module"
        : moduleCount === 2
          ? "2 modules"
          : moduleCount === 3
            ? "3 modules"
            : "4 or more modules",
    includedUsers: "Included seats", additionalUsers: "Additional users",
    duration: "Demo duration", days: (days) => `${days} days`,
    noExpiration: "No expiry date",
  },
  context: { company: "Company", owner: "Owner", directAccount: "Direct setup" },
  notices: {
    restored: "We restored your progress and generated a new temporary password.",
    audit: "This creates a real company and is recorded in the audit log. No Stripe charge is created.",
  },
  errors: {
    password: "The password must be at least 10 characters and no more than 72 bytes.",
    invalidPhone: "Enter a valid phone number for the selected country.",
    duplicateEmail: "That email belongs to another account. Use a different email to continue.",
    selectModule: "Select at least one module to create the account.",
    createFailed: "The account could not be created.",
    modulesNotApplied: "The account was created, but the selected modules were not confirmed. Open Manage account to complete access.",
    sessionExpired: "Your Root session expired. Progress was kept without saving the password.",
  },
  success: {
    created: (companyId) => `Company #${companyId} · owner created successfully`,
    initialAccess: "Initial access", oneTimePassword: "The password is only displayed here.",
    copyAll: "Copy details", copiedAll: "Details copied", copy: "Copy", copied: "Copied",
    loginPage: "Sign-in page", company: "Company", email: "Email", password: "Temporary password",
    loadedModules: "Loaded modules", loadedModulesDescription: (count) => `Modules confirmed on the account: ${count}`,
    accessDataTitle: "Índice access details", securityReminder: "For security, change the password after signing in.",
    securityShare: "Ask the user to change this password under Dashboard → Profile → Security. Índice will not email it or store it in the Root audit log.",
  },
};
