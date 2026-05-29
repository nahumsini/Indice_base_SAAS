import { enCA } from './en-CA';

export const enUS = {
  ...enCA,
  subtitle: 'Connect opportunities, quotes, commercial closure, inventory readiness, finance validation, and after-sales follow-through.',
  tabs: {
    ...enCA.tabs,
    sales: {
      ...enCA.tabs.sales,
      summary: 'Use Sales to register won business and prepare the handoff to finance, inventory, commissions, and customer success.',
      value: 'A won quote is not the finish line. The sale record tells the company what must be validated and executed next.',
    },
    'after-sales': {
      ...enCA.tabs['after-sales'],
      value: 'Good post-sale control turns fulfilment into retention instead of loose follow-up.',
    },
  },
} as const;
