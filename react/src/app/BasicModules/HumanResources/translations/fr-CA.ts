import type { HumanResourcesTranslations } from './types';

export const frCA = {
  title: 'Ressources Humaines',
  subtitle: 'Gérez les employés, la présence, la paie et les opérations d’équipe.',
  back: 'Retour',
  loading: {
    title: 'Chargement de l’onglet RH',
    description: 'Téléchargement uniquement de l’espace ressources humaines sélectionné.',
  },
  access: {
    loadingTitle: 'Chargement des accès RH',
    loadingDescription: 'Vérification des espaces de travail disponibles.',
    empty: 'Aucun onglet Ressources humaines n’est disponible pour cet utilisateur.',
  },
  tabError: {
    eyebrow: 'Onglet indisponible',
    title: 'Cet onglet Ressources humaines n’a pas pu se charger',
    description: 'L’application n’a pas pu télécharger cet espace de travail. Actualisez l’onglet pour redemander le module.',
    reload: 'Actualiser l’onglet',
  },
  tabs: {
    collaborators: 'Employés',
    attendance: 'Présence',
    control: 'Contrôle des présences',
    payroll: 'Paie',
    announcements: 'Annonces',
    assets: 'Actifs',
    records: 'Dossiers',
    permissions: 'Demandes',
    incentives: 'Incitatifs',
    kpis: 'Indicateurs',
  },
} satisfies HumanResourcesTranslations;
