import type { QuickTestAccountCopy } from "./types";

export const enCAQuickTestCopy: QuickTestAccountCopy = {
  modal: {
    eyebrow: "Quick setup",
    title: "Create a test account",
    description: "Answer the essentials and review access before creation.",
  },
  steps: { scenario: "Scenario", details: "Details" },
  progress: {
    label: "Test account progress",
    step: (current) => `Step ${current} of 2 · demo setup`,
  },
  actions: {
    cancel: "Cancel",
    previous: "Previous",
    next: "Continue",
    review: "Review access",
  },
  scenario: {
    title: "What do you want to test?",
    description: "Indice will prepare recommended modules, capacity and trial length.",
    modules: (count) => `${count} module(s)`,
    employees: (count) => `${count} employees`,
    days: (count) => `${count} days`,
    options: {
      people: {
        label: "People and processes",
        description: "Human resources, tasks and KPIs for an internal operation.",
      },
      commerce: {
        label: "Sales and inventory",
        description: "Commercial flow, inventory, expenses and receivables.",
      },
      complete: {
        label: "Complete operation",
        description: "Every available base module for an end-to-end test.",
      },
    },
  },
  details: {
    title: "Identify the test account",
    description: "Keep the generated details or replace them.",
    companyName: "Company name",
    ownerName: "Owner name",
    ownerEmail: "Sign-in email",
    country: "Country",
    employees: "People using Indice",
    trial: "Trial length",
    summary: "Automatic setup",
    scenario: "Scenario",
    access: "Initial access",
    capacity: "Capacity",
    notice: "The next step lets you review modules, users and trial length before creating the account.",
    companyPrefix: "Indice Demo",
    defaultOwnerName: "Test user",
  },
  errors: {
    duplicateEmail: "That email already belongs to another account. Use a different one.",
    noModules: "No base modules are available for this scenario.",
  },
};
