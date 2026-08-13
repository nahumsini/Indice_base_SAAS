import type { PlatformCatalogProduct, PlatformCompanyDetail } from "../../api/platformAdmin";

export const offerLabels: Record<string, string> = {
  demo: "Demo",
  courtesy: "Cortesía",
  support: "Soporte",
};

export const offerStatusLabels: Record<string, string> = {
  active: "Activo",
  scheduled: "Programado",
  revoked: "Revocado",
  expired: "Vencido",
};

export function humanize(value?: string | null) {
  if (!value) return "—";
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatMoney(cents?: number | null, currency?: string | null) {
  if (cents == null) return "—";
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function displayProductName(product: PlatformCatalogProduct) {
  return product.display_name || humanize(product.product_code);
}

export function commercialOrigin(company: PlatformCompanyDetail) {
  if (company.user_type === "DISTRIBUTOR") {
    return {
      value: "Cuenta distribuidora",
      hint: company.created_by_user_name ? `Creada por ${company.created_by_user_name}` : "Red comercial de Índice",
    };
  }
  if (company.distributor_company_name || company.creation_origin === "DISTRIBUTOR_PORTAL") {
    return {
      value: company.distributor_company_name || company.created_by_distributor_company_name || "Distribuidor asignado",
      hint: company.created_by_user_name ? `Creada por ${company.created_by_user_name}` : "Origen distribuidor",
    };
  }
  if (company.creation_origin === "WEB_SELF_SERVICE") {
    return { value: "Registro web", hint: "Alta directa del cliente" };
  }
  if (company.creation_origin === "PLATFORM_ADMIN") {
    return { value: "Directo con Índice", hint: "Alta desde Administración" };
  }
  return { value: "Origen histórico", hint: "Sin trazabilidad de alta" };
}
