import type { SalesContact, SalesOpportunity, SalesQuote } from '../../types';

export type ContactFiscalState = 'ready' | 'partial' | 'missing';
export type ContactRelationshipState = 'customer' | 'overdue' | 'activeOpportunity' | 'quoted' | 'noActivity';

export type ContactFiscalSignal = {
  state: ContactFiscalState;
  label: string;
  detail: string;
};

export type ContactRelationshipSignal = {
  state: ContactRelationshipState;
  label: string;
  detail: string;
  opportunityCount: number;
  quoteCount: number;
};

function hasValue(value?: string | null) {
  return Boolean(value?.trim());
}

function formatCount(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function getContactFiscalSignal(contact: SalesContact): ContactFiscalSignal {
  const primaryFields = [
    contact.fiscalCountry,
    contact.fiscalLegalName,
    contact.fiscalTaxId,
    contact.fiscalEmail,
  ];
  const secondaryFields = [
    contact.fiscalRegistryId,
    contact.fiscalAddressLine1,
    contact.fiscalAddressLine2,
    contact.fiscalCity,
    contact.fiscalState,
    contact.fiscalPostalCode,
    contact.fiscalRegime,
    contact.fiscalNotes,
  ];
  const completedPrimaryFields = primaryFields.filter(hasValue).length;
  const hasAnyFiscalData = [...primaryFields, ...secondaryFields].some(hasValue);

  if (completedPrimaryFields >= 4) {
    return {
      state: 'ready',
      label: 'Fiscal ready',
      detail: contact.fiscalCountry ? `Country: ${contact.fiscalCountry}` : 'Ready for documents',
    };
  }

  if (hasAnyFiscalData) {
    return {
      state: 'partial',
      label: 'Fiscal partial',
      detail: `${completedPrimaryFields}/4 required fields`,
    };
  }

  return {
    state: 'missing',
    label: 'No fiscal data',
    detail: 'Missing billing profile',
  };
}

export function getContactRelationshipSignal({
  contact,
  opportunities,
  quotes,
}: {
  contact: SalesContact;
  opportunities: SalesOpportunity[];
  quotes: SalesQuote[];
}): ContactRelationshipSignal {
  const linkedOpportunities = opportunities.filter((opportunity) => opportunity.contactId === contact.id);
  const linkedQuotes = quotes.filter((quote) => quote.clientId === contact.id);
  const activeOpportunities = linkedOpportunities.filter((opportunity) => (
    opportunity.status !== 'Closed' && opportunity.stage !== 'Won' && opportunity.stage !== 'Lost'
  ));
  const overdueOpportunities = linkedOpportunities.filter((opportunity) => opportunity.status === 'Overdue');
  const customerSignals = [
    ...linkedOpportunities.filter((opportunity) => opportunity.stage === 'Won'),
    ...linkedQuotes.filter((quote) => quote.status === 'Approved' || quote.status === 'Closed Won'),
  ];

  if (customerSignals.length > 0) {
    return {
      state: 'customer',
      label: 'Customer',
      detail: `${formatCount(linkedOpportunities.length, 'opportunity', 'opportunities')} · ${formatCount(linkedQuotes.length, 'quote', 'quotes')}`,
      opportunityCount: linkedOpportunities.length,
      quoteCount: linkedQuotes.length,
    };
  }

  if (overdueOpportunities.length > 0) {
    return {
      state: 'overdue',
      label: 'Overdue follow-up',
      detail: `${formatCount(overdueOpportunities.length, 'overdue opportunity', 'overdue opportunities')}`,
      opportunityCount: linkedOpportunities.length,
      quoteCount: linkedQuotes.length,
    };
  }

  if (activeOpportunities.length > 0) {
    return {
      state: 'activeOpportunity',
      label: 'Active opportunity',
      detail: `${formatCount(activeOpportunities.length, 'open opportunity', 'open opportunities')}`,
      opportunityCount: linkedOpportunities.length,
      quoteCount: linkedQuotes.length,
    };
  }

  if (linkedQuotes.length > 0) {
    return {
      state: 'quoted',
      label: 'Linked quotes',
      detail: formatCount(linkedQuotes.length, 'quote', 'quotes'),
      opportunityCount: linkedOpportunities.length,
      quoteCount: linkedQuotes.length,
    };
  }

  return {
    state: 'noActivity',
    label: 'No activity yet',
    detail: 'No linked sales records',
    opportunityCount: 0,
    quoteCount: 0,
  };
}
