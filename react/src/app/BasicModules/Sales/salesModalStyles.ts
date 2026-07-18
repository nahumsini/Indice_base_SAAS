export type SalesModalTone = 'coral' | 'aqua' | 'yellow' | 'graphite';

const toneStyles = {
  coral: {
    solid: 'bg-[#FF6B5E]',
    title: 'text-white',
    description: 'text-white/85',
    icon: 'text-white',
    close: 'flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white opacity-100 hover:bg-white/25 hover:text-white focus:ring-white/50 focus:ring-offset-0 data-[state=open]:bg-white/20 data-[state=open]:text-white',
    primary: 'h-11 rounded-xl bg-white px-5 text-sm font-semibold text-[#B63B32] shadow-sm hover:bg-white/90 focus-visible:ring-white/40 disabled:bg-white/60 disabled:text-[#B63B32]/50',
    secondary: 'h-11 rounded-xl border-white/60 bg-transparent px-5 text-sm font-semibold text-white hover:bg-white/15 hover:text-white focus-visible:ring-white/40 disabled:border-white/25 disabled:text-white/45',
  },
  aqua: {
    solid: 'bg-[#59C3A5]',
    title: 'text-white',
    description: 'text-white/85',
    icon: 'text-white',
    close: 'flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white opacity-100 hover:bg-white/25 hover:text-white focus:ring-white/50 focus:ring-offset-0 data-[state=open]:bg-white/20 data-[state=open]:text-white',
    primary: 'h-11 rounded-xl bg-white px-5 text-sm font-semibold text-[#177D66] shadow-sm hover:bg-white/90 focus-visible:ring-white/40 disabled:bg-white/60 disabled:text-[#177D66]/50',
    secondary: 'h-11 rounded-xl border-white/60 bg-transparent px-5 text-sm font-semibold text-white hover:bg-white/15 hover:text-white focus-visible:ring-white/40 disabled:border-white/25 disabled:text-white/45',
  },
  yellow: {
    solid: 'bg-[#F4C84A]',
    title: 'text-[#222831]',
    description: 'text-[#222831]/75',
    icon: 'text-[#222831]',
    close: 'flex h-10 w-10 items-center justify-center rounded-full border border-[#222831]/20 bg-[#222831]/10 text-[#222831] opacity-100 hover:bg-[#222831]/15 hover:text-[#222831] focus:ring-[#222831]/30 focus:ring-offset-0 data-[state=open]:bg-[#222831]/15 data-[state=open]:text-[#222831]',
    primary: 'h-11 rounded-xl bg-white px-5 text-sm font-semibold text-[#9A6B05] shadow-sm hover:bg-white/90 focus-visible:ring-[#222831]/30 disabled:bg-white/60 disabled:text-[#9A6B05]/50',
    secondary: 'h-11 rounded-xl border-[#222831]/40 bg-transparent px-5 text-sm font-semibold text-[#222831] hover:bg-white/20 hover:text-[#222831] focus-visible:ring-[#222831]/30 disabled:border-[#222831]/20 disabled:text-[#222831]/45',
  },
  graphite: {
    solid: 'bg-[#222831]',
    title: 'text-white',
    description: 'text-white/80',
    icon: 'text-white',
    close: 'flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white opacity-100 hover:bg-white/25 hover:text-white focus:ring-white/50 focus:ring-offset-0 data-[state=open]:bg-white/20 data-[state=open]:text-white',
    primary: 'h-11 rounded-xl bg-white px-5 text-sm font-semibold text-[#222831] shadow-sm hover:bg-white/90 focus-visible:ring-white/40 disabled:bg-white/60 disabled:text-[#222831]/50',
    secondary: 'h-11 rounded-xl border-white/60 bg-transparent px-5 text-sm font-semibold text-white hover:bg-white/15 hover:text-white focus-visible:ring-white/40 disabled:border-white/25 disabled:text-white/45',
  },
} as const;

export function getSalesModalStyles(tone: SalesModalTone) {
  const theme = toneStyles[tone];

  return {
    close: theme.close,
    content: 'flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-none flex-col overflow-hidden rounded-[24px] border border-slate-200/80 bg-white p-0 shadow-[0_30px_80px_rgba(15,23,42,0.26)] sm:max-h-[92dvh] sm:rounded-[28px] dark:border-slate-700 dark:bg-slate-900',
    header: `${theme.solid} shrink-0 px-5 py-5 pr-16 sm:px-7 sm:py-6`,
    title: `text-xl font-bold leading-tight tracking-normal sm:text-2xl ${theme.title}`,
    smallTitle: `text-lg font-bold leading-tight tracking-normal sm:text-xl ${theme.title}`,
    description: `text-sm leading-6 ${theme.description}`,
    icon: theme.icon,
    body: 'min-h-0 flex-1 overflow-y-auto bg-slate-50 px-5 py-5 sm:px-7 sm:py-6 dark:bg-slate-950/80',
    footer: `${theme.solid} shrink-0 flex items-center justify-end gap-3 px-5 py-4 sm:px-7 sm:py-5`,
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
