import { enCA } from './en-CA';
import type { ControlTranslations } from './types';

export const frCA = {
  ...enCA,
  title: 'Contrôle',
  subtitle: 'Suivez la présence en temps réel et gérez les règles opérationnelles.',
  refresh: 'Actualiser',
  loading: 'Chargement du contrôle',
  retry: 'Réessayer',
  genericError: 'Impossible de charger le contrôle de présence.',
  saveError: 'Le changement demandé n’a pas pu être enregistré.',
  bulkAssignSuccess: 'Assignation d’horaire mise à jour.',
  locationSaved: 'Site de contrat enregistré.',
  templateSaved: 'Modèle d’horaire enregistré.',
  searchPlaceholder: 'Rechercher employé, code, poste ou horaire',
  filters: {
    all: 'Tous',
    assigned: 'Assignés',
    unassigned: 'Sans horaire',
    late: 'En retard',
    corrected: 'Corrigés',
  },
  statuses: {
    ...enCA.statuses,
    on_time: 'À l’heure',
    late: 'Retard',
    leave: 'Congé',
    rest: 'Repos',
    absence: 'Aucun registre',
    pending: 'En attente',
    not_scheduled: 'Non planifié',
    active: 'Actif',
    inactive: 'Inactif',
  },
  labels: {
    ...enCA.labels,
    calendarKpiAttendances: 'Présences',
    calendarKpiAbsences: 'Absences',
    calendarKpiLate: 'Retards',
    calendarKpiRest: 'Repos',
    timeTable: 'Horaire',
    removeTimeTableDay: 'Supprimer le quart',
    removeTimeTableDayTitle: 'Supprimer le quart de l’horaire ?',
    removeTimeTableDayDescription: 'Cette action retire le quart ou le site de contrat assigné pour cette date seulement. Les entrées et sorties restent enregistrées.',
    removeTimeTableDayConfirm: 'Supprimer le quart',
    removeTimeTableDaySuccess: 'Quart retiré de l’horaire. Les dates futures restent assignées.',
    removingTimeTableDay: 'Suppression du quart',
    removingTimeTableDayDescription: 'Nous mettons l’horaire à jour et le gardons ouvert.',
    clearDaySchedule: 'Effacer l’horaire du jour',
    clearDayScheduleTitle: 'Effacer l’horaire du jour ?',
    clearDayScheduleDescription: 'Cette action efface l’horaire ou le site de contrat pour cette date et rend l’employé disponible pour un nouveau travail. Les entrées et sorties restent enregistrées.',
    clearDayScheduleConfirm: 'Effacer l’horaire du jour',
    clearDayScheduleSuccess: 'Horaire du jour effacé. L’employé est disponible pour un nouveau travail à cette date.',
    clearingDaySchedule: 'Effacement de l’horaire du jour',
    clearingDayScheduleDescription: 'Nous effaçons l’assignation de la date et actualisons la disponibilité.',
    noScheduleToClear: 'Aucun horaire ni site de contrat n’est assigné à cette date.',
    cancel: 'Annuler',
  },
  kpi: {
    absences: 'absences',
    activeShifts: 'quarts actifs',
    checkIns: 'entrées',
    checkOuts: 'sorties',
    late: 'retards',
    noRecords: 'sans registre',
    operationRate: 'avec entrée',
    reviewBadge: (count: number) => `${count} à revoir`,
    statusLabels: {
      absence: 'Absence',
      late: 'Retard',
      noRecord: 'Aucun registre',
      onTrack: 'À l’heure',
      other: 'Autres',
    },
    summaryInsight: ({ activeShiftCount, checkInsCount, reviewCount, totalCount }: Parameters<ControlTranslations['kpi']['summaryInsight']>[0]) => {
      if (totalCount === 0) {
        return 'Opération du jour: aucun employé pour cette date.';
      }

      const reviewText = reviewCount > 0
        ? `${reviewCount} demandent un suivi.`
        : 'aucun incident en attente.';

      return `Opération du jour: ${checkInsCount} sur ${totalCount} employés ont enregistré leur entrée, ${activeShiftCount} sont encore en quart, et ${reviewText}`;
    },
  },
} satisfies ControlTranslations;
