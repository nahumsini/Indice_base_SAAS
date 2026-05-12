import { enCA } from './en-CA';
import type { KpisTranslations } from './types';

export const frCA: KpisTranslations = {
  ...enCA,
  locale: 'fr-CA',
  common: {
    ...enCA.common,
    all: 'Tous',
    allFemale: 'Toutes',
    retry: 'Reessayer',
    noDate: 'Aucune date',
    noUnit: 'Aucune unite',
    noBusiness: 'Aucun secteur',
    noFolio: 'Aucun folio',
    notApplicable: 'Non applicable',
    unassigned: 'Non assigne',
    pending: 'en attente',
    overdue: 'en retard',
    collaborators: (count: number) => `${count} collaborateurs`,
  },
  header: {
    emoji: '📊',
    title: 'KPI operationnels',
    subtitle:
      'Tableau reel de productivite, conformite, audit, processus, projets et rendement par collaborateur.',
  },
  filters: {
    ...enCA.filters,
    title: 'Filtres',
    period: 'Periode',
    unit: 'Unite',
    business: 'Secteur',
    collaborator: 'Collaborateur',
    search: 'Rechercher le rendement',
    searchPlaceholder: 'Collaborateur, unite ou secteur',
    from: 'De',
    to: 'A',
  },
  periods: {
    day: 'Agenda du jour',
    week: 'Cette semaine',
    month: 'Ce mois-ci',
    overdue: 'En retard',
    custom: 'Date personnalisee',
  },
  statuses: {
    healthy: 'Sain',
    watch: 'A surveiller',
    critical: 'Critique',
    active: 'Actif',
    paused: 'En pause',
  },
  summary: {
    labels: {
      visible: 'visibles',
      open: 'ouvertes',
      closed: 'fermees',
      overdue: 'en retard',
      pendingAudit: 'a auditer',
      withEvidence: 'avec preuve',
      productivity: (score: number) => `${score}% productivite`,
      weighting: (value: string) => `Ponderation ${value}`,
    },
    segments: {
      inProgress: 'En cours',
      closed: 'Fermees',
      audited: 'Auditees',
      overdue: 'En retard',
      cancelled: 'Annulees',
    },
    insights: {
      empty: 'Aucune tache dans le filtre actuel. Ajustez la periode, l unite, le secteur ou le collaborateur pour evaluer la productivite.',
      overdue: (overdue: number, average: number, pendingAudit: number) =>
        `${overdue} taches en retard mettent la productivite sous pression; l avancement moyen est de ${average}% et ${pendingAudit} fermetures restent a auditer.`,
      pendingAudit: (pendingAudit: number) =>
        `Aucune tache en retard dans ce filtre, mais ${pendingAudit} audits restent a faire pour fermer le cycle complet.`,
      healthy: (score: number) =>
        `Le filtre est sain: productivite estimee de ${score}% avec audit et qualite sous controle.`,
      default: (score: number) =>
        `La productivite estimee est de ${score}%. Revisez l avancement, les fermetures et les preuves pour ameliorer le rendement.`,
    },
  },
  cards: {
    productivity: {
      title: 'Productivite operationnelle',
      target: 'Cible 85%',
      description: 'Indice combine d avancement, fermeture, ponctualite, audit, qualite et preuve.',
    },
    compliance: {
      title: 'Conformite agenda',
      target: (closed: number) => `${closed} fermees`,
      description: 'Relation entre les taches actionnables et les taches fermees.',
    },
    timeliness: {
      title: 'Ponctualite',
      target: (overdue: number) => `${overdue} en retard`,
      description: 'Discipline de livraison par rapport a la date d echeance.',
    },
    audit: {
      title: 'Audit complet',
      target: (pendingAudit: number) => `${pendingAudit} a auditer`,
      description: 'Fermetures revisees par le gestionnaire ou l auditeur responsable.',
    },
    quality: {
      title: 'Qualite auditee',
      target: 'Ponderation maximale 5',
      description: 'Ponderation moyenne des taches auditees.',
    },
    collaborators: {
      title: 'Collaborateurs mesures',
      target: (projects: number, processes: number) => `${projects} projets / ${processes} processus`,
      description: 'Personnes avec des taches dans le filtre selectionne.',
    },
  },
  chart: {
    title: 'Activite par date',
    subtitle: 'Taches planifiees, fermees, en retard et auditees dans le filtre.',
    empty: 'Aucune activite a afficher dans le filtre actuel.',
    series: {
      scheduled: 'Planifiees',
      closed: 'Fermees',
      overdue: 'En retard',
      audited: 'Auditees',
    },
  },
  snapshots: {
    collaborators: 'Collaborateurs',
    processTasks: 'Taches de processus',
    projectTasks: 'Taches de projets',
    quality: 'Qualite',
  },
  collaboratorsTable: {
    title: 'Rendement des collaborateurs',
    subtitle: 'Classement reel par taches assignees, fermeture, ponctualite, audit, ponderation et preuve.',
    empty: 'Aucun collaborateur avec des taches dans le filtre actuel.',
    headers: {
      rank: 'Rang',
      collaborator: 'Collaborateur',
      context: 'Unite / Secteur',
      score: 'Note',
      tasks: 'Taches',
      closure: 'Fermeture',
      timeliness: 'Ponctualite',
      audit: 'Audit',
      quality: 'Qualite',
      evidence: 'Preuve',
      status: 'Etat',
    },
    details: {
      openOverdue: (open: number, overdue: number) => `${open} ouvertes · ${overdue} en retard`,
      audit: (rate: number, pending: number) => `${rate}% · ${pending} a auditer`,
    },
  },
  processesTable: {
    title: 'Processus recurrents',
    subtitle: 'Conformite reelle des taches generees par le moteur de processus.',
    empty: 'Aucun processus avec des taches dans le filtre actuel.',
    headers: {
      process: 'Processus',
      score: 'Note',
      tasks: 'Taches',
      audit: 'Audit',
      next: 'Prochaine',
      engine: 'Moteur',
    },
    details: {
      tasks: (closed: number, total: number, overdue: number) => `${closed}/${total} · ${overdue} en retard`,
      audit: (rate: number, weighting: string) => `${rate}% · ${weighting}`,
    },
  },
  projectsTable: {
    title: 'Projets',
    subtitle: 'Sante du portefeuille selon les taches ouvertes, fermees, en retard et auditees.',
    empty: 'Aucun projet avec des taches dans le filtre actuel.',
    headers: {
      project: 'Projet',
      health: 'Sante',
      progress: 'Avancement',
      tasks: 'Taches',
      audit: 'Audit',
      dueDate: 'Echeance',
    },
    details: {
      tasks: (closed: number, total: number, overdue: number) => `${closed}/${total} · ${overdue} en retard`,
      audit: (rate: number, pending: number) => `${rate}% · ${pending} a auditer`,
    },
  },
  messages: {
    loadCatalogs: 'Impossible de charger les catalogues.',
    loadKpis: 'Impossible de charger les KPI.',
    empty: 'Aucune information KPI a afficher.',
    noInsight: 'Aucune lecture operationnelle disponible pour le filtre actuel.',
  },
};
