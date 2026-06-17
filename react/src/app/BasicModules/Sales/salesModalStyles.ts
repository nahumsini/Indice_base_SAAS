export type SalesModalTone = 'coral' | 'aqua' | 'yellow' | 'graphite';

const toneStyles = {
  coral: {
    solid: 'bg-[#FF6B5E]',
    title: 'text-white',
    description: 'text-white/85',
    icon: 'text-white',
    close: 'rounded-full bg-white/15 text-white opacity-100 hover:bg-white/25 hover:text-white focus:ring-white/50 focus:ring-offset-0 data-[state=open]:bg-white/20 data-[state=open]:text-white',
    primary: 'rounded-xl bg-white text-[#B63B32] shadow-sm hover:bg-white/90',
    secondary: 'rounded-xl border-white/60 bg-transparent text-white hover:bg-white/15 hover:text-white',
  },
  aqua: {
    solid: 'bg-[#59C3A5]',
    title: 'text-white',
    description: 'text-white/85',
    icon: 'text-white',
    close: 'rounded-full bg-white/15 text-white opacity-100 hover:bg-white/25 hover:text-white focus:ring-white/50 focus:ring-offset-0 data-[state=open]:bg-white/20 data-[state=open]:text-white',
    primary: 'rounded-xl bg-white text-[#177D66] shadow-sm hover:bg-white/90',
    secondary: 'rounded-xl border-white/60 bg-transparent text-white hover:bg-white/15 hover:text-white',
  },
  yellow: {
    solid: 'bg-[#F4C84A]',
    title: 'text-[#222831]',
    description: 'text-[#222831]/75',
    icon: 'text-[#222831]',
    close: 'rounded-full bg-[#222831]/10 text-[#222831] opacity-100 hover:bg-[#222831]/15 hover:text-[#222831] focus:ring-[#222831]/30 focus:ring-offset-0 data-[state=open]:bg-[#222831]/15 data-[state=open]:text-[#222831]',
    primary: 'rounded-xl bg-white text-[#9A6B05] shadow-sm hover:bg-white/90',
    secondary: 'rounded-xl border-[#222831]/40 bg-transparent text-[#222831] hover:bg-white/20 hover:text-[#222831]',
  },
  graphite: {
    solid: 'bg-[#222831]',
    title: 'text-white',
    description: 'text-white/80',
    icon: 'text-white',
    close: 'rounded-full bg-white/15 text-white opacity-100 hover:bg-white/25 hover:text-white focus:ring-white/50 focus:ring-offset-0 data-[state=open]:bg-white/20 data-[state=open]:text-white',
    primary: 'rounded-xl bg-white text-[#222831] shadow-sm hover:bg-white/90',
    secondary: 'rounded-xl border-white/60 bg-transparent text-white hover:bg-white/15 hover:text-white',
  },
} as const;

export function getSalesModalStyles(tone: SalesModalTone) {
  const theme = toneStyles[tone];

  return {
    close: theme.close,
    content: 'overflow-hidden rounded-[28px] border border-slate-200/80 bg-white p-0 shadow-[0_30px_80px_rgba(15,23,42,0.22)] dark:border-slate-700 dark:bg-slate-900',
    header: `${theme.solid} px-7 py-6 pr-16`,
    title: `flex items-center gap-3 text-2xl font-black tracking-tight ${theme.title}`,
    smallTitle: `flex items-center gap-3 text-xl font-black tracking-tight ${theme.title}`,
    description: `text-sm leading-6 ${theme.description}`,
    icon: theme.icon,
    body: 'max-h-[calc(90vh-170px)] overflow-y-auto bg-slate-50/70 px-7 py-6 dark:bg-slate-950/80',
    footer: `${theme.solid} px-7 py-5`,
    primaryButton: theme.primary,
    secondaryButton: theme.secondary,
  };
}
