import type { DistributorPortalCopy } from './types';

export const enCA: DistributorPortalCopy = {
  navigation: { portalName: 'Distributor portal', local: 'Local', backToErp: 'Back to ERP' },
  tabs: { contractsAccess: 'Contracts & access', consulting: 'Consulting' },
  header: {
    eyebrow: 'Distribution operations',
    title: 'Contracts and access',
    subtitle: 'Follow every prospect linked to your portfolio from first access through an active contract.',
  },
  actions: { refresh: 'Refresh', refreshing: 'Refreshing…', view: 'View client', manage: 'Manage', addClient: 'Add client', extendTrial: 'Extend trial', close: 'Close' },
  metrics: {
    totalClients: 'Portfolio clients', prospects: 'Prospects', demosTrials: 'Demos and trials',
    activeContracts: 'Active contracts', attention: 'Needs attention',
  },
  filters: {
    title: 'Commercial portfolio', subtitle: 'Find a company by name, owner email or account number.',
    matches: 'clients match', search: 'Search', searchPlaceholder: 'Company, email or account number',
    stage: 'Commercial stage', allStages: 'All stages',
  },
  table: {
    title: 'Prospects and clients', subtitle: 'Only accounts formally linked to your distributor company appear here.',
    company: 'Company', stage: 'Stage', access: 'Access and modules', contract: 'Contract', users: 'Users',
    nextEvent: 'Next event', action: 'Action', noResults: 'No clients match the current filters.',
    noClients: 'Your linked portfolio is still empty.', noPlan: 'No contract', noModules: 'No modules enabled',
    noDate: 'No date scheduled', daysRemaining: 'days left', members: 'active', seats: 'capacity', review: 'Review payment',
  },
  detail: {
    eyebrow: 'Portfolio client', subtitle: 'Read-only commercial and access snapshot.', contact: 'Owner contact',
    country: 'Country', stage: 'Commercial stage', access: 'Access status', contract: 'Contract', billing: 'Billing status',
    modules: 'Enabled modules', capacity: 'User capacity', nextEvent: 'Next event',
    directPortfolio: 'This account is linked directly to your distributor company.',
  },
  states: { PROSPECT: 'Prospect', DEMO: 'Demo', TRIAL: 'Trial', ACTIVE: 'Active', ATTENTION: 'Attention', INACTIVE: 'Inactive' },
  errors: { title: 'The portfolio could not be loaded', retry: 'Try again', forbidden: 'This company does not have distributor portal access.' },
};
