export const enCA = {
  billingDayLabel: (day: number) => `Day ${day} of each month`,
  recovery: {
    loadError: 'Unable to retrieve the subscription.',
    portalError: 'Unable to open the billing portal.',
    loading: 'Checking the current commercial status...',
    title: 'Commercial status',
    syncing: 'Syncing',
    enabled: 'Account operations are enabled.',
    actionRequired: 'Update billing to restore full account operations.',
    manage: 'Manage in Stripe',
  },
  storage: {
    title: 'Account storage',
    summary: (purchased: number, benefit: number) =>
      `5 GiB included · ${purchased} purchased · ${benefit} courtesy`,
    usageLabel: 'Storage usage',
    note: 'Includes saved files and reserved uploads. Storage block purchases will be enabled once commercial pricing is approved.',
  },
} as const;
