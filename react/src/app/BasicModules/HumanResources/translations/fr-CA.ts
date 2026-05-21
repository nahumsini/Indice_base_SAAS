import type { HumanResourcesTranslations } from './types';

export const frCA = {
  title: 'Ressources Humaines',
  subtitle: 'Gérez les employés, la présence, la paie et les opérations d’équipe.',
  back: 'Retour',
  loading: {
    title: 'Chargement de l’onglet RH',
    description: 'Téléchargement uniquement de l’espace ressources humaines sélectionné.',
  },
  tabs: {
    collaborators: 'Employés',
    attendance: 'Présence',
    control: 'Contrôle',
    payroll: 'Paie',
    announcements: 'Annonces',
    assets: 'Actifs',
    records: 'Dossiers',
    permissions: 'Permissions',
    incentives: 'Incitatifs',
    kpis: 'KPIs',
  },
} satisfies HumanResourcesTranslations;
