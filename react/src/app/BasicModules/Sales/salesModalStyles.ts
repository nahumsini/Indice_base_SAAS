export type SalesModalTone = 'coral' | 'aqua' | 'yellow' | 'graphite';

const toneStyles = {
  coral: {
    solid: 'bg-[#FF6B5E]',
    title: 'text-white',
    description: 'text-white/85',
    icon: 'text-white',
    close: 'rounded-full bg-white/15 text-white opacity-100 hover:bg-white/25 hover:text-white focus:ring-white/50 focus:ring-offset-0 data-[state=open]:bg-white/20 data-[state=open]:text-white',
    primary: 'rounded-lg bg-white text-[#B63B32] shadow-sm hover:bg-white/90',
    secondary: 'rounded-lg border-white/60 bg-transparent text-white hover:bg-white/15 hover:text-white',
  },
  aqua: {
    solid: 'bg-[#59C3A5]',
    title: 'text-white',
    description: 'text-white/85',
    icon: 'text-white',
    close: 'rounded-full bg-white/15 text-white opacity-100 hover:bg-white/25 hover:text-white focus:ring-white/50 focus:ring-offset-0 data-[state=open]:bg-white/20 data-[state=open]:text-white',
    primary: 'rounded-lg bg-white text-[#177D66] shadow-sm hover:bg-white/90',
    secondary: 'rounded-lg border-white/60 bg-transparent text-white hover:bg-white/15 hover:text-white',
  },
  yellow: {
    solid: 'bg-[#F4C84A]',
    title: 'text-[#222831]',
    description: 'text-[#222831]/75',
    icon: 'text-[#222831]',
    close: 'rounded-full bg-[#222831]/10 text-[#222831] opacity-100 hover:bg-[#222831]/15 hover:text-[#222831] focus:ring-[#222831]/30 focus:ring-offset-0 data-[state=open]:bg-[#222831]/15 data-[state=open]:text-[#222831]',
    primary: 'rounded-lg bg-white text-[#9A6B05] shadow-sm hover:bg-white/90',
    secondary: 'rounded-lg border-[#222831]/40 bg-transparent text-[#222831] hover:bg-white/20 hover:text-[#222831]',
  },
  graphite: {
    solid: 'bg-[#222831]',
    title: 'text-white',
    description: 'text-white/80',
    icon: 'text-white',
    close: 'rounded-full bg-white/15 text-white opacity-100 hover:bg-white/25 hover:text-white focus:ring-white/50 focus:ring-offset-0 data-[state=open]:bg-white/20 data-[state=open]:text-white',
    primary: 'rounded-lg bg-white text-[#222831] shadow-sm hover:bg-white/90',
    secondary: 'rounded-lg border-white/60 bg-transparent text-white hover:bg-white/15 hover:text-white',
  },
} as const;

export function getSalesModalStyles(tone: SalesModalTone) {
  const theme = toneStyles[tone];

  return {
    close: theme.close,
    content: 'overflow-hidden rounded-xl border border-slate-200 bg-white p-0 shadow-2xl',
    header: `${theme.solid} px-6 py-4 pr-14`,
    title: `flex items-center gap-2 text-2xl font-black tracking-tight ${theme.title}`,
    smallTitle: `flex items-center gap-2 text-xl font-black tracking-tight ${theme.title}`,
    description: `text-sm leading-6 ${theme.description}`,
    icon: theme.icon,
    body: 'max-h-[calc(90vh-150px)] overflow-y-auto px-6 py-5',
    footer: `${theme.solid} px-6 py-4`,
    primaryButton: theme.primary,
    secondaryButton: theme.secondary,
  };
}
