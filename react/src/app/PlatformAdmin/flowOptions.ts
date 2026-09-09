import { getCatalogCopy, type CatalogCopy } from "./CatalogWorkspace/translations";

// These existing values are persisted in account and audit records; localize only their display labels.
export const countryOptions = [
  {
    code: "MX",
    label: "México",
    currency: "MXN",
    timezones: [
      "America/Mexico_City",
      "America/Monterrey",
      "America/Cancun",
      "America/Tijuana",
    ],
  },
  {
    code: "CA",
    label: "Canadá",
    currency: "CAD",
    timezones: [
      "America/Toronto",
      "America/Vancouver",
      "America/Edmonton",
      "America/Halifax",
    ],
  },
  {
    code: "US",
    label: "Estados Unidos",
    currency: "USD",
    timezones: [
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Los_Angeles",
    ],
  },
  {
    code: "CO",
    label: "Colombia",
    currency: "COP",
    timezones: ["America/Bogota"],
  },
  {
    code: "BR",
    label: "Brasil",
    currency: "BRL",
    timezones: ["America/Sao_Paulo", "America/Manaus", "America/Recife"],
  },
] as const;

export const currencyOptions = ["USD", "MXN", "CAD", "COP", "BRL"] as const;

export const industryOptions = [
  "Servicios profesionales",
  "Consultoría empresarial",
  "Servicios legales y contables",
  "Comercio y retail",
  "Comercio electrónico",
  "Hotelería y turismo",
  "Restaurantes y alimentos",
  "Agricultura, ganadería y pesca",
  "Construcción e inmuebles",
  "Arquitectura e ingeniería",
  "Manufactura",
  "Industria automotriz",
  "Aeroespacial y defensa",
  "Alimentos y bebidas",
  "Química y petroquímica",
  "Farmacéutica y biotecnología",
  "Textil, moda y calzado",
  "Minería y metalurgia",
  "Energía y servicios públicos",
  "Petróleo y gas",
  "Manejo de residuos industriales",
  "Reciclaje y economía circular",
  "Servicios ambientales",
  "Organismos de certificación",
  "Salud",
  "Educación",
  "Transporte y logística",
  "Tecnología",
  "Telecomunicaciones",
  "Banca y servicios financieros",
  "Seguros",
  "Gobierno y sector público",
  "Seguridad privada",
  "Limpieza y mantenimiento",
  "Medios y entretenimiento",
  "Organización sin fines de lucro",
] as const;

export const accessReasonOptions = [
  "Demostración comercial",
  "Prueba controlada",
  "Promoción comercial",
  "Atención de soporte",
  "Compensación autorizada",
] as const;

export const moduleAvailabilityReasonOptions = [
  "Publicación planificada del módulo",
  "Mantenimiento preventivo",
  "Incidente operativo",
  "Retiro temporal del producto",
  "Cambio de estrategia comercial",
] as const;

export const revocationReasonOptions = [
  "Acceso vencido",
  "Solicitud del cliente",
  "Corrección administrativa",
  "Código comprometido",
  "Concesión duplicada",
] as const;

export const accessDayOptions = [7, 15, 30, 60, 90, 180, 365] as const;
export const trialDayOptions = [7, 15, 30] as const;
export const extraSeatOptions = [0, 1, 2, 3, 5, 10, 25, 50] as const;
export const redemptionOptions = [1, 5, 10, 25, 50, 100] as const;

export function countryOption(code: string) {
  return countryOptions.find((option) => option.code === code);
}

const optionTranslationKeys: Record<string, keyof CatalogCopy> = {
  "Servicios profesionales": "industryProfessional",
  "Consultoría empresarial": "industryConsulting",
  "Servicios legales y contables": "industryLegal",
  "Comercio y retail": "industryRetail",
  "Comercio electrónico": "industryEcommerce",
  "Hotelería y turismo": "industryHospitality",
  "Restaurantes y alimentos": "industryRestaurants",
  "Agricultura, ganadería y pesca": "industryAgriculture",
  "Construcción e inmuebles": "industryConstruction",
  "Arquitectura e ingeniería": "industryArchitecture",
  "Manufactura": "industryManufacturing",
  "Industria automotriz": "industryAutomotive",
  "Aeroespacial y defensa": "industryAerospace",
  "Alimentos y bebidas": "industryFood",
  "Química y petroquímica": "industryChemical",
  "Farmacéutica y biotecnología": "industryPharmaceutical",
  "Textil, moda y calzado": "industryTextile",
  "Minería y metalurgia": "industryMining",
  "Energía y servicios públicos": "industryEnergy",
  "Petróleo y gas": "industryOil",
  "Manejo de residuos industriales": "industryWaste",
  "Reciclaje y economía circular": "industryRecycling",
  "Servicios ambientales": "industryEnvironmental",
  "Organismos de certificación": "industryCertification",
  "Salud": "industryHealth",
  "Educación": "industryEducation",
  "Transporte y logística": "industryLogistics",
  "Tecnología": "industryTechnology",
  "Telecomunicaciones": "industryTelecom",
  "Banca y servicios financieros": "industryBanking",
  "Seguros": "industryInsurance",
  "Gobierno y sector público": "industryGovernment",
  "Seguridad privada": "industrySecurity",
  "Limpieza y mantenimiento": "industryCleaning",
  "Medios y entretenimiento": "industryMedia",
  "Organización sin fines de lucro": "industryNonprofit",
  "Demostración comercial": "reasonDemo",
  "Prueba controlada": "reasonControlledTrial",
  "Promoción comercial": "reasonPromotion",
  "Atención de soporte": "reasonSupport",
  "Compensación autorizada": "reasonCompensation",
  "Publicación planificada del módulo": "reasonModulePublication",
  "Mantenimiento preventivo": "reasonMaintenance",
  "Incidente operativo": "reasonIncident",
  "Retiro temporal del producto": "reasonTemporaryRemoval",
  "Cambio de estrategia comercial": "reasonStrategy",
  "Acceso vencido": "reasonExpired",
  "Solicitud del cliente": "reasonCustomerRequest",
  "Corrección administrativa": "reasonCorrection",
  "Código comprometido": "reasonCompromised",
  "Concesión duplicada": "reasonDuplicate"
};

/** Keep the original option value in requests and stored records. */
export function flowOptionLabel(value: string, languageCode: string): string {
  const key = optionTranslationKeys[value];
  return typeof key === "string" ? getCatalogCopy(languageCode)[key] : value;
}

export function countryLabel(code: string, languageCode: string): string {
  const keys: Record<string, keyof CatalogCopy> = {
    MX: "countryMX", CA: "countryCA", US: "countryUS", CO: "countryCO", BR: "countryBR",
  };
  return typeof keys[code] === "string" ? getCatalogCopy(languageCode)[keys[code]] : code;
}
