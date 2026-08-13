import type { CreateModuleWorkOrderInput, ModuleWorkOrder } from "./types";

const words = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .match(/[A-Za-z0-9]+/g) ?? [];

export function createModuleWorkOrder(
  input: CreateModuleWorkOrderInput,
): ModuleWorkOrder {
  const normalizedWords = words(input.moduleName);
  const slug = normalizedWords.map((word) => word.toLowerCase()).join("-");
  const technicalName = normalizedWords
    .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join("");
  return {
    id: Date.now(),
    moduleName: input.moduleName.trim(),
    technicalName,
    slug,
    routeSegment: slug,
    sourceLocale: input.sourceLocale,
    status: "DRAFT",
    createdAt: new Date().toISOString(),
  };
}
