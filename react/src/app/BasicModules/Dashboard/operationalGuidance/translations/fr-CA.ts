export const frCA = {
  eyebrow: 'Mode apprentissage',
  title: 'Guide de configuration de l’entreprise',
  subtitle: 'Utilisez cet espace pour configurer la base opérationnelle qui garde le reste d’Índice aligné.',
  focusLabel: 'Priorité actuelle',
  actionsLabel: 'Actions recommandées',
  tabsLabel: 'Zones de configuration',
  tabs: {
    profile: {
      label: 'Profil',
      title: 'Gardez l’identité de l’entreprise claire',
      summary: 'Complétez votre profil personnel et opérationnel afin que l’espace de travail parte de données fiables.',
      value: 'Un profil clair réduit la confusion lorsque l’équipe partage responsabilités, notifications et décisions.',
      steps: [
        {
          title: 'Confirmer les données personnelles',
          description: 'Gardez nom, téléphone, langue et photo à jour pour identifier rapidement les responsables.',
        },
        {
          title: 'Réviser les préférences d’accès',
          description: 'Un profil ordonné facilite l’audit et le soutien des configurations futures.',
        },
      ],
    },
    'business-structure': {
      label: 'Structure d’entreprise',
      title: 'Cartographiez le fonctionnement réel',
      summary: 'Définissez unités, activités, emplacements et siège principal pour que tous les modules utilisent la même carte opérationnelle.',
      value: 'Quand la structure est claire, présence, dépenses, utilisateurs et KPIs se rattachent à la bonne partie de l’opération.',
      steps: [
        {
          title: 'Confirmer Hedwig Edher comme siège principal',
          description: 'Utilisez l’emplacement principal comme ancrage opérationnel de la structure de l’entreprise.',
        },
        {
          title: 'Créer des unités avec intention',
          description: 'Ajoutez seulement les zones qui aident le reporting, la responsabilité ou le contrôle quotidien.',
        },
      ],
    },
    'business-profile': {
      label: 'Maturité d’entreprise',
      title: 'Diagnostiquer la maturité opérationnelle',
      summary: 'Utilisez le profil d’entreprise pour comprendre les forces de l’entreprise et les zones qui demandent plus d’attention.',
      value: 'L’évaluation aide Índice à recommander les bonnes priorités avant d’ajouter plus d’outils, de personnes ou de processus.',
      steps: [
        {
          title: 'Répondre selon la réalité',
          description: 'Des réponses exactes produisent de meilleures recommandations que des réponses idéalisées.',
        },
        {
          title: 'Lire les signaux d’amélioration',
          description: 'Utilisez le diagnostic pour décider ce que l’entreprise doit professionnaliser ensuite.',
        },
      ],
    },
    'personal-performance': {
      label: 'Performance personnelle',
      title: 'Renforcer les habitudes d’exécution',
      summary: 'Révisez les habitudes opérationnelles personnelles qui influencent le suivi, la discipline et la qualité des décisions.',
      value: 'De meilleures habitudes de leadership aident à soutenir les routines, fermer les écarts et rendre le travail visible.',
      steps: [
        {
          title: 'Évaluer les routines d’exécution',
          description: 'Identifiez où le suivi, la priorisation ou la communication peuvent devenir plus constants.',
        },
        {
          title: 'Transformer les constats en routines',
          description: 'Utilisez les résultats pour créer de petites habitudes qui améliorent le contrôle quotidien.',
        },
      ],
    },
    users: {
      label: 'Utilisateurs',
      title: 'Contrôler les accès avant de grandir',
      summary: 'Invitez des utilisateurs, assignez les modules et gardez les permissions alignées avec les responsabilités.',
      value: 'Un bon contrôle des accès protège l’information et aide chaque collaborateur à se concentrer sur les bons outils.',
      steps: [
        {
          title: 'Inviter les bons responsables',
          description: 'Commencez par les personnes responsables de la configuration, RH, finance, opérations et analytique.',
        },
        {
          title: 'Assigner les modules par rôle',
          description: 'Évitez les accès trop larges quand un espace ciblé crée plus de contrôle.',
        },
      ],
    },
  },
} as const;
