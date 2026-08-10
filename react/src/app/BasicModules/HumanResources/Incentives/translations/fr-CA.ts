import { enCA } from './en-CA';
import type { IncentivesTranslations } from './types';
import { frCAIncentiveForm } from './formLocales';

export const frCA = {
  ...enCA,
  form: frCAIncentiveForm,
  title: 'Incitatifs',
  subtitle: 'Gérez les primes manuelles, règles automatisées et application à la paie.',
  actions: { columns: 'Colonnes', addIncentive: 'Ajouter un incitatif' },
  columns: { incentive: 'Incitatif', type: 'Catégorie', scope: 'Portée', amount: 'Montant', application: 'Mode d’application', status: 'Statut' },
  filters: { title: 'Filtres', searchLabel: 'Rechercher un incitatif', searchPlaceholder: 'Nom, portée, montant ou application', type: 'Catégorie', status: 'Statut', allTypes: 'Tous les types', allStatuses: 'Tous les statuts' },
  types: { Automatizado: 'Automatisé', Manual: 'Manuel' },
  statuses: { Activo: 'Actif', Programado: 'Planifié', Pausado: 'En pause' },
  kpis: {
    total: 'Total des incitatifs',
    active: 'Actifs',
    automated: 'Automatisés',
    manual: 'Manuels',
    visibleAfterFilters: 'visibles après filtres',
    eligibleEmployees: 'employés admissibles',
    summary: (activeCount: number, scheduledCount: number, pausedCount: number, selectedCount: number, visibleCount: number, totalCount: number) =>
      `Sommaire des incitatifs : ${activeCount} actifs · ${scheduledCount} planifiés · ${pausedCount} en pause · ${selectedCount} sélectionnés · ${visibleCount} sur ${totalCount} affichés.`,
  },
  columnsModal: { title: 'Colonnes du tableau', subtitle: 'Choisissez les colonnes d’incitatifs visibles dans cette vue.', close: 'Fermer le modal des colonnes', required: 'Requise', done: 'Terminé' },
  table: { empty: 'Aucun incitatif ne correspond aux filtres actuels.', showing: (count: number) => `${count} incitatifs affichés`, page: 'Page 1 de 1', previous: 'Précédent', next: 'Suivant' },
  pagination: {
    pageSize: 'Lignes par page',
    showing: (start: number, end: number, total: number) => `${start}-${end} sur ${total} incitatifs affichés`,
    page: (current: number, total: number) => `Page ${current} sur ${total}`,
    previous: 'Précédent',
    next: 'Suivant',
  },
  newIncentive: { selectedCollaborators: (count: number) => `${count} employés`, automatedRule: 'Règle automatisée', fixed: 'fixe', pending: 'En attente', nextPayroll: 'Prochaine paie' },
} as const satisfies IncentivesTranslations;
