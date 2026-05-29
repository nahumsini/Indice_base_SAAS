import { enCA } from './en-CA';

export const enUS = {
  ...enCA,
  header: {
    ...enCA.header,
    subtitle: 'Track closed-won sales, payment proof, validation progress, inventory readiness, and commissions.',
  },
  modal: {
    ...enCA.modal,
    operationalContext: {
      ...enCA.modal.operationalContext,
      taxIdentifier: 'Tax ID',
      fiscalAddress: 'Business Address',
    },
  },
  guidance: {
    ...enCA.guidance,
    sections: {
      ...enCA.guidance.sections,
      finance: {
        title: 'Finance Validation',
        body: 'Finance validates payment proof before the business treats the sale as financially approved.',
      },
    },
  },
} as const;
