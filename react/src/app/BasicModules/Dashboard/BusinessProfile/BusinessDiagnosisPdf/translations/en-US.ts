import { enCA } from './en-CA';

export const enUS = {
  ...enCA,
  locale: 'en-US',
  moduleLabels: {
    ...enCA.moduleLabels,
    products: 'CRM / Point of Sale',
  },
} as const;
