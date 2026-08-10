import type { BillingTranslations } from './types';

export const frCA = {
  billingDayLabel: (day: number) => `Jour ${day} de chaque mois`,
  recovery: {
    loadError: 'Impossible de consulter l’abonnement.',
    portalError: 'Impossible d’ouvrir le portail de facturation.',
    loading: 'Vérification de l’état commercial actuel...',
    title: 'État commercial',
    syncing: 'Synchronisation',
    enabled: 'Les opérations du compte sont activées.',
    actionRequired: 'Régularisez la facturation pour rétablir toutes les opérations.',
    manage: 'Gérer dans Stripe',
  },
  storage: {
    title: 'Stockage du compte',
    summary: (purchased: number, benefit: number) =>
      `5 Go inclus · ${purchased} achetés · ${benefit} offerts`,
    usageLabel: 'Utilisation du stockage',
    note: 'Comprend les fichiers enregistrés et les téléversements réservés. L’achat de blocs sera offert après l’approbation du tarif commercial.',
  },
} as const satisfies BillingTranslations;
