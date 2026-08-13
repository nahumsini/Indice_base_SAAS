import { CircleDollarSign, PencilLine } from "lucide-react";
import type { PlatformCatalogProduct } from "../../api/platformAdmin";

type CatalogProductVisual = {
  emoji: string;
  gradient: string;
  border: string;
  accent: string;
};

const visualDefinitions: Array<[string[], CatalogProductVisual]> = [
  [
    ["core", "platform", "config_center"],
    {
      emoji: "🏠",
      gradient: "from-blue-100 via-sky-50 to-white",
      border: "border-blue-200",
      accent: "text-blue-700",
    },
  ],
  [
    ["human_resources", "basic_hr"],
    {
      emoji: "👥",
      gradient: "from-teal-100 via-emerald-50 to-white",
      border: "border-teal-200",
      accent: "text-teal-700",
    },
  ],
  [
    ["process", "task"],
    {
      emoji: "✅",
      gradient: "from-amber-100 via-yellow-50 to-white",
      border: "border-amber-200",
      accent: "text-amber-700",
    },
  ],
  [
    ["expense", "petty_cash"],
    {
      emoji: "💸",
      gradient: "from-green-100 via-emerald-50 to-white",
      border: "border-green-200",
      accent: "text-green-700",
    },
  ],
  [
    ["pos", "point_of_sale"],
    {
      emoji: "🛒",
      gradient: "from-orange-100 via-rose-50 to-white",
      border: "border-orange-200",
      accent: "text-orange-700",
    },
  ],
  [
    ["sales", "crm"],
    {
      emoji: "💼",
      gradient: "from-rose-100 via-pink-50 to-white",
      border: "border-rose-200",
      accent: "text-rose-700",
    },
  ],
  [
    ["inventory"],
    {
      emoji: "📦",
      gradient: "from-orange-100 via-amber-50 to-white",
      border: "border-orange-200",
      accent: "text-orange-700",
    },
  ],
  [
    ["receivables", "cartera"],
    {
      emoji: "📒",
      gradient: "from-cyan-100 via-sky-50 to-white",
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
      gradient: "from-slate-100 via-slate-50 to-white",
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
      className={`group relative flex min-h-[230px] flex-col overflow-hidden rounded-2xl border bg-gradient-to-br p-4 shadow-[0_18px_45px_-36px_rgba(15,23,42,0.7)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_55px_-34px_rgba(15,23,42,0.55)] dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 ${visual.gradient} ${visual.border} dark:border-slate-700`}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`grid h-11 w-11 place-items-center rounded-xl border bg-white text-xl shadow-sm transition group-hover:scale-105 dark:bg-slate-800 ${visual.border}`}
          aria-hidden="true"
        >
          {visual.emoji}
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${product.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}
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
          className={`text-xs font-semibold uppercase tracking-[0.12em] ${visual.accent}`}
        >
          {productTypeLabel(product.product_type, english)}
        </p>
        <h3 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">
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
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          <PencilLine className="h-4 w-4" />
          {english ? "Configure" : "Configurar"}
        </button>
      </div>
    </article>
  );
}
