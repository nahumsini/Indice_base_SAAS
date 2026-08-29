import type { ProfileTranslations } from "./types";

export const frCA = {
  title: "Mon profil",
  subtitle: "Informations personnelles et paramètres du compte",
  helper: "Vous pouvez compléter ces informations à tout moment",
  fields: {
    fullName: "Nom complet",
    email: "Courriel",
    phone: "Téléphone",
    position: "Poste",
    department: "Département",
    profilePhoto: "Photo de profil",
    country: "Pays",
    uploadPhoto: "Télécharger photo",
    firstNames: "Prénom(s)",
    lastNames: "Nom(s) de famille",
    preferredLanguage: "Langue préférée",
    newPassword: "Nouveau mot de passe",
    confirmNewPassword: "Confirmer le nouveau mot de passe",
  },
  sections: {
    identityTitle: "Identité",
    identitySubtitle: "Votre photo et votre nom pour l’interface.",
    contactTitle: "Coordonnées",
    contactSubtitle: "Informations pour les notifications et la communication.",
    securityTitle: "Sécurité du compte",
    securitySubtitle: "Mettez à jour votre mot de passe au besoin.",
    preferencesTitle: "Préférences",
    preferencesSubtitle: "Personnalisez la langue de l’interface.",
    nameGroup: "Prénoms et noms",
  },
  hints: {
    photoFormat: "JPG/PNG/WebP/HEIC, max. 25 Mo; compressée avant l’envoi",
    firstNames:
      "Dans certains pays, vous pouvez utiliser un ou plusieurs prénoms.",
    lastNames:
      "Cela peut être 1 nom de famille (USA/Canada) ou 2 noms de famille (Mexique/Colombie).",
    phone: "Le pays met automatiquement l’indicatif téléphonique à jour.",
    password: "Laissez ce champ vide si vous ne voulez pas le modifier.",
    preferredLanguage:
      "Nous utiliserons cette langue pour l’interface et les modèles.",
  },
  actions: {
    save: "Enregistrer les modifications",
    saving: "Enregistrement...",
    discard: "Ignorer",
    uploadingPhoto: "Téléversement de la photo...",
  },
  phone: {
    add: "Ajouter un téléphone",
    number: "Numéro",
    primary: "Principal",
    remove: "Retirer",
    formatHint: (example) => `Exemple : ${example}`,
  },
  progress: {
    completion: "Profil complet",
    essentials: "Remplissez l'essentiel dans une seule vue.",
    securityAction: "Changer le mot de passe",
  },
  accessibility: { showPassword: "Afficher le mot de passe", hidePassword: "Masquer le mot de passe" },
  messages: {
    loading: "Chargement du profil...",
    saveSuccess: "Profil enregistré.",
    loadError: "Impossible de charger le profil.",
    saveError: "Impossible d’enregistrer le profil.",
    unsavedChanges: "Vous avez des modifications non enregistrées.",
    optional: "(facultatif)",
    savingOverlay: "Enregistrement du profil...",
    passwordMismatch:
      "Le nouveau mot de passe et sa confirmation doivent correspondre.",
    passwordMinLength:
      "Le nouveau mot de passe doit contenir au moins 8 caractères.",
    invalidPhone:
      "Entrez un numéro de téléphone valide pour le pays sélectionné.",
  },
} as const satisfies ProfileTranslations;
