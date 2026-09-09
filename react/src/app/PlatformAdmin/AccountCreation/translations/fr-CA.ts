import type { AccountCreationCopy } from "./types";

export const frCACopy: AccountCreationCopy = {
  steps: { company: "Entreprise", owner: "Propriétaire", access: "Accès" },
  modal: {
    eyebrow: "Création directe par Root", title: "Créer un compte Indice",
    description: "Configurez l’entreprise, le propriétaire et l’accès en trois étapes.",
    successTitle: "Compte prêt à remettre",
    successDescription: "Copiez les identifiants et partagez-les par un canal sécurisé.",
  },
  actions: {
    cancel: "Annuler", previous: "Retour", next: "Suivant", validating: "Validation",
    create: "Créer et activer", creating: "Création du compte…", signInAgain: "Se reconnecter",
    finish: "Terminer", manageAccount: "Gérer le compte", generate: "Générer",
    showPassword: "Afficher le mot de passe", hidePassword: "Masquer le mot de passe",
  },
  progress: {
    label: "Progression de la création du compte",
    step: (current, total, modules) => `Étape ${new Intl.NumberFormat("fr-CA").format(current)} sur ${new Intl.NumberFormat("fr-CA").format(total)} · Modules : ${new Intl.NumberFormat("fr-CA").format(modules)}`,
    ready: (companyId) => `Entreprise nº ${companyId} · accès prêt à remettre`,
  },
  company: {
    title: "Entreprise", description: "Identité commerciale du nouveau compte.",
    name: "Nom de l’entreprise", namePlaceholder: "Ex. : Groupe Horizon", country: "Pays",
    accountType: "Type de compte", superAdmin: "Super administrateur · client", distributor: "Distributeur",
    industry: "Secteur d’activité (facultatif)", employees: "Nombre exact d’employés",
    employeesPlaceholder: "Ex. : 18",
    employeesHint: "Incluez le propriétaire et toute personne qui utilisera Indice.",
    unspecified: "Non précisé",
  },
  owner: {
    title: "Propriétaire et accès", description: "Identifiants initiaux du propriétaire de l’entreprise.",
    name: "Nom du propriétaire (facultatif)", namePlaceholder: "Prénom et nom",
    email: "Adresse courriel", emailPlaceholder: "proprietaire@entreprise.com", phone: "Téléphone (facultatif)",
    phonePlaceholder: "+1 514 555 0123", password: "Mot de passe temporaire",
  },
  access: {
    title: "Forfait et modules", description: "Choisissez uniquement les accès initiaux nécessaires.",
    modules: "Modules disponibles",
    baseGroup: "Forfait de base",
    baseGroupDescription: "Le nombre total de modules de base détermine le forfait commercial.",
    addonGroup: "Modules complémentaires",
    addonGroupDescription: "Ils sont facturés individuellement à la fin de l’essai.",
    moduleFallback: "Accès opérationnel au module.",
    noModules: "Aucun module de base actif. Vérifiez Catalogue et modules.", accessType: "Type d’accès",
    demo: "Démo à durée limitée", permanent: "Courtoisie permanente",
    capacityTitle: "Forfait et capacité calculés",
    capacityDescription: "Indice couvre les employés indiqués avec le forfait et les places supplémentaires nécessaires.",
    package: "Forfait de base", requiredUsers: "Employés requis",
    packageName: (moduleCount) => moduleCount <= 0
      ? "Aucun forfait"
      : moduleCount === 1
        ? "1 module"
        : moduleCount === 2
          ? "2 modules"
          : moduleCount === 3
            ? "3 modules"
            : "4 modules ou plus",
    includedUsers: "Places incluses", additionalUsers: "Utilisateurs supplémentaires",
    duration: "Durée de la démo", days: (days) => `${new Intl.NumberFormat("fr-CA").format(days)} jours`,
    noExpiration: "Aucune date d’expiration",
  },
  context: { company: "Entreprise", owner: "Propriétaire", directAccount: "Création directe" },
  notices: {
    restored: "Votre progression a été restaurée et un nouveau mot de passe temporaire a été généré.",
    audit: "Cela crée une véritable entreprise et est inscrit au journal d’audit. Aucun paiement Stripe n’est créé.",
  },
  errors: {
    password: "Le mot de passe doit contenir au moins 10 caractères et au plus 72 octets.",
    invalidPhone: "Saisissez un numéro de téléphone valide pour le pays choisi.",
    duplicateEmail: "Ce courriel appartient à un autre compte. Utilisez-en un autre pour continuer.",
    selectModule: "Sélectionnez au moins un module pour créer le compte.",
    createFailed: "Impossible de créer le compte.",
    modulesNotApplied: "Le compte a été créé, mais les modules sélectionnés ne sont pas confirmés. Ouvrez Gérer le compte pour compléter l’accès.",
    sessionExpired: "Votre session Root a expiré. La progression a été conservée sans enregistrer le mot de passe.",
  },
  success: {
    created: (companyId) => `Entreprise nº ${companyId} · propriétaire créé`,
    initialAccess: "Accès initial", oneTimePassword: "Le mot de passe est affiché uniquement ici.",
    copyAll: "Copier les détails", copiedAll: "Détails copiés", copy: "Copier", copied: "Copié",
    loginPage: "Page de connexion", company: "Entreprise", email: "Courriel", password: "Mot de passe temporaire",
    loadedModules: "Modules chargés", loadedModulesDescription: (count) => `Modules confirmés sur le compte : ${new Intl.NumberFormat("fr-CA").format(count)}`,
    accessDataTitle: "Informations d’accès à Indice", securityReminder: "Par sécurité, changez le mot de passe après la connexion.",
    securityShare: "Demandez à l’utilisateur de changer ce mot de passe dans Tableau de bord → Profil → Sécurité. Indice ne l’enverra pas par courriel et ne l’inscrira pas au journal d’audit Root.",
  },
};
