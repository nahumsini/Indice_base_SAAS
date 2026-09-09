import {
  Boxes,
  Check,
  CircleDollarSign,
  Clock3,
  Grid2X2,
  ListChecks,
  LoaderCircle,
  MonitorSmartphone,
  ReceiptText,
  Send,
  ShoppingBag,
  UtensilsCrossed,
  UserRoundCheck,
  PackageCheck,
  WalletCards,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type {
  MultiKioskCard,
  MultiKioskCatalogTool,
} from '../../api/multiKiosks';
import { getModuleEmojiBySlug } from '../../config/moduleCatalog';
import { cn } from '../../components/ui/utils';

export type MultiKioskToolSource = MultiKioskCard | MultiKioskCatalogTool;

export const MULTI_KIOSK_TOOL_KEYS = [
  'employee.attendance@1',
  'employee.my-tasks@1',
  'provider.proposals@1',
  'provider.orders-and-invoices@1',
  'provider.payables@1',
  'provider.tracking@1',
] as const;

export type KnownMultiKioskToolKey = (typeof MULTI_KIOSK_TOOL_KEYS)[number];

export type MultiKioskToolTone = 'aqua' | 'blue' | 'coral' | 'green' | 'violet' | 'yellow';

export interface MultiKioskToolToneClasses {
  badge: string;
  glyph: string;
  glyphSelected: string;
  module: string;
  tileHover: string;
  tileSelected: string;
}

export const MULTI_KIOSK_TOOL_TONE_CLASSES: Readonly<Record<MultiKioskToolTone, MultiKioskToolToneClasses>> = {
  aqua: {
    badge: 'border-[#59C3A5]/45 bg-[#59C3A5]/10 text-[#177D66] dark:border-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-200',
    glyph: 'border-[#59C3A5]/45 bg-[#59C3A5]/15 text-[#177D66] dark:border-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-200',
    glyphSelected: 'border-[#177D66] bg-[#177D66] text-white dark:border-emerald-400 dark:bg-emerald-500 dark:text-slate-950',
    module: 'text-[#177D66] dark:text-emerald-300',
    tileHover: 'hover:border-[#59C3A5] hover:bg-[#59C3A5]/[0.06] focus-visible:ring-[#177D66]/25 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/20',
    tileSelected: 'border-[#59C3A5] bg-[#59C3A5]/[0.08] ring-2 ring-[#177D66]/15 dark:border-emerald-600 dark:bg-emerald-950/25',
  },
  blue: {
    badge: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/45 dark:text-blue-200',
    glyph: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/45 dark:text-blue-200',
    glyphSelected: 'border-blue-600 bg-blue-600 text-white dark:border-blue-400 dark:bg-blue-500 dark:text-white',
    module: 'text-blue-700 dark:text-blue-300',
    tileHover: 'hover:border-blue-300 hover:bg-blue-50/60 focus-visible:ring-blue-500/25 dark:hover:border-blue-800 dark:hover:bg-blue-950/20',
    tileSelected: 'border-blue-400 bg-blue-50/80 ring-2 ring-blue-500/15 dark:border-blue-700 dark:bg-blue-950/25',
  },
  coral: {
    badge: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/45 dark:text-rose-200',
    glyph: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/45 dark:text-rose-200',
    glyphSelected: 'border-[#E85D52] bg-[#E85D52] text-white dark:border-rose-400 dark:bg-rose-500 dark:text-white',
    module: 'text-[#C94840] dark:text-rose-300',
    tileHover: 'hover:border-rose-300 hover:bg-rose-50/60 focus-visible:ring-rose-500/25 dark:hover:border-rose-800 dark:hover:bg-rose-950/20',
    tileSelected: 'border-rose-400 bg-rose-50/80 ring-2 ring-rose-500/15 dark:border-rose-700 dark:bg-rose-950/25',
  },
  green: {
    badge: 'border-emerald-200 bg-emerald-50 text-[#147514] dark:border-emerald-800 dark:bg-emerald-950/45 dark:text-emerald-200',
    glyph: 'border-emerald-200 bg-emerald-50 text-[#147514] dark:border-emerald-800 dark:bg-emerald-950/45 dark:text-emerald-200',
    glyphSelected: 'border-[#147514] bg-[#147514] text-white dark:border-emerald-400 dark:bg-emerald-500 dark:text-slate-950',
    module: 'text-[#147514] dark:text-emerald-300',
    tileHover: 'hover:border-emerald-300 hover:bg-emerald-50/60 focus-visible:ring-emerald-500/25 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/20',
    tileSelected: 'border-emerald-400 bg-emerald-50/80 ring-2 ring-emerald-500/15 dark:border-emerald-700 dark:bg-emerald-950/25',
  },
  violet: {
    badge: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/45 dark:text-violet-200',
    glyph: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/45 dark:text-violet-200',
    glyphSelected: 'border-violet-600 bg-violet-600 text-white dark:border-violet-400 dark:bg-violet-500 dark:text-white',
    module: 'text-violet-700 dark:text-violet-300',
    tileHover: 'hover:border-violet-300 hover:bg-violet-50/60 focus-visible:ring-violet-500/25 dark:hover:border-violet-800 dark:hover:bg-violet-950/20',
    tileSelected: 'border-violet-400 bg-violet-50/80 ring-2 ring-violet-500/15 dark:border-violet-700 dark:bg-violet-950/25',
  },
  yellow: {
    badge: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/45 dark:text-amber-200',
    glyph: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/45 dark:text-amber-200',
    glyphSelected: 'border-[#C67A05] bg-[#C67A05] text-white dark:border-amber-400 dark:bg-amber-500 dark:text-slate-950',
    module: 'text-[#9A6400] dark:text-amber-300',
    tileHover: 'hover:border-amber-300 hover:bg-amber-50/60 focus-visible:ring-amber-500/25 dark:hover:border-amber-800 dark:hover:bg-amber-950/20',
    tileSelected: 'border-amber-400 bg-amber-50/80 ring-2 ring-amber-500/15 dark:border-amber-700 dark:bg-amber-950/25',
  },
};

export interface MultiKioskToolVisualDefinition {
  Icon: LucideIcon;
  tone: MultiKioskToolTone;
}

export const MULTI_KIOSK_TOOL_KEY_REGISTRY: Readonly<Record<KnownMultiKioskToolKey, MultiKioskToolVisualDefinition>> = {
  'employee.attendance@1': { Icon: UserRoundCheck, tone: 'aqua' },
  'employee.my-tasks@1': { Icon: ListChecks, tone: 'yellow' },
  'provider.proposals@1': { Icon: Send, tone: 'blue' },
  'provider.orders-and-invoices@1': { Icon: PackageCheck, tone: 'coral' },
  'provider.payables@1': { Icon: ReceiptText, tone: 'green' },
  'provider.tracking@1': { Icon: CircleDollarSign, tone: 'violet' },
};

export const MULTI_KIOSK_WORKSPACE_KIND_REGISTRY: Readonly<Record<string, MultiKioskToolVisualDefinition>> = {
  ATTENDANCE: { Icon: Clock3, tone: 'aqua' },
  MY_TASKS: { Icon: ListChecks, tone: 'yellow' },
  TASKS: { Icon: ListChecks, tone: 'yellow' },
  PETTY_CASH: { Icon: WalletCards, tone: 'green' },
  PAYABLES: { Icon: ReceiptText, tone: 'green' },
  ACCOUNTS_PAYABLE: { Icon: ReceiptText, tone: 'green' },
  POS_SELF_SERVICE: { Icon: ShoppingBag, tone: 'coral' },
  POS_WAITER_STATION: { Icon: UtensilsCrossed, tone: 'coral' },
  SELF_SERVICE: { Icon: ShoppingBag, tone: 'coral' },
  WAITER_STATION: { Icon: UtensilsCrossed, tone: 'coral' },
  PROVIDER_PROPOSALS: { Icon: Send, tone: 'blue' },
  PROVIDER_ORDERS_INVOICES: { Icon: PackageCheck, tone: 'coral' },
  PROVIDER_PAYABLES: { Icon: ReceiptText, tone: 'green' },
  PROVIDER_TRACKING: { Icon: CircleDollarSign, tone: 'violet' },
};

const ownerModuleRegistry: Readonly<Record<string, MultiKioskToolVisualDefinition>> = {
  HUMAN_RESOURCES: { Icon: UserRoundCheck, tone: 'aqua' },
  PROCESS_TASKS: { Icon: ListChecks, tone: 'yellow' },
  PETTY_CASH: { Icon: WalletCards, tone: 'green' },
  EXPENSES: { Icon: WalletCards, tone: 'green' },
  SALES: { Icon: ShoppingBag, tone: 'coral' },
  POINT_OF_SALE: { Icon: MonitorSmartphone, tone: 'coral' },
  INVENTORY: { Icon: Boxes, tone: 'coral' },
  PROCUREMENT: { Icon: PackageCheck, tone: 'coral' },
  PROVIDER_CENTER: { Icon: CircleDollarSign, tone: 'violet' },
};

const toolKeyModuleSlugRegistry: Readonly<Record<KnownMultiKioskToolKey, string>> = {
  'employee.attendance@1': 'human_resources',
  'employee.my-tasks@1': 'processes',
  'provider.proposals@1': 'pos',
  'provider.orders-and-invoices@1': 'pos',
  'provider.payables@1': 'expenses',
  'provider.tracking@1': 'expenses',
};

const workspaceModuleSlugRegistry: Readonly<Record<string, string>> = {
  ATTENDANCE: 'human_resources',
  MY_TASKS: 'processes',
  TASKS: 'processes',
  PETTY_CASH: 'petty_cash',
  PAYABLES: 'expenses',
  ACCOUNTS_PAYABLE: 'expenses',
  POS_SELF_SERVICE: 'pos',
  POS_WAITER_STATION: 'pos',
  SELF_SERVICE: 'pos',
  WAITER_STATION: 'pos',
  PROVIDER_PROPOSALS: 'pos',
  PROVIDER_ORDERS_INVOICES: 'pos',
  PROVIDER_PAYABLES: 'expenses',
  PROVIDER_TRACKING: 'expenses',
};

const ownerModuleSlugRegistry: Readonly<Record<string, string>> = {
  HUMAN_RESOURCES: 'human_resources',
  PROCESS_TASKS: 'processes',
  PETTY_CASH: 'petty_cash',
  EXPENSES: 'expenses',
  SALES: 'sales',
  POINT_OF_SALE: 'pos',
  INVENTORY: 'inventory',
  PROCUREMENT: 'pos',
  PROVIDER_CENTER: 'expenses',
};

const fallbackVisual: MultiKioskToolVisualDefinition = { Icon: Grid2X2, tone: 'blue' };

const normalizeKey = (value?: string | null) => (value ?? '').trim().toLocaleLowerCase();
const normalizeKind = (value?: string | null) => (value ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');

const isLauncherCard = (source: MultiKioskToolSource): source is MultiKioskCard => 'module' in source;

export interface MultiKioskToolPresentation extends MultiKioskToolVisualDefinition {
  description: string;
  emoji: string;
  name: string;
  ownerModule: string;
  toneClasses: MultiKioskToolToneClasses;
  toolKey: string;
  workspaceKind: string;
}

export function getMultiKioskToolPresentation(source: MultiKioskToolSource): MultiKioskToolPresentation {
  const toolKey = normalizeKey(isLauncherCard(source) ? source.tool_key : source.key);
  const workspaceKind = normalizeKind(source.workspace_kind || source.kiosk_type);
  const ownerModule = normalizeKind(isLauncherCard(source) ? source.module : source.owner_module);
  const moduleSlug = (toolKey && toolKey in toolKeyModuleSlugRegistry
    ? toolKeyModuleSlugRegistry[toolKey as KnownMultiKioskToolKey]
    : undefined)
    ?? workspaceModuleSlugRegistry[workspaceKind]
    ?? ownerModuleSlugRegistry[ownerModule]
    ?? source.module_slug;
  const visual = (toolKey && toolKey in MULTI_KIOSK_TOOL_KEY_REGISTRY
    ? MULTI_KIOSK_TOOL_KEY_REGISTRY[toolKey as KnownMultiKioskToolKey]
    : undefined)
    ?? MULTI_KIOSK_WORKSPACE_KIND_REGISTRY[workspaceKind]
    ?? ownerModuleRegistry[ownerModule]
    ?? fallbackVisual;

  return {
    ...visual,
    description: isLauncherCard(source) ? source.purpose : source.description,
    emoji: getModuleEmojiBySlug(moduleSlug) ?? '🧩',
    name: source.name,
    ownerModule,
    toneClasses: MULTI_KIOSK_TOOL_TONE_CLASSES[visual.tone],
    toolKey,
    workspaceKind,
  };
}

/** Stable presentation identity. It never grants access or replaces the opaque launch id. */
export function getMultiKioskToolIdentity(source: MultiKioskToolSource): string {
  const presentation = getMultiKioskToolPresentation(source);
  if (presentation.toolKey) return presentation.toolKey;
  // Legacy compositions can contain several definitions of the same module and type.
  // Their launch handle is not authority; every open still passes backend authorization.
  if (isLauncherCard(source)) return `legacy:${source.id}`;
  return [presentation.ownerModule, presentation.workspaceKind]
    .filter(Boolean)
    .join(':')
    .toLocaleLowerCase();
}

export const toolIdentity = getMultiKioskToolIdentity;

export function MultiKioskToolGlyph({
  busy = false,
  className,
  selected = false,
  source,
}: {
  busy?: boolean;
  className?: string;
  selected?: boolean;
  source: MultiKioskToolSource;
}) {
  const presentation = getMultiKioskToolPresentation(source);
  const Icon = presentation.Icon;

  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl border transition-colors',
        selected ? presentation.toneClasses.glyphSelected : presentation.toneClasses.glyph,
        className,
      )}
    >
      {busy ? <LoaderCircle className="h-6 w-6 animate-spin" /> : <Icon className="h-6 w-6" />}
      {selected && !busy ? (
        <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full border-2 border-white bg-slate-950 text-white shadow-sm dark:border-slate-950 dark:bg-white dark:text-slate-950">
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      ) : null}
    </span>
  );
}

/** Compact app-style identity for the employee launcher. Authority remains server-side. */
export function MultiKioskToolEmoji({
  busy = false,
  className,
  selected = false,
  source,
}: {
  busy?: boolean;
  className?: string;
  selected?: boolean;
  source: MultiKioskToolSource;
}) {
  const presentation = getMultiKioskToolPresentation(source);

  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative grid h-12 w-12 shrink-0 place-items-center rounded-[14px] border transition-colors',
        selected ? presentation.toneClasses.glyphSelected : presentation.toneClasses.glyph,
        className,
      )}
      data-kiosk-tool-emoji
    >
      {busy ? (
        <LoaderCircle className="h-5 w-5 animate-spin" />
      ) : (
        <span className="text-[1.55rem] leading-none">{presentation.emoji}</span>
      )}
      {selected && !busy ? (
        <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full border-2 border-white bg-slate-950 text-white shadow-sm dark:border-slate-950 dark:bg-white dark:text-slate-950">
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      ) : null}
    </span>
  );
}
