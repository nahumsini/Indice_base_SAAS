export const frCA = {
  shell: {
    title: 'Processus et taches',
    subtitle: 'Agenda, projets, indicateurs et processus operationnels recurrents',
    back: 'Retour',
    loading: {
      title: "Chargement de l'onglet des processus",
      description: "Ouverture de l'espace operationnel selectionne.",
      fallbackTitle: "Chargement de l'onglet des processus",
      fallbackDescription: "Telechargement de l'espace de travail selectionne seulement.",
    },
    tabs: {
      agenda: 'Agenda',
      tasks: 'Taches',
      projects: 'Projets',
      processes: 'Processus',
      kpis: 'Indicateurs',
      orgChart: 'Organigramme',
    },
  },
  headers: {
    agenda: {
      emoji: '🗓️',
      title: 'Agenda',
      subtitle: 'Agenda operationnel avec taches reelles, retards reportes, cloture, preuves et audit.',
      actions: {
        table: 'Tableau',
        kanban: 'Kanban',
        columns: 'Colonnes',
        create: 'Creer une tache',
      },
    },
    projects: {
      emoji: '🗂️',
      title: 'Projets',
      subtitle: "Portefeuille operationnel avec taches reelles, preuves, cloture, audit et avancement calcule depuis l'agenda.",
      actions: {
        columns: 'Colonnes',
        create: 'Creer un projet',
      },
    },
    processes: {
      emoji: '🔄',
      title: 'Processus',
      subtitle: "Creez des processus recurrents qui generent de vraies taches dans l'agenda de chaque responsable.",
      actions: {
        columns: 'Colonnes',
        create: 'Creer un processus',
      },
    },
    kpis: {
      emoji: '📊',
      title: 'Indicateurs operationnels',
      subtitle: 'Tableau reel de productivite, conformite, audit, processus, projets et rendement par collaborateur.',
    },
  },
  agenda: {
    periods: {
      today: 'Agenda du jour',
      week: 'Cette semaine',
      month: 'Ce mois-ci',
      overdue: 'En retard',
      custom: 'Date personnalisee',
    },
  },
  kpis: {
    periods: {
      day: 'Agenda du jour',
      week: 'Cette semaine',
      month: 'Ce mois-ci',
      overdue: 'En retard',
      custom: 'Date personnalisee',
    },
  },
} as const;
