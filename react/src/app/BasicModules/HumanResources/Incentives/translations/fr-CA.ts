import { enCA } from './en-CA';
import type { IncentivesTranslations } from './types';

export const frCA = {
  ...enCA,
  title: 'Incitatifs',
  subtitle: 'Gérez les primes manuelles, règles automatisées et application à la paie.',
  actions: { columns: 'Colonnes', addIncentive: 'Ajouter un incitatif' },
  columns: { incentive: 'Incitatif', type: 'Type', scope: 'Portée', amount: 'Montant', application: 'Application', status: 'Statut' },
  filters: { ...enCA.filters, title: 'Filtres', searchLabel: 'Rechercher un incitatif', type: 'Type', status: 'Statut', allTypes: 'Tous les types', allStatuses: 'Tous les statuts' },
  types: { Automatizado: 'Automatisé', Manual: 'Manuel' },
  statuses: { Activo: 'Actif', Programado: 'Planifié', Pausado: 'En pause' },
  columnsModal: { ...enCA.columnsModal, title: 'Colonnes du tableau', close: 'Fermer le modal des colonnes', required: 'Requise', done: 'Terminé' },
} as const satisfies IncentivesTranslations;
