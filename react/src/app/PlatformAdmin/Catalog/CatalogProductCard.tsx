import { CircleDollarSign, PencilLine } from "lucide-react";
import type { PlatformCatalogProduct } from "../../api/platformAdmin";

type CatalogProductVisual = {
  emoji: string;
  background: string;
  border: string;
  accent: string;
};

const visualDefinitions: Array<[string[], CatalogProductVisual]> = [
  [
    ["core", "platform", "config_center"],
    {
      emoji: "🏠",
      background: "bg-blue-50",
      border: "border-blue-200",
      accent: "text-blue-700",
    },
  ],
  [
    ["human_resources", "basic_hr"],
    {
      emoji: "👥",
      background: "bg-teal-50",
      border: "border-teal-200",
      accent: "text-teal-700",
    },
  ],
  [
    ["process", "task"],
    {
      emoji: "✅",
      background: "bg-amber-50",
      border: "border-amber-200",
      accent: "text-amber-700",
    },
  ],
  [
    ["expense", "petty_cash"],
    {
      emoji: "💸",
      background: "bg-green-50",
      border: "border-green-200",
      accent: "text-green-700",
    },
  ],
  [
    ["pos", "point_of_sale"],
    {
      emoji: "🛒",
      background: "bg-orange-50",
      border: "border-orange-200",
      accent: "text-orange-700",
    },
  ],
  [
    ["sales", "crm"],
    {
      emoji: "💼",
      background: "bg-rose-50",
      border: "border-rose-200",
      accent: "text-rose-700",
    },
  ],
  [
    ["inventory"],
    {
      emoji: "📦",
      background: "bg-orange-50",
      border: "border-orange-200",
      accent: "text-orange-700",
    },
  ],
  [
    ["receivables", "cartera"],
    {
      emoji: "📒",
      background: "bg-cyan-50",
      border: "border-cyan-200",
      accent: "text-cyan-700",
    },
  ],
];

function resolveVisual(product: PlatformCatalogProduct) {
  const searchable =
    `${product.product_code} ${product.display_name} ${product.capabilities.join(" ")}`.toLowerCase();
  return (
    visualDefinitions.find(([tokens]) =>
      tokens.some((token) => searchable.includes(token)),
    )?.[1] ?? {
      emoji: "🧩",
      background: "bg-slate-50",
      border: "border-slate-200",
      accent: "text-slate-700",
    }
  );
}

function productTypeLabel(type: string, english: boolean) {
  const normalized = type.toUpperCase();
  if (normalized === "CORE") return english ? "Indice essentials" : "Esencial de Índice";
  if (normalized === "ADDON") return english ? "Add-on" : "Complemento";
  return english ? "Package" : "Paquete";
}

function capabilityLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function CatalogProductCard({
  english,
  product,
  priceCount,
  readyForSale,
  onEdit,
}: {
  english: boolean;
  product: PlatformCatalogProduct;
  priceCount: number;
  readyForSale: boolean;
  onEdit: () => void;
}) {
  const visual = resolveVisual(product);
  return (
    <article
      className="group relative flex min-h-[230px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#59C3A5]/60 hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`grid h-11 w-11 place-items-center rounded-xl border text-xl dark:bg-slate-800 ${visual.background} ${visual.border}`}
          aria-hidden="true"
        >
          {visual.emoji}
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${product.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}
        >
          {!product.active
            ? english
              ? "Inactive"
              : "Inactivo"
            : readyForSale
              ? english
                ? "Ready to sell"
                : "Listo para vender"
              : priceCount
                ? english
                  ? "Billing pending"
                  : "Cobro pendiente"
                : english
                  ? "Missing price"
                  : "Sin precio"}
        </span>
      </div>
      <div className="mt-3 flex-1">
        <p
          className={`text-xs font-medium ${visual.accent}`}
        >
          {productTypeLabel(product.product_type, english)}
        </p>
        <h3 className="mt-1 text-lg font-medium text-slate-950 dark:text-white">
          {product.display_name}
        </h3>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {product.capabilities.map((capability) => (
            <span
              key={capability}
              className="rounded-lg bg-white/80 px-2 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200/70 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700"
            >
              {capabilityLabel(capability)}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-slate-200/70 pt-3 dark:border-slate-700">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
          <CircleDollarSign className="h-4 w-4" />
          {priceCount}{" "}
          {english
            ? priceCount === 1
              ? "rate"
              : "rates"
            : priceCount === 1
              ? "tarifa"
              : "tarifas"}
        </span>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#59C3A5]/40 bg-white px-3 text-sm font-medium text-[#176B5B] transition hover:bg-[#59C3A5]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#59C3A5]/25 dark:bg-slate-800 dark:text-[#8FE0CA]"
        >
          <PencilLine className="h-4 w-4" />
          {english ? "Configure" : "Configurar"}
        </button>
      </div>
    </article>
  );
}
