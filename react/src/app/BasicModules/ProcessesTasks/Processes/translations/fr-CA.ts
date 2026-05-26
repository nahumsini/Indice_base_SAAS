import { enCA } from './en-CA';
import type { ProcessFrequency, ProcessRecurrenceConfig, Weekday } from '../types';
import type { ProcessesTranslations } from './types';

export const frCA: ProcessesTranslations = {
  ...enCA,
  common: {
    ...enCA.common,
    all: 'Tous',
    allFemale: 'Toutes',
    retry: 'Reessayer',
    cancel: 'Annuler',
    close: 'Fermer',
    saving: 'Enregistrement...',
    noDate: 'Aucune date',
    noUnit: 'Aucune unite',
    noBusiness: 'Aucun secteur',
    unassigned: 'Non assigne',
    actions: 'Actions',
    requiredFields: 'Les champs marques avec * sont obligatoires.',
  },
  header: {
    emoji: '✅',
    title: 'Processus',
    subtitle: "Creez des processus recurrents qui generent de vraies taches dans l'agenda de chaque responsable.",
    actions: {
      table: 'Tableau',
      diagram: 'Diagramme',
      columns: 'Colonnes',
      create: 'Creer un processus',
    },
  },
  filters: {
    title: 'Filtres',
    search: 'Rechercher un processus',
    searchPlaceholder: 'Folio, titre, description, unite ou responsable',
    unit: 'Unite',
    business: 'Secteur',
    collaborator: 'Collaborateur',
    frequency: 'Frequence',
  },
  statuses: {
    active: 'Actif',
    paused: 'En pause',
    atRisk: 'A risque',
  },
  priorities: {
    high: 'Haute',
    medium: 'Moyenne',
    low: 'Basse',
  },
  frequencies: {
    daily: 'Quotidienne',
    weekly: 'Hebdomadaire',
    'bi-weekly': 'Aux deux semaines',
    monthly: 'Mensuelle',
    'specific-dates': 'Dates precises',
  },
  weekdays: {
    monday: 'Lundi',
    tuesday: 'Mardi',
    wednesday: 'Mercredi',
    thursday: 'Jeudi',
    friday: 'Vendredi',
    saturday: 'Samedi',
    sunday: 'Dimanche',
  },
  columns: {
    folio: { label: 'Folio', description: 'Identifiant operationnel du processus.' },
    unit: { label: 'Unite', description: 'Unite associee au processus.' },
    business: { label: 'Secteur', description: 'Secteur associe au processus.' },
    title: { label: 'Processus', description: 'Nom modifiable du processus recurrent.' },
    description: { label: 'Description', description: 'Detail operationnel et portee du processus.' },
    template: { label: 'Modele', description: 'Donnees copiees dans chaque tache generee.' },
    createdAt: { label: 'Date de creation', description: 'Date d enregistrement du processus.' },
    frequency: { label: 'Frequence', description: 'Cadence de generation des taches.' },
    nextOccurrence: { label: 'Prochaine generation', description: 'Prochaine occurrence programmee par le moteur.' },
    generatedUntil: { label: 'Genere jusqu a', description: 'Limite future materialisee par le moteur.' },
    progress: { label: 'Avancement', description: 'Avancement calcule a partir des taches generees.' },
    tasks: { label: 'Taches', description: 'Taches generees, ouvertes, fermees et en retard.' },
    creator: { label: 'Createur', description: 'Utilisateur ayant cree le processus.' },
    responsible: { label: 'Responsable', description: 'Utilisateur responsable de l execution du processus.' },
    priority: { label: 'Priorite', description: 'Niveau de priorite assigne.' },
  },
  fixedColumns: {
    actions: {
      label: 'Actions',
      description: 'Boutons pour mettre a jour les taches, mettre en pause, modifier, copier ou supprimer le processus.',
    },
  },
  columnsDialog: {
    title: 'Gerer les colonnes',
    description: 'Choisissez les colonnes du tableau qui restent visibles dans l espace Processus.',
    visibleCount: (visible: number, total: number) => `${visible} sur ${total} colonnes visibles`,
    selectAll: 'Tout selectionner',
    minimumSet: 'Vue minimale',
    requiredColumn: 'Colonne requise pour l espace de travail.',
    optionalColumn: 'Colonne optionnelle pouvant etre masquee dans le tableau.',
  },
  table: {
    loading: 'Chargement des processus recurrents...',
    empty: 'Aucun processus recurrent ne correspond aux filtres actuels.',
    progress: 'Avancement',
    graceDays: (days: number) => `Grace ${days} jours`,
    evidenceRequired: 'Preuve requise',
    start: 'Debut',
    end: 'Fin',
    until: 'Jusqu a',
    window: (days: number) => `Fenetre ${days} jours`,
    taskCounts: {
      open: 'Ouvertes',
      closed: 'Fermees',
      overdue: 'En retard',
      audited: 'Auditees',
    },
  },
  actions: {
    runEngine: 'Mettre a jour les taches du processus',
    pause: 'Mettre en pause',
    activate: 'Activer le processus',
    edit: 'Modifier le processus',
    copy: 'Copier le processus',
    delete: 'Supprimer le processus',
  },
  bulk: {
    selected: (count: number) => `${count} selectionnes`,
    title: 'Actions de masse',
    applied: (count: number) => `Action de masse appliquee a ${count} processus selectionne${count === 1 ? '' : 's'}.`,
    assignDescription: (count: number) =>
      `Appliquer un responsable a ${count} processus selectionne${count === 1 ? '' : 's'}.`,
    itemName: (count: number) => `${count} processus`,
    selectVisible: 'Selectionner les processus visibles',
    selectRow: (folio: string) => `Selectionner ${folio}`,
  },
  messages: {
    loadProcesses: 'Impossible de charger les processus.',
    loadCatalogs: 'Impossible de charger les catalogues du processus.',
    saveChanges: 'Impossible d enregistrer les changements du processus.',
    deleteProcess: 'Impossible de supprimer le processus.',
    duplicateProcess: 'Impossible de copier le processus.',
    runEngine: 'Impossible de mettre a jour les taches du processus.',
    saveProcess: 'Impossible d enregistrer le processus.',
    titleRequired: 'Le titre est obligatoire.',
    descriptionRequired: 'La description est obligatoire.',
    copyPrefix: (title: string) => `Copie de ${title}`,
  },
  kpis: {
    labels: {
      visible: 'visibles',
      active: 'actifs',
      open: 'ouvertes',
      closed: 'fermees',
      overdue: 'en retard',
      averageProgress: 'avancement moy.',
      tasks: 'taches',
      health: 'sante',
    },
    segments: {
      active: 'Actifs',
      paused: 'En pause',
      closedTasks: 'Taches fermees',
      audited: 'Auditees',
      overdue: 'En retard',
    },
    badges: {
      overdue: (count: number) => `${count} en retard`,
      paused: (count: number) => `${count} en pause`,
      health: (score: number) => `${score}% sante`,
    },
    insights: {
      empty: 'Aucun processus dans le filtre actuel. Creez ou ajustez les filtres pour evaluer l operation recurrente.',
      overdue: (overdue: number, average: number, open: number) =>
        `${overdue} taches en retard proviennent de processus actifs; l avancement moyen est ${average}% et ${open} taches restent ouvertes.`,
      paused: (paused: number, open: number, health: number) =>
        `Il y a ${paused} processus en pause dans le filtre. Les actifs soutiennent ${open} taches ouvertes avec une sante estimee de ${health}%.`,
      healthy: (active: number, closed: number, health: number) =>
        `Le portefeuille de processus est sain: ${active} actifs, ${closed} taches fermees et une sante estimee de ${health}%.`,
      default: (health: number, active: number, average: number) =>
        `La sante estimee du filtre est de ${health}% avec ${active} processus actifs et ${average}% d avancement moyen.`,
    },
  },
  form: {
    titles: {
      create: 'Creer un processus recurrent',
      edit: 'Modifier le processus recurrent',
    },
    descriptions: {
      create: 'Creez un processus recurrent pour generer des taches et les assigner dans l agenda du responsable.',
      edit: 'Mettez a jour la configuration, le responsable et la frequence sans changer le flux du module.',
    },
    labels: {
      unit: 'Unite',
      business: 'Secteur',
      title: 'Titre *',
      description: 'Description *',
      taskTitle: 'Titre de tache',
      taskDescription: 'Description de tache',
      taskNotes: 'Notes initiales',
      frequency: 'Frequence',
      responsible: 'Responsable',
      priority: 'Priorite',
      start: 'Debut',
      end: 'Fin',
      graceDays: 'Jours de grace',
      window: 'Fenetre',
      referenceDate: 'Date de reference',
    },
    placeholders: {
      unit: 'Aucune unite',
      business: 'Aucun secteur',
      responsible: 'Non assigne',
      title: 'Titre du processus recurrent',
      description: 'Decrivez comment le travail recurrent doit apparaitre dans l agenda du responsable',
      taskTitle: 'Si vide, le titre du processus est utilise',
      taskDescription: 'Si vide, la description du processus est utilisee',
      taskNotes: 'Notes operationnelles pour chaque tache generee',
    },
    sections: {
      taskTemplate: 'Modele de tache',
      taskTemplateDescription: 'Ces valeurs sont copiees dans chaque tache generee par le moteur.',
      evidenceRequired: 'Preuve requise',
      evidenceDescription: 'Marquez ce processus si ses taches doivent etre fermees avec fichiers ou photos de preuve.',
      engineControl: 'Controle du moteur',
      engineDescription: 'Definissez quand la generation commence, jusqu ou elle s applique et combien de jours d avance elle materialise.',
      schedule: 'Programmation du processus',
      scheduleDescription: (frequency: string) =>
        `Configurez la generation du processus recurrent lorsque la frequence selectionnee est ${frequency}.`,
    },
    recurrence: {
      daily: 'Le processus creera des taches chaque jour pour le responsable assigne.',
      weeklyTitle: 'Configuration hebdomadaire',
      weeklyDescription: 'Choisissez le jour de la semaine ou le processus doit apparaitre dans l agenda du responsable.',
      biWeeklyTitle: 'Configuration aux deux semaines',
      biWeeklyDescription: 'Choisissez les jours et la date de reference pour repeter le processus aux deux semaines.',
      monthlyTitle: 'Configuration mensuelle',
      monthlyDescription: 'Choisissez le ou les jours du mois ou le processus doit generer.',
      specificDatesTitle: 'Configuration par dates',
      specificDatesDescription: 'Ajoutez les dates exactes ou le processus doit creer des taches dans l agenda du responsable.',
      addDate: 'Ajouter une date',
      emptyDates: 'Ajoutez au moins une date pour activer cette programmation.',
      selectedDay: (day: string) => `Jour selectionne: ${day}`,
      removeDate: (date: string) => `Retirer ${date}`,
    },
    submit: {
      create: 'Creer le processus',
      edit: 'Enregistrer les changements',
    },
  },
  confirmation: {
    deleteTitle: 'Supprimer le processus',
    deleteDescription: 'Cela retire le processus du catalogue actif et annule les taches ouvertes qu il a generees. Les taches terminees ou deja annulees restent dans l historique.',
    deleteConfirm: 'Supprimer le processus',
  },
  describeFrequency: (frequency: ProcessFrequency, recurrence: ProcessRecurrenceConfig) => {
    const weekdays = frCA.weekdays as Record<Weekday, string>;

    switch (frequency) {
      case 'daily':
        return 'Tous les jours';
      case 'weekly':
        return `Chaque ${weekdays[recurrence.weeklyDay]}`;
      case 'bi-weekly': {
        const labels = recurrence.biWeeklyDays.map((day) => weekdays[day]).join(', ');
        return `Toutes les 2 semaines: ${labels}`;
      }
      case 'monthly':
        return `Jours ${recurrence.monthlyDays.join(', ')}`;
      case 'specific-dates':
        return recurrence.specificDates.length === 1
          ? '1 date configuree'
          : `${recurrence.specificDates.length} dates configurees`;
      default:
        return frCA.frequencies[frequency];
    }
  },
};
