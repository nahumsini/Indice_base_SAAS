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
