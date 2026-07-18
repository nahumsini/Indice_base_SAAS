import { enCA } from './en-CA';
import type { SalesKpisTranslations } from './types';

export const enUS: SalesKpisTranslations = {
  ...enCA,
  header: {
    ...enCA.header,
    subtitle: 'Live sales board: leads, quotes, wins, customers, commissions, and commercial risk.',
  },
  filters: {
    ...enCA.filters,
    search: 'Search',
    unit: 'Unit',
    business: 'Business',
    seller: 'Seller',
  },
};
