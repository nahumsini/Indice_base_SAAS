export const INDICE_BRAND_COLORS = {
  coral: '#FF6B5E',
  coralHover: '#E8564B',
  yellow: '#F4C84A',
  yellowHover: '#E5B835',
  aqua: '#59C3A5',
  aquaHover: '#3AAE90',
  blue: '#2563EB',
  blueHover: '#1D4ED8',
  blueDeep: '#143675',
  graphite: '#222831',
  background: '#F7F8FA',
  border: '#D8DCE3',
  muted: '#6B7280',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
} as const;

export type IndiceModuleTone =
  | 'aqua'
  | 'blue'
  | 'coral'
  | 'yellow'
  | 'green'
  | 'orange'
  | 'purple'
  | 'red'
  | 'gray'
  | 'gold';

export const MODULE_COLORS: Record<IndiceModuleTone, {
  primary: string;
  primaryHover: string;
  lightBg: string;
  darkBg: string;
  border: string;
  darkBorder: string;
  text: string;
  darkText: string;
  button: string;
  iconHover: string;
}> = {
  aqua: {
    primary: INDICE_BRAND_COLORS.aqua,
    primaryHover: INDICE_BRAND_COLORS.aquaHover,
    lightBg: 'bg-[#59C3A5]/5',
    darkBg: 'dark:bg-[#59C3A5]/10',
    border: 'border-[#59C3A5]/20',
    darkBorder: 'dark:border-[#59C3A5]/30',
    text: 'text-[#257B68]',
    darkText: 'dark:text-[#8FE0CA]',
    button: 'bg-[#59C3A5] hover:bg-[#3AAE90]',
    iconHover: 'hover:bg-[#59C3A5]/5',
  },
  blue: {
    primary: INDICE_BRAND_COLORS.blue,
    primaryHover: INDICE_BRAND_COLORS.blueHover,
    lightBg: 'bg-[#2563EB]/5',
    darkBg: 'dark:bg-[#2563EB]/10',
    border: 'border-[#2563EB]/20',
    darkBorder: 'dark:border-[#2563EB]/30',
    text: 'text-[#2563EB]',
    darkText: 'dark:text-[#93C5FD]',
    button: 'bg-[#2563EB] hover:bg-[#1D4ED8]',
    iconHover: 'hover:bg-[#2563EB]/5',
  },
  coral: {
    primary: INDICE_BRAND_COLORS.coral,
    primaryHover: INDICE_BRAND_COLORS.coralHover,
    lightBg: 'bg-[#FF6B5E]/5',
    darkBg: 'dark:bg-[#FF6B5E]/10',
    border: 'border-[#FF6B5E]/20',
    darkBorder: 'dark:border-[#FF6B5E]/30',
    text: 'text-[#B63B32]',
    darkText: 'dark:text-[#FFB0AA]',
    button: 'bg-[#FF6B5E] hover:bg-[#E8564B]',
    iconHover: 'hover:bg-[#FF6B5E]/5',
  },
  yellow: {
    primary: INDICE_BRAND_COLORS.yellow,
    primaryHover: INDICE_BRAND_COLORS.yellowHover,
    lightBg: 'bg-[#F4C84A]/5',
    darkBg: 'dark:bg-[#F4C84A]/10',
    border: 'border-[#F4C84A]/30',
    darkBorder: 'dark:border-[#F4C84A]/35',
    text: 'text-[#9A6B05]',
    darkText: 'dark:text-[#FEF3C7]',
    button: 'bg-[#F4C84A] hover:bg-[#E5B835] text-[#222831]',
    iconHover: 'hover:bg-[#F4C84A]/10',
  },
  green: {
    primary: '#147514',
    primaryHover: '#0F5C0F',
    lightBg: 'bg-[#147514]/5',
    darkBg: 'dark:bg-[#147514]/10',
    border: 'border-[#147514]/20',
    darkBorder: 'dark:border-[#147514]/30',
    text: 'text-[#147514]',
    darkText: 'dark:text-[#8ED48E]',
    button: 'bg-[#147514] hover:bg-[#0F5C0F]',
    iconHover: 'hover:bg-[#147514]/5',
  },
  orange: {
    primary: INDICE_BRAND_COLORS.coral,
    primaryHover: INDICE_BRAND_COLORS.coralHover,
    lightBg: 'bg-[#FF6B5E]/5',
    darkBg: 'dark:bg-[#FF6B5E]/10',
    border: 'border-[#FF6B5E]/20',
    darkBorder: 'dark:border-[#FF6B5E]/30',
    text: 'text-[#B63B32]',
    darkText: 'dark:text-[#FFB0AA]',
    button: 'bg-[#FF6B5E] hover:bg-[#E8564B]',
    iconHover: 'hover:bg-[#FF6B5E]/5',
  },
  purple: {
    primary: INDICE_BRAND_COLORS.blue,
    primaryHover: INDICE_BRAND_COLORS.blueHover,
    lightBg: 'bg-[#2563EB]/5',
    darkBg: 'dark:bg-[#2563EB]/10',
    border: 'border-[#2563EB]/20',
    darkBorder: 'dark:border-[#2563EB]/30',
    text: 'text-[#2563EB]',
    darkText: 'dark:text-[#93C5FD]',
    button: 'bg-[#2563EB] hover:bg-[#1D4ED8]',
    iconHover: 'hover:bg-[#2563EB]/5',
  },
  red: {
    primary: INDICE_BRAND_COLORS.error,
    primaryHover: '#DC2626',
    lightBg: 'bg-[#EF4444]/5',
    darkBg: 'dark:bg-[#EF4444]/10',
    border: 'border-[#EF4444]/20',
    darkBorder: 'dark:border-[#EF4444]/30',
    text: 'text-[#B91C1C]',
    darkText: 'dark:text-[#FCA5A5]',
    button: 'bg-[#EF4444] hover:bg-[#DC2626]',
    iconHover: 'hover:bg-[#EF4444]/5',
  },
  gray: {
    primary: '#64748B',
    primaryHover: '#475569',
    lightBg: 'bg-slate-50',
    darkBg: 'dark:bg-slate-800',
    border: 'border-slate-200',
    darkBorder: 'dark:border-slate-700',
    text: 'text-slate-600',
    darkText: 'dark:text-slate-300',
    button: 'bg-slate-600 hover:bg-slate-700',
    iconHover: 'hover:bg-slate-50',
  },
  gold: {
    primary: INDICE_BRAND_COLORS.yellow,
    primaryHover: INDICE_BRAND_COLORS.yellowHover,
    lightBg: 'bg-[#F4C84A]/5',
    darkBg: 'dark:bg-[#F4C84A]/10',
    border: 'border-[#F4C84A]/30',
    darkBorder: 'dark:border-[#F4C84A]/35',
    text: 'text-[#9A6B05]',
    darkText: 'dark:text-[#FEF3C7]',
    button: 'bg-[#F4C84A] hover:bg-[#E5B835] text-[#222831]',
    iconHover: 'hover:bg-[#F4C84A]/10',
  },
} as const;
