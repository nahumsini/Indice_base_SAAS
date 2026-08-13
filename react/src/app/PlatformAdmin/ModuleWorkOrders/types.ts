export type ModuleWorkOrderLocale =
  "en-CA" | "en-US" | "es-MX" | "es-CO" | "fr-CA" | "pt-BR" | "ko-CA" | "zh-CA";

export type ModuleWorkOrder = {
  id: number;
  moduleName: string;
  technicalName: string;
  slug: string;
  routeSegment: string;
  sourceLocale: ModuleWorkOrderLocale;
  status: "DRAFT" | "IN_REVIEW" | "APPROVED" | "IMPLEMENTED";
  createdAt: string;
  updatedAt?: string;
};

export type CreateModuleWorkOrderInput = Pick<
  ModuleWorkOrder,
  "moduleName" | "sourceLocale"
>;
