import type { DistributorPortalCopy } from './types';

export const frCA: DistributorPortalCopy = {
  navigation: { portalName: 'Portail des distributeurs', local: 'Local', backToErp: 'Retour à l’ERP' },
  tabs: { contractsAccess: 'Contrats et accès', consulting: 'Conseil' },
  header: { eyebrow: 'Opérations de distribution', title: 'Contrats et accès', subtitle: 'Suivez chaque prospect lié à votre portefeuille, du premier accès au contrat actif.' },
  actions: { refresh: 'Actualiser', refreshing: 'Actualisation…', view: 'Voir le client', manage: 'Gérer', addClient: 'Ajouter un client', extendTrial: 'Prolonger l’essai', close: 'Fermer' },
  metrics: { totalClients: 'Clients du portefeuille', prospects: 'Prospects', demosTrials: 'Démos et essais', activeContracts: 'Contrats actifs', attention: 'À surveiller' },
  filters: { title: 'Portefeuille commercial', subtitle: 'Recherchez par entreprise, courriel ou numéro de compte.', matches: 'clients correspondent', search: 'Rechercher', searchPlaceholder: 'Entreprise, courriel ou compte', stage: 'Étape commerciale', allStages: 'Toutes les étapes' },
  table: { title: 'Prospects et clients', subtitle: 'Seuls les comptes liés à votre entreprise de distribution sont affichés.', company: 'Entreprise', stage: 'Étape', access: 'Accès et modules', contract: 'Contrat', users: 'Utilisateurs', nextEvent: 'Prochain événement', action: 'Action', noResults: 'Aucun client ne correspond aux filtres.', noClients: 'Votre portefeuille lié est vide.', noPlan: 'Sans contrat', noModules: 'Aucun module actif', noDate: 'Aucune date prévue', daysRemaining: 'jours restants', members: 'actifs', seats: 'capacité', review: 'Vérifier le paiement' },
  detail: { eyebrow: 'Client du portefeuille', subtitle: 'Aperçu commercial et d’accès en lecture seule.', contact: 'Contact propriétaire', country: 'Pays', stage: 'Étape commerciale', access: 'État de l’accès', contract: 'Contrat', billing: 'État de facturation', modules: 'Modules actifs', capacity: 'Capacité utilisateur', nextEvent: 'Prochain événement', directPortfolio: 'Ce compte est directement lié à votre entreprise de distribution.' },
  states: { PROSPECT: 'Prospect', DEMO: 'Démo', TRIAL: 'Essai', ACTIVE: 'Actif', ATTENTION: 'Attention', INACTIVE: 'Inactif' },
  errors: { title: 'Impossible de charger le portefeuille', retry: 'Réessayer', forbidden: 'Cette entreprise n’a pas accès au portail des distributeurs.' },
};
