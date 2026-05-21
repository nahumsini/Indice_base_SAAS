export const frCA = {
  eyebrow: 'Mode apprentissage',
  title: 'Guide des opérations RH',
  subtitle: 'Utilisez Ressources humaines pour garder collaborateurs, présence, paie et responsabilités alignés.',
  controlLabel: 'Contrôle du personnel',
  functionsLabel: 'Fonctions de l’onglet',
  guideProgressLabel: 'Progression du guide',
  guideProgressCompleteLabel: 'consulté',
  previousStepLabel: 'Recommandation précédente',
  nextStepLabel: 'Recommandation suivante',
  stepIndicatorLabel: 'Afficher la recommandation',
  tabs: {
    collaborators: {
      label: 'Employés',
      ctaLabel: 'Réviser les employés',
      title: 'Centraliser la base du personnel',
      summary: 'Gardez dossiers, rôles, unités et contexte d’emploi organisés dans une source opérationnelle fiable.',
      value: 'Une base fiable améliore responsabilité, paie, suivi de présence et visibilité des équipes.',
      steps: [
        {
          title: 'Compléter chaque dossier',
          description: 'Utilisez des données personnelles, de contact, de poste et de documents cohérentes pour réduire le suivi manuel.',
        },
        {
          title: 'Segmenter par unité',
          description: 'Reliez les employés aux bons secteurs pour que les filtres, rapports et responsabilités restent utiles.',
        },
        {
          title: 'Garder les statuts propres',
          description: 'Révisez les employés actifs et inactifs afin de réduire le bruit dans la paie, les accès et les rapports.',
        },
      ],
    },
    attendance: {
      label: 'Présence',
      ctaLabel: 'Réviser la présence',
      title: 'Rendre la présence quotidienne visible',
      summary: 'Suivez entrées, sorties, horaires et preuves afin que l’opération quotidienne ne dépende pas de la mémoire.',
      value: 'La visibilité de présence aide à détecter absences, retards, manques de couverture et risques opérationnels.',
      steps: [
        {
          title: 'Réviser les signaux quotidiens',
          description: 'Identifiez qui est présent, qui manque et où un suivi est nécessaire.',
        },
        {
          title: 'Relier présence et lieux',
          description: 'Utilisez emplacements et kiosques pour réduire la validation manuelle et refléter le lieu réel de travail.',
        },
        {
          title: 'Traiter les exceptions rapidement',
          description: 'Corrigez les poinçons manquants avant qu’ils touchent la paie ou les conversations de performance.',
        },
      ],
    },
    control: {
      label: 'Contrôle',
      ctaLabel: 'Ouvrir le centre de contrôle',
      title: 'Opérer horaires et accès avec discipline',
      summary: 'Gérez horaires, kiosques, paramètres de présence et routines opérationnelles.',
      value: 'Une couche de contrôle claire réduit l’improvisation et aide les superviseurs à maintenir l’exécution quotidienne.',
      steps: [
        {
          title: 'Définir les horaires clairement',
          description: 'Gardez les quarts et heures d’opération à jour pour interpréter correctement présence et exceptions.',
        },
        {
          title: 'Utiliser les kiosques sur le terrain',
          description: 'Placez les points d’accès près de l’opération réelle pour réduire la friction de pointage.',
        },
        {
          title: 'Réviser les accès employés',
          description: 'Gardez NIP, visage et accès alignés avec le rôle actuel de chaque employé.',
        },
      ],
    },
    payroll: {
      label: 'Paie',
      ctaLabel: 'Réviser la paie',
      title: 'Préparer la paie avec de meilleurs intrants',
      summary: 'Organisez salaire, rémunération variable, déductions et contexte avant les décisions de paiement.',
      value: 'Des intrants propres réduisent le retraitement, augmentent la confiance et clarifient le coût de main-d’œuvre.',
      steps: [
        {
          title: 'Valider la configuration',
          description: 'Confirmez salaire, province, banque et données d’emploi avant les calculs.',
        },
        {
          title: 'Contrôler la rémunération variable',
          description: 'Enregistrez primes, commissions et ajustements avec contexte pour garder les changements traçables.',
        },
        {
          title: 'Réviser avant de fermer',
          description: 'Utilisez les résumés pour détecter les incohérences avant paiement ou comptabilité.',
        },
      ],
    },
    announcements: {
      label: 'Communiqués',
      ctaLabel: 'Réviser les communiqués',
      title: 'Communiquer les décisions opérationnelles',
      summary: 'Gardez les équipes informées des politiques, rappels, changements et avis importants.',
      value: 'Une communication structurée réduit l’incertitude et aide tout le monde à agir avec la même information.',
      steps: [
        {
          title: 'Publier des messages actionnables',
          description: 'Expliquez ce qui change, qui est touché et quelle action est attendue.',
        },
        {
          title: 'Segmenter l’audience',
          description: 'Envoyez l’information au bon groupe afin de réduire le bruit opérationnel.',
        },
      ],
    },
    assets: {
      label: 'Actifs',
      ctaLabel: 'Réviser les actifs',
      title: 'Contrôler les actifs assignés',
      summary: 'Suivez équipement, outils et ressources afin de relier les biens de l’entreprise aux responsables.',
      value: 'La visibilité des actifs réduit les pertes, améliore la responsabilité et clarifie ce que chaque employé possède.',
      steps: [
        {
          title: 'Assigner avec responsabilité',
          description: 'Reliez chaque actif pertinent à un employé, un statut et un contexte opérationnel.',
        },
        {
          title: 'Réviser condition et retours',
          description: 'Utilisez les statuts pour planifier remplacement, récupération et transfert.',
        },
      ],
    },
    records: {
      label: 'Dossiers',
      ctaLabel: 'Réviser les dossiers',
      title: 'Documenter les événements importants',
      summary: 'Organisez accords, incidents, attestations et événements RH formels.',
      value: 'De bons dossiers protègent l’entreprise, soutiennent des décisions justes et conservent le contexte.',
      steps: [
        {
          title: 'Capturer le contexte',
          description: 'Documentez ce qui s’est passé, qui a participé et quel suivi est requis.',
        },
        {
          title: 'Garder les preuves traçables',
          description: 'Ajoutez les pièces justificatives et conservez un historique propre pour les revues futures.',
        },
      ],
    },
    permissions: {
      label: 'Permissions',
      ctaLabel: 'Réviser les permissions',
      title: 'Gérer les absences avec contrôle',
      summary: 'Organisez congés, absences, approbations et contexte sans perdre la visibilité opérationnelle.',
      value: 'Un flux contrôlé aide les gestionnaires à planifier la couverture et réduit les surprises.',
      steps: [
        {
          title: 'Évaluer l’impact sur la couverture',
          description: 'Révisez chaque demande selon la couverture, l’urgence et la capacité de l’équipe.',
        },
        {
          title: 'Garder les approbations traçables',
          description: 'Utilisez statuts et commentaires clairs pour que les décisions restent compréhensibles.',
        },
      ],
    },
    incentives: {
      label: 'Incitatifs',
      ctaLabel: 'Réviser les incitatifs',
      title: 'Relier les récompenses à l’exécution',
      summary: 'Renforcez les habitudes, résultats et responsabilités qui améliorent l’exécution de l’équipe.',
      value: 'Des incitatifs clairs alignent la motivation avec les priorités d’affaires.',
      steps: [
        {
          title: 'Définir le comportement récompensé',
          description: 'Reliez chaque incitatif à un objectif opérationnel clair, pas seulement à un montant.',
        },
        {
          title: 'Réviser équité et cohérence',
          description: 'Gardez les critères compréhensibles afin que l’équipe fasse confiance au programme.',
        },
      ],
    },
    kpis: {
      label: 'KPIs',
      ctaLabel: 'Réviser les KPIs RH',
      title: 'Mesurer les opérations du personnel',
      summary: 'Lisez effectifs, activité, présence, paie et signaux opérationnels du personnel.',
      value: 'Les indicateurs RH aident les leaders à détecter les enjeux tôt et à décider où porter attention.',
      steps: [
        {
          title: 'Lire les signaux du personnel',
          description: 'Observez collaborateurs actifs, qualité de présence, permissions et impact de paie.',
        },
        {
          title: 'Transformer les métriques en action',
          description: 'Utilisez les mouvements des KPIs pour prioriser le suivi avec superviseurs, finances ou leaders.',
        },
      ],
    },
  },
} as const;
