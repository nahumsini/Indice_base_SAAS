import type { QuickTestScenario } from "../types";

export type QuickTestAccountCopy = {
  modal: { eyebrow: string; title: string; description: string };
  steps: { scenario: string; details: string };
  progress: { label: string; step: (current: number) => string };
  actions: {
    cancel: string;
    previous: string;
    next: string;
    review: string;
  };
  scenario: {
    title: string;
    description: string;
    modules: (count: number) => string;
    employees: (count: number) => string;
    days: (count: number) => string;
    options: Record<QuickTestScenario, { label: string; description: string }>;
  };
  details: {
    title: string;
    description: string;
    companyName: string;
    ownerName: string;
    ownerEmail: string;
    country: string;
    employees: string;
    trial: string;
    summary: string;
    scenario: string;
    access: string;
    capacity: string;
    notice: string;
    companyPrefix: string;
    defaultOwnerName: string;
  };
  errors: { duplicateEmail: string; noModules: string };
};
