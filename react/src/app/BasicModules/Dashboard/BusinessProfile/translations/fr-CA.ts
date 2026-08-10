import type { BusinessProfileTranslations } from "./types";

export const frCA = {
  title: "Diagnostic d'entreprise",
  description:
    "Aidez-nous à mieux connaître votre entreprise et son stade de gestion pour personnaliser Indice.",
  centerTitle: "Centre de diagnostic d'entreprise",
  centerDescription:
    "Découvrez l'état de gestion de votre entreprise à travers 4 piliers : Personnes, Processus, Produits et Finances. Avec vos réponses, nous utiliserons l'Indice de Maturité Entrepreneuriale (IME), qui nous aidera à personnaliser les recommandations, modules et meilleurs partenaires derrière Indice.",
  questionCount: "10 questions chacun",
  questionCountLabel: "Le diagnostic comprend",
  progress: "Progrès du diagnostic d'entreprise",
  progressOf: "complété",
  onboarding: {
    answeredProgress: "Vous avez répondu à {answered} questions sur {total}",
    encouragementMid: "Vous avancez très bien",
    encouragementNear: "Presque terminé",
    sections: {
      people: {
        title: "Étape 1 — Votre équipe",
        intro: "Comprenons comment votre équipe travaille",
        done: "Terminé — nous comprenons votre équipe",
      },
      processes: {
        title: "Étape 2 — Votre façon d’opérer",
        intro: "Comprenons comment fonctionne votre opération quotidienne",
        done: "Terminé — nous comprenons votre façon d’opérer",
      },
      products: {
        title: "Étape 3 — Ce que vous vendez",
        intro: "Comprenons votre offre et son accès au marché",
        done: "Terminé — nous comprenons ce que vous vendez",
      },
      finance: {
        title: "Étape 4 — Vos finances",
        intro: "Comprenons comment vous gérez vos chiffres",
        done: "Terminé — nous comprenons vos finances",
      },
    },
  },
  printDiagnosis: "Télécharger PDF",
  start: "Commencer",
  continue: "Continuer",
  doAgain: "Recommencer",
  reviewAnswers: "Revoir les réponses",
  close: "Fermer",
  question: "Question",
  of: "de",
  completed: "complétées",
  previous: "Précédent",
  next: "Suivant",
  finish: "Terminer",
  restart: "Redémarrer le diagnostic",
  restartDialog: {
    cancel: "Annuler",
    confirm: "Recommencer le test",
    description: "Nous conserverons votre résultat précédent et commencerons une nouvelle version.",
    title: "Redémarrer le diagnostic?",
  },
  result: {
    title: 'Résultat de votre entreprise',
    subtitle: 'Une lecture pratique pour décider quoi améliorer en premier.',
    maturity: 'Maturité',
    confidence: 'Confiance',
    priority: 'Priorité',
    quickWin: 'Gain rapide',
    mainRisk: 'Risque principal',
    recommendedPlan: 'Plan recommandé',
  },
  actions: {
    save: "Enregistrer",
    saving: "Enregistrement...",
    discard: "Annuler",
  },
  scoreSummary: {
    title: "Score du diagnostic",
    bmi: "IME",
    level: "Niveau",
    answered: "Répondues",
    score: "Score",
  },
  messages: {
    loading: "Chargement du diagnostic d'entreprise...",
    loadError: "Impossible de charger le diagnostic d'entreprise.",
    saveSuccess: "Le diagnostic d'entreprise a été enregistré.",
    saveError: "Impossible d'enregistrer le diagnostic d'entreprise.",
    unsavedChanges:
      "Vous avez des changements non enregistrés dans le diagnostic d'entreprise.",
  },
  pillars: {
    people: {
      title: "Personnes",
      description:
        "Analyser les talents, la structure d'équipe et la communication.",
    },
    processes: {
      title: "Processus",
      description: "Évaluer les flux, tâches, évolutivité et efficacité.",
    },
    products: {
      title: "Produits",
      description:
        "Analyser l'offre, le marché, commercial et proposition de valeur.",
    },
    finance: {
      title: "Finances",
      description:
        "Évaluer le contrôle financier, la gestion et la prise de décision.",
    },
  },
  questions: {
    people: [
      {
        question: "Quel est votre rôle principal?",
        options: ["Fondateur/PDG", "Opérations", "Finance", "Commercial/Autre"],
      },
      {
        question: "Combien de personnes travaillent?",
        options: ["Moi seul", "2 à 5", "6 à 20", "21 ou plus"],
      },
      {
        question: "Comment votre équipe est-elle organisée?",
        options: [
          "Sans structure",
          "Rôles de base",
          "Domaines définis",
          "Organigramme formel",
        ],
      },
      {
        question: "Comment attribuez-vous les tâches?",
        options: [
          "Improvisé",
          "Listes",
          "Attribution structurée",
          "Système de gestion",
        ],
      },
      {
        question: "Évaluation des performances?",
        options: ["Jamais", "Pour problèmes", "Hebdomadaire", "Avec KPIs"],
      },
      {
        question: "Délégation?",
        options: [
          "Je fais tout",
          "Délègue et supervise",
          "Délègue avec contrôle",
          "Équipe autonome",
        ],
      },
      {
        question: "Communication interne?",
        options: ["Informelle", "Chat", "Réunions", "Outils formels"],
      },
      {
        question: "Fréquence des réunions?",
        options: ["Jamais", "Sporadique", "Hebdomadaire", "Fréquent"],
      },
      {
        question: "Clarté des responsabilités?",
        options: [
          "Pas claire",
          "Un peu claire",
          "Assez claire",
          "Totalement claire",
        ],
      },
      {
        question: "Facilité d'intégration?",
        options: ["Très difficile", "Difficile", "Modéré", "Facile"],
      },
    ],
    processes: [
      {
        question: "Processus documentés?",
        options: ["Rien", "Quelques-uns", "Majorité", "Complètement"],
      },
      {
        question: "Gestion des tâches?",
        options: ["Improvisé", "Listes", "Outils", "Système formel"],
      },
      {
        question: "Suivi des progrès?",
        options: ["Pas surveillé", "Occasionnel", "Rapports", "KPIs"],
      },
      {
        question: "Automatisation?",
        options: [
          "Manuel",
          "Outils isolés",
          "Automatisation partielle",
          "Haute automatisation",
        ],
      },
      {
        question: "Réplicabilité?",
        options: ["Très difficile", "Avec effort", "Possible", "Facile"],
      },
      {
        question: "Où perd-on du temps?",
        options: ["Manuel", "Coordination", "Information", "Suivi"],
      },
      {
        question: "Dépendance aux personnes?",
        options: ["Totale", "Beaucoup", "Un peu", "Peu"],
      },
      {
        question: "Clarté des processus?",
        options: [
          "Pas clairs",
          "Un peu clairs",
          "Assez clairs",
          "Totalement clairs",
        ],
      },
      {
        question: "Gestion des erreurs?",
        options: [
          "Réaction",
          "Informelle",
          "Révision",
          "Amélioration continue",
        ],
      },
      {
        question: "Évolutivité?",
        options: ["Nulle", "Basse", "Moyenne", "Haute"],
      },
    ],
    products: [
      {
        question: "Que vendez-vous?",
        options: ["Services", "Produits", "Numérique", "Mixte"],
      },
      {
        question: "Type de client?",
        options: ["B2C", "B2B", "Gouvernement", "Mixte"],
      },
      {
        question: "Revenu principal?",
        options: ["Vente directe", "Services", "Abonnement", "Contrats"],
      },
      {
        question: "Diversification?",
        options: ["Un", "Quelques-uns", "Plusieurs lignes", "Large"],
      },
      {
        question: "Définition des prix?",
        options: ["Intuition", "Concurrence", "Coûts", "Stratégie"],
      },
      {
        question: "Suivi des performances?",
        options: [
          "Pas mesuré",
          "Ventes seulement",
          "Ventes+rentabilité",
          "Indicateurs",
        ],
      },
      {
        question: "Proposition de valeur?",
        options: ["Pas claire", "Un peu claire", "Assez claire", "Très claire"],
      },
      {
        question: "Retour client?",
        options: ["Aucun", "Informel", "Enquêtes", "Analyse"],
      },
      {
        question: "Évolution du produit?",
        options: [
          "En cours",
          "Changements occasionnels",
          "Plans",
          "Feuille de route",
        ],
      },
      {
        question: "Priorité commerciale?",
        options: ["Clients", "Ventes actuelles", "Rentabilité", "Échelle"],
      },
    ],
    finance: [
      {
        question: "Contrôle financier?",
        options: ["Non structuré", "Excel", "Logiciel", "Système intégré"],
      },
      {
        question: "Révision des chiffres?",
        options: ["Jamais", "Mensuelle", "Hebdomadaire", "Quotidienne"],
      },
      {
        question: "Flux de trésorerie?",
        options: ["Pas contrôlé", "Réaction", "Révision", "Projection"],
      },
      {
        question: "Coûts clairs?",
        options: [
          "Pas clairs",
          "Approximatifs",
          "Assez clairs",
          "Contrôle total",
        ],
      },
      {
        question: "Marge?",
        options: ["Je ne sais pas", "Estimé", "Clair", "Totalement mesuré"],
      },
      {
        question: "Décisions financières?",
        options: ["Intuition", "Expérience", "Données", "Modèles"],
      },
      {
        question: "Revenu prévisible?",
        options: ["Très variable", "Variable", "Stable", "Très stable"],
      },
      {
        question: "Gestion de la dette?",
        options: ["Sans contrôle", "Basique", "Stratégie", "Optimisé"],
      },
      {
        question: "Préparation aux crises?",
        options: ["Nulle", "Basse", "Moyenne", "Haute"],
      },
      {
        question: "Conformité fiscale?",
        options: ["Sans contrôle", "Retards", "À jour", "Stratégie fiscale"],
      },
    ],
  },
} as const satisfies BusinessProfileTranslations;
