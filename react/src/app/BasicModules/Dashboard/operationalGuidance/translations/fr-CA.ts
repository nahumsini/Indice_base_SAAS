export const frCA = {
  eyebrow: 'Mode apprentissage',
  title: 'Guide de configuration de l’entreprise',
  subtitle: 'Utilisez cet espace pour configurer la base opérationnelle qui garde le reste d’Índice aligné.',
  controlLabel: 'Contrôle de l’entreprise',
  functionsLabel: 'Fonctions de l’onglet',
  guideProgressLabel: 'Progression du guide',
  guideProgressCompleteLabel: 'consulté',
  previousStepLabel: 'Recommandation précédente',
  nextStepLabel: 'Recommandation suivante',
  stepIndicatorLabel: 'Afficher la recommandation',
  tabs: {
    profile: {
      label: 'Profil',
      ctaLabel: 'Réviser le profil',
      title: 'Gardez l’identité de l’entreprise claire',
      summary: 'Complétez votre profil personnel et opérationnel afin que l’espace de travail parte de données fiables.',
      value: 'Un profil clair réduit la confusion lorsque l’équipe partage responsabilités, notifications et décisions.',
      steps: [
        {
          title: 'Données personnelles et préférences',
          description: 'Gérez nom, téléphone, langue, photo et préférences pour garder le responsable identifiable.',
        },
        {
          title: 'Sécurité du compte',
          description: 'Mettez à jour les identifiants et données d’accès pour garder un espace fiable.',
        },
      ],
    },
    'business-structure': {
      label: 'Structure d’entreprise',
      ctaLabel: 'Configurer la structure',
      title: 'Cartographiez le fonctionnement réel',
      summary: 'Définissez unités, activités, emplacements et siège principal pour que tous les modules utilisent la même carte opérationnelle.',
      value: 'Quand la structure est claire, présence, dépenses, utilisateurs et KPIs se rattachent à la bonne partie de l’opération.',
      steps: [
        {
          title: 'Unités, activités et siège',
          description: 'Organisez les zones d’opération et gardez Hedwig Edher comme référence principale de la structure.',
        },
        {
          title: 'Emplacement opérationnel',
          description: 'Définissez adresses et coordonnées pour que présence, kiosques et rapports utilisent les bons lieux.',
        },
      ],
    },
    'business-profile': {
      label: 'Maturité d’entreprise',
      ctaLabel: 'Réviser la maturité',
      title: 'Diagnostiquer la maturité opérationnelle',
      summary: 'Utilisez le profil d’entreprise pour comprendre les forces de l’entreprise et les zones qui demandent plus d’attention.',
      value: 'L’évaluation aide Índice à recommander les bonnes priorités avant d’ajouter plus d’outils, de personnes ou de processus.',
      steps: [
        {
          title: 'Diagnostic par piliers',
          description: 'Évaluez personnes, processus, produits et finances pour comprendre la maturité réelle.',
        },
        {
          title: 'Rapport de maturité',
          description: 'Consultez signaux, risques et recommandations pour prioriser la prochaine amélioration.',
        },
      ],
    },
    consulting: {
      label: 'Conseil',
      ctaLabel: 'Planifier une séance',
      title: 'Transformez un défi en conversation ciblée',
      summary: "Demandez une séance de 50 minutes avec l’équipe Indice et partagez le contexte avant la rencontre.",
      value: 'Une demande claire facilite la confirmation et permet de préparer la décision à travailler.',
      steps: [
        { title: 'Choisir une heure', description: 'Proposez une heure préférée et une autre option pendant les heures ouvrables.' },
        { title: 'Partager le contexte', description: 'Sélectionnez le sujet et décrivez le défi ou la décision.' },
      ],
    },
    'personal-performance': {
      label: 'Performance personnelle',
      ctaLabel: 'Évaluer la performance',
      title: 'Renforcer les habitudes d’exécution',
      summary: 'Révisez les habitudes opérationnelles personnelles qui influencent le suivi, la discipline et la qualité des décisions.',
      value: 'De meilleures habitudes de leadership aident à soutenir les routines, fermer les écarts et rendre le travail visible.',
      steps: [
        {
          title: 'Évaluation des habitudes',
          description: 'Révisez leadership, discipline, communication et suivi pour comprendre le style d’exécution.',
        },
        {
          title: 'Lecture de performance',
          description: 'Transformez les résultats personnels en signaux pour améliorer décisions, focus et contrôle.',
        },
      ],
    },
    users: {
      label: 'Utilisateurs',
      ctaLabel: 'Gérer les utilisateurs',
      title: 'Contrôler les accès avant de grandir',
      summary: 'Invitez des utilisateurs, assignez les modules et gardez les permissions alignées avec les responsabilités.',
      value: 'Un bon contrôle des accès protège l’information et aide chaque collaborateur à se concentrer sur les bons outils.',
      steps: [
        {
          title: 'Invitations et rôles',
          description: 'Ajoutez des utilisateurs, définissez les rôles et reliez chacun à sa responsabilité opérationnelle.',
        },
        {
          title: 'Permissions par module',
          description: 'Choisissez les outils accessibles à chaque utilisateur pour garder le travail contrôlé et traçable.',
        },
      ],
    },
  },
} as const;
