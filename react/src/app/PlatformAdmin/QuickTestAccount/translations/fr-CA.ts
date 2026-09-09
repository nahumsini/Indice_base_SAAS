import type { QuickTestAccountCopy } from "./types";

export const frCAQuickTestCopy: QuickTestAccountCopy = {
  modal: {
    eyebrow: "Configuration rapide",
    title: "Créer un compte de test",
    description: "Renseignez l’essentiel et vérifiez l’accès avant la création.",
  },
  steps: { scenario: "Scénario", details: "Détails" },
  progress: {
    label: "Progression du compte de test",
    step: (current) => `Étape ${new Intl.NumberFormat("fr-CA").format(current)} sur 2 · configuration de démo`,
  },
  actions: {
    cancel: "Annuler",
    previous: "Précédent",
    next: "Continuer",
    review: "Vérifier l’accès",
  },
  scenario: {
    title: "Que voulez-vous tester?",
    description: "Indice préparera les modules, la capacité et la durée d’essai recommandés.",
    modules: (count) => `Modules : ${new Intl.NumberFormat("fr-CA").format(count)}`,
    employees: (count) => `Employés : ${new Intl.NumberFormat("fr-CA").format(count)}`,
    days: (count) => `Durée en jours : ${new Intl.NumberFormat("fr-CA").format(count)}`,
    options: {
      people: {
        label: "Personnel et processus",
        description: "Ressources humaines, tâches et indicateurs pour les opérations internes.",
      },
      commerce: {
        label: "Ventes et stocks",
        description: "Flux commercial, stocks, dépenses et comptes clients.",
      },
      complete: {
        label: "Opérations complètes",
        description: "Tous les modules de base disponibles pour un test complet.",
      },
    },
  },
  details: {
    title: "Identifier le compte de test",
    description: "Conservez les données générées ou remplacez-les.",
    companyName: "Nom de l’entreprise",
    ownerName: "Nom du propriétaire",
    ownerEmail: "Courriel de connexion",
    country: "Pays",
    employees: "Personnes utilisant Indice",
    trial: "Durée de l’essai",
    summary: "Configuration automatique",
    scenario: "Scénario",
    access: "Accès initial",
    capacity: "Capacité",
    notice: "La prochaine étape permet de vérifier les modules, les utilisateurs et la durée d’essai avant de créer le compte.",
    companyPrefix: "Démo Indice",
    defaultOwnerName: "Utilisateur de test",
  },
  errors: {
    duplicateEmail: "Ce courriel appartient déjà à un autre compte. Utilisez-en un autre.",
    noModules: "Aucun module de base disponible pour ce scénario.",
  },
};
