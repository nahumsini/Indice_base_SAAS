import type {
  PlatformAccountCreatePayload,
  PlatformCatalogProduct,
} from "../../api/platformAdmin";

export type QuickTestScenario = "people" | "commerce" | "complete";
export type QuickTestStep = "scenario" | "details";
export type QuickTestAccessDays = 7 | 15 | 30;

export type QuickTestDraft = {
  scenario: QuickTestScenario;
  company_name: string;
  owner_name: string;
  owner_email: string;
  country_code: PlatformAccountCreatePayload["country_code"];
  employee_count: number;
  access_days: QuickTestAccessDays;
};

export type QuickTestScenarioOption = {
  id: QuickTestScenario;
  label: string;
  description: string;
  moduleCount: number;
  employeeCount: number;
  accessDays: QuickTestAccessDays;
};

export type QuickTestAccountModalProps = {
  products: PlatformCatalogProduct[];
  existingOwnerEmails: string[];
  onClose: () => void;
  onContinue: (form: PlatformAccountCreatePayload) => void;
};
