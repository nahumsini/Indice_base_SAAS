export const frCA = {
  eyebrow: 'Mode apprentissage',
  title: 'Guide d’exécution opérationnelle',
  subtitle: 'Utilisez Processus et tâches pour transformer les priorités en travail visible, routines répétables et exécution mesurable.',
  controlLabel: 'Contrôle d’exécution',
  functionsLabel: 'Fonctions de l’onglet',
  guideProgressLabel: 'Progression du guide',
  guideProgressCompleteLabel: 'consulté',
  previousStepLabel: 'Recommandation précédente',
  nextStepLabel: 'Recommandation suivante',
  stepIndicatorLabel: 'Afficher la recommandation',
  tabs: {
    calendar: {
      label: 'Agenda',
      ctaLabel: 'Réviser l’agenda',
      title: 'Piloter le travail quotidien depuis un tableau',
      summary: 'Utilisez l’agenda pour créer, assigner, prioriser, compléter, auditer et suivre les tâches sans perdre le contexte.',
      value: 'Un agenda discipliné réduit les oublis, rend les responsabilités visibles et aide à fermer la journée avec des preuves claires.',
      steps: [
        {
          title: 'Garder les tâches actionnables',
          description: 'Rédigez les tâches avec titre clair, responsable, échéance, priorité et contexte d’affaires.',
        },
        {
          title: 'Utiliser la bonne vue',
          description: 'Utilisez tableau pour le contrôle, kanban pour le flux et diagramme pour les échéances.',
        },
        {
          title: 'Fermer avec preuves',
          description: 'Utilisez notes, avancement, fichiers et audit pour rendre le travail terminé fiable.',
        },
      ],
    },
    projects: {
      label: 'Projets',
      ctaLabel: 'Réviser les projets',
      title: 'Coordonner les initiatives sans perdre le contrôle',
      summary: 'Utilisez Projets pour regrouper le travail lié, organiser les responsables et connecter les tâches à un objectif opérationnel.',
      value: 'La visibilité des projets aide les équipes à comprendre pourquoi les tâches comptent et où les retards affectent les engagements.',
      steps: [
        {
          title: 'Définir le résultat du projet',
          description: 'Gardez chaque projet lié à un résultat opérationnel clair pour éviter l’activité déconnectée.',
        },
        {
          title: 'Suivre le portefeuille de tâches',
          description: 'Utilisez listes et diagrammes pour identifier charge, retards, responsables et risques de calendrier.',
        },
        {
          title: 'Réviser l’avancement régulièrement',
          description: 'Utilisez statut et tâches liées pour guider le suivi avant que les échéances deviennent urgentes.',
        },
      ],
    },
    processes: {
      label: 'Processus',
      ctaLabel: 'Réviser les processus',
      title: 'Transformer le travail récurrent en routines',
      summary: 'Utilisez Processus pour définir des générateurs opérationnels qui créent les tâches futures selon des règles claires.',
      value: 'Les processus récurrents protègent la cohérence: actifs ils génèrent, suspendus ils arrêtent, supprimés ils arrêtent définitivement.',
      steps: [
        {
          title: 'Séparer processus et tâches',
          description: 'Traitez les processus comme des routines qui génèrent le travail, pas comme des tâches individuelles à compléter.',
        },
        {
          title: 'Contrôler la récurrence',
          description: 'Gardez fréquence, prochaine exécution, responsable et statut exacts pour générer seulement le travail nécessaire.',
        },
        {
          title: 'Suspendre avant de supprimer',
          description: 'Suspendez pour arrêter temporairement; supprimez seulement quand la routine ne doit plus générer.',
        },
      ],
    },
    kpis: {
      label: 'KPIs',
      ctaLabel: 'Réviser les KPIs',
      title: 'Mesurer la santé de l’exécution',
      summary: 'Utilisez les KPIs opérationnels pour lire conformité de l’agenda, flux de projets, discipline des processus et risques.',
      value: 'Les KPIs transforment l’activité en signaux de gestion pour agir avant que le retard devienne une dette opérationnelle.',
      steps: [
        {
          title: 'Lire les indicateurs avancés',
          description: 'Surveillez travail ouvert, en retard, audité et complété pour comprendre si l’exécution s’améliore.',
        },
        {
          title: 'Relier métriques et action',
          description: 'Utilisez les mouvements de KPIs pour décider quelle équipe, projet, processus ou personne nécessite un suivi.',
        },
        {
          title: 'Réviser les tendances',
          description: 'Un chiffre aide, mais la tendance montre si le système opérationnel devient plus sain.',
        },
      ],
    },
  },
} as const;
