import { enCA } from './en-CA';

export const frCA = {
  ...enCA,
  common: { ...enCA.common, all: 'Tous', cancel: 'Annuler', close: 'Fermer', save: 'Enregistrer la vente', view: 'Voir la vente' },
  header: {
    emoji: '💼',
    title: 'Ventes',
    subtitle: 'Suivez les ventes gagnées, les preuves de paiement, les validations, l’inventaire et les commissions.',
    columnsAction: 'Colonnes',
    primaryAction: 'Nouvelle vente',
  },
  filters: {
    ...enCA.filters,
    title: 'Filtres',
    search: 'Recherche',
    businessUnit: 'Unité d’affaires',
    business: 'Activité',
    period: 'Période',
    seller: 'Vendeur',
    customer: 'Client',
    periodOptions: {
      today: 'Aujourd’hui',
      thisWeek: 'Cette semaine',
      thisMonth: 'Ce mois-ci',
      lastMonth: 'Mois dernier',
      custom: 'Plage personnalisée',
    },
  },
  kpis: {
    totalSalesAmount: 'Montant total des ventes',
    totalCommissions: 'Commissions totales',
    averageTicket: 'Panier moyen',
    salesCount: 'Nombre de ventes',
    pendingFinanceValidation: 'Validation finance en attente',
    pendingInventoryMovement: 'Mouvement inventaire en attente',
    deliveredSales: 'Ventes livrées',
  },
  insight: {
    summary: (totalAmount: string, totalCommissions: string, visible: number, total: number) => (
      `Résumé des ventes : ${totalAmount} de ventes · ${totalCommissions} en commissions · ${visible} ventes · affichage de ${visible} sur ${total}.`
    ),
  },
  statuses: {
    ...enCA.statuses,
    paymentEvidence: {
      missing: 'Manquante',
      uploaded: 'Téléversée',
      under_review: 'En révision',
      approved: 'Approuvée',
      rejected: 'Rejetée',
    },
  },
  guidance: {
    ...enCA.guidance,
    title: 'Guide opérationnel',
  },
} as const;
