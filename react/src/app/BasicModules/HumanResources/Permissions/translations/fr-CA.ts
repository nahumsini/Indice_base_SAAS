import { enCA } from './en-CA';
import type { PermissionsTranslations } from './types';

export const frCA = {
  ...enCA,
  title: 'Permissions',
  subtitle: 'Gérez les demandes, absences, vacances et statuts d’approbation.',
  actions: {
    columns: 'Colonnes',
    addRequest: 'Ajouter une demande',
    close: 'Fermer',
    approve: 'Approuver',
    reject: 'Refuser',
    view: 'Voir',
  },
  columns: { ...enCA.columns, employee: 'Employé', type: 'Type', startDate: 'Date de début', endDate: 'Date de fin', days: 'Jours', status: 'Statut', actions: 'Actions' },
  filters: { ...enCA.filters, title: 'Filtres', searchLabel: 'Rechercher une demande', status: 'Statut', allStatuses: 'Tous les statuts', allTypes: 'Tous les types', employee: 'Employé', allEmployees: 'Tous les employés' },
  types: { vacation: 'Vacances', sick_leave: 'Congé maladie', personal: 'Personnel', maternity: 'Maternité/Paternité', bereavement: 'Deuil', unpaid: 'Congé sans solde', other: 'Autre' },
  status: { pending: 'En attente', approved: 'Approuvée', rejected: 'Refusée' },
  columnsModal: { ...enCA.columnsModal, title: 'Colonnes du tableau', close: 'Fermer le modal des colonnes', required: 'Requise', done: 'Terminé' },
} as const satisfies PermissionsTranslations;
