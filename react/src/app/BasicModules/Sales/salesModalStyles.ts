export type SalesModalTone = 'coral' | 'aqua' | 'yellow' | 'graphite';

const toneStyles = {
  coral: {
    solid: 'bg-[#FF6B5E]',
    title: 'text-white',
    description: 'text-white/85',
    icon: 'text-white',
    close: 'rounded-full bg-white/15 text-white opacity-100 hover:bg-white/25 hover:text-white focus:ring-white/50 focus:ring-offset-0 data-[state=open]:bg-white/20 data-[state=open]:text-white',
    primary: 'h-11 rounded-xl bg-white px-5 text-sm font-bold text-[#B63B32] shadow-sm hover:bg-white/90 focus-visible:ring-white/40 disabled:bg-white/60 disabled:text-[#B63B32]/50',
    secondary: 'h-11 rounded-xl border-white/60 bg-transparent px-5 text-sm font-bold text-white hover:bg-white/15 hover:text-white focus-visible:ring-white/40 disabled:border-white/25 disabled:text-white/45',
  },
  aqua: {
    solid: 'bg-[#59C3A5]',
    title: 'text-white',
    description: 'text-white/85',
    icon: 'text-white',
    close: 'rounded-full bg-white/15 text-white opacity-100 hover:bg-white/25 hover:text-white focus:ring-white/50 focus:ring-offset-0 data-[state=open]:bg-white/20 data-[state=open]:text-white',
    primary: 'h-11 rounded-xl bg-white px-5 text-sm font-bold text-[#177D66] shadow-sm hover:bg-white/90 focus-visible:ring-white/40 disabled:bg-white/60 disabled:text-[#177D66]/50',
    secondary: 'h-11 rounded-xl border-white/60 bg-transparent px-5 text-sm font-bold text-white hover:bg-white/15 hover:text-white focus-visible:ring-white/40 disabled:border-white/25 disabled:text-white/45',
  },
  yellow: {
    solid: 'bg-[#F4C84A]',
    title: 'text-[#222831]',
    description: 'text-[#222831]/75',
    icon: 'text-[#222831]',
    close: 'rounded-full bg-[#222831]/10 text-[#222831] opacity-100 hover:bg-[#222831]/15 hover:text-[#222831] focus:ring-[#222831]/30 focus:ring-offset-0 data-[state=open]:bg-[#222831]/15 data-[state=open]:text-[#222831]',
    primary: 'h-11 rounded-xl bg-white px-5 text-sm font-bold text-[#9A6B05] shadow-sm hover:bg-white/90 focus-visible:ring-[#222831]/30 disabled:bg-white/60 disabled:text-[#9A6B05]/50',
    secondary: 'h-11 rounded-xl border-[#222831]/40 bg-transparent px-5 text-sm font-bold text-[#222831] hover:bg-white/20 hover:text-[#222831] focus-visible:ring-[#222831]/30 disabled:border-[#222831]/20 disabled:text-[#222831]/45',
  },
  graphite: {
    solid: 'bg-[#222831]',
    title: 'text-white',
    description: 'text-white/80',
    icon: 'text-white',
    close: 'rounded-full bg-white/15 text-white opacity-100 hover:bg-white/25 hover:text-white focus:ring-white/50 focus:ring-offset-0 data-[state=open]:bg-white/20 data-[state=open]:text-white',
    primary: 'h-11 rounded-xl bg-white px-5 text-sm font-bold text-[#222831] shadow-sm hover:bg-white/90 focus-visible:ring-white/40 disabled:bg-white/60 disabled:text-[#222831]/50',
    secondary: 'h-11 rounded-xl border-white/60 bg-transparent px-5 text-sm font-bold text-white hover:bg-white/15 hover:text-white focus-visible:ring-white/40 disabled:border-white/25 disabled:text-white/45',
  },
} as const;

export function getSalesModalStyles(tone: SalesModalTone) {
  const theme = toneStyles[tone];

  return {
    close: theme.close,
    content: 'w-[min(96vw,920px)] overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-0 shadow-[0_30px_80px_rgba(15,23,42,0.22)] dark:border-slate-700 dark:bg-slate-900',
    header: `${theme.solid} px-7 py-6 pr-16`,
    title: `flex items-center gap-3 text-2xl font-black tracking-tight ${theme.title}`,
    smallTitle: `flex items-center gap-3 text-xl font-black tracking-tight ${theme.title}`,
    description: `text-sm leading-6 ${theme.description}`,
    icon: theme.icon,
    body: 'max-h-[calc(90vh-170px)] overflow-y-auto bg-slate-50 px-7 py-6 dark:bg-slate-950/80',
    footer: `${theme.solid} flex items-center justify-end gap-3 px-7 py-5`,
    primaryButton: theme.primary,
    secondaryButton: theme.secondary,
  };
}

export function getSalesModalActionClassNames(tone: SalesModalTone = 'coral') {
  const modalStyles = getSalesModalStyles(tone);

  return {
    primary: modalStyles.primaryButton,
    secondary: modalStyles.secondaryButton,
  };
}
