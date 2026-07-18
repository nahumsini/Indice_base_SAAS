import { enCA } from './en-CA';
import type { SalesKpisTranslations } from './types';

export const frCA: SalesKpisTranslations = {
  ...enCA,
  header: {
    title: 'ICP commerciaux',
    subtitle: 'Tableau des ventes: occasions, devis, ventes gagnees, clients, commissions et risque commercial.',
  },
  filters: {
    title: 'Filtres',
    search: 'Recherche',
    unit: 'Unité',
    business: 'Activité',
    seller: 'Vendeur',
    allUnits: 'Toutes les unites',
    allBusinesses: 'Toutes les activites',
    allSellers: 'Tous les vendeurs',
    searchPlaceholder: 'Rechercher occasion, client ou vendeur',
  },
  signals: {
    ...enCA.signals,
    title: 'Signaux commerciaux',
    risk: 'Attention requise',
    stable: 'Operation stable',
    conversion: 'Conversion devis vers vente',
    inventoryReadiness: 'Preparation inventaire',
    commercialRisk: 'Risque commercial',
  },
};
