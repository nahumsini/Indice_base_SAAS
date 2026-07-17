import type { DashboardModuleCard } from "../config/moduleCatalog";
import type { PageId } from "../config/navigation";

export type OperationalJourneyStageId =
  | "company_setup"
  | "human_resources"
  | "operations"
  | "finance"
  | "commercial"
  | "analytics";

export type OperationalJourneyStageStatus =
  "completed" | "active" | "pending" | "locked";

export interface OperationalJourneyStageDefinition {
  id: OperationalJourneyStageId;
  primaryRoute: PageId;
  moduleRoutes: PageId[];
}

export interface OperationalJourneyStageView extends OperationalJourneyStageDefinition {
  status: OperationalJourneyStageStatus;
}

export interface OperationalModuleGroup {
  stage: OperationalJourneyStageDefinition;
  modules: DashboardModuleCard[];
}

export const operationalJourneyStages: OperationalJourneyStageDefinition[] = [
  {
    id: "company_setup",
    primaryRoute: "home-panel",
    moduleRoutes: ["home-panel"],
  },
  {
    id: "human_resources",
    primaryRoute: "human-resources",
    moduleRoutes: ["human-resources"],
  },
  {
    id: "operations",
    primaryRoute: "processes-tasks",
    moduleRoutes: ["processes-tasks"],
  },
  {
    id: "finance",
    primaryRoute: "expenses",
    moduleRoutes: ["expenses", "petty-cash", "receivables"],
  },
  {
    id: "commercial",
    primaryRoute: "point-of-sale",
    moduleRoutes: ["point-of-sale", "sales", "inventory"],
  },
  {
    id: "analytics",
    primaryRoute: "kpis",
    moduleRoutes: ["kpis"],
  },
];

export function clampOperationalJourneyStep(step: number): number {
  return Math.min(Math.max(step, 0), operationalJourneyStages.length - 1);
}

export function resolveOperationalJourneyStatus(
  stageIndex: number,
  currentStep: number,
): OperationalJourneyStageStatus {
  if (stageIndex < currentStep) {
    return "completed";
  }

  if (stageIndex === currentStep) {
    return "active";
  }

  return "pending";
}

export function buildOperationalJourneyView(
  currentStep: number,
): OperationalJourneyStageView[] {
  const safeStep = clampOperationalJourneyStep(currentStep);

  return operationalJourneyStages.map((stage, index) => ({
    ...stage,
    status: resolveOperationalJourneyStatus(index, safeStep),
  }));
}

export function buildOperationalModuleGroups(
  modules: DashboardModuleCard[],
): OperationalModuleGroup[] {
  const modulesByRoute = new Map<PageId, DashboardModuleCard>(
    modules.map((module) => [module.route, module]),
  );

  return operationalJourneyStages
    .map((stage) => ({
      stage,
      modules: stage.moduleRoutes
        .map((route) => modulesByRoute.get(route))
        .filter((module): module is DashboardModuleCard => Boolean(module)),
    }))
    .filter((group) => group.modules.length > 0);
}
