import { enCA } from './en-CA';
import type { ControlTranslations } from './types';

export const ptBR = {
  ...enCA,
  title: 'Controle',
  subtitle: 'Monitore presença em tempo real e gerencie regras operacionais.',
  refresh: 'Atualizar',
  loading: 'Carregando controle',
  retry: 'Tentar novamente',
  genericError: 'Não foi possível carregar o controle de presença.',
  saveError: 'Não foi possível salvar a alteração solicitada.',
  bulkAssignSuccess: 'Atribuição de escala atualizada com sucesso.',
  locationSaved: 'Local de contrato salvo com sucesso.',
  templateSaved: 'Modelo de escala salvo com sucesso.',
  searchPlaceholder: 'Buscar funcionário, código, cargo ou escala',
  filters: {
    all: 'Todos',
    assigned: 'Atribuídos',
    unassigned: 'Sem escala',
    late: 'Atrasos',
    corrected: 'Corrigidos',
  },
  statuses: {
    ...enCA.statuses,
    on_time: 'No horário',
    late: 'Atraso',
    leave: 'Licença',
    rest: 'Descanso',
    absence: 'Sem registro',
    pending: 'Pendente',
    not_scheduled: 'Sem escala',
    active: 'Ativo',
    inactive: 'Inativo',
  },
  labels: {
    ...enCA.labels,
    timeTable: 'Tabela de horários',
    removeTimeTableDay: 'Remover turno',
    removeTimeTableDayTitle: 'Remover turno da tabela de horários?',
    removeTimeTableDayDescription: 'Isso remove o turno ou local de contrato atribuído somente para esta data. Os registros de entrada e saída continuam salvos.',
    removeTimeTableDayConfirm: 'Remover turno',
    removeTimeTableDaySuccess: 'Turno removido da tabela de horários. As datas futuras continuam atribuídas.',
    removingTimeTableDay: 'Removendo turno',
    removingTimeTableDayDescription: 'Estamos atualizando a tabela de horários e mantendo ela aberta.',
    clearDaySchedule: 'Limpar horário do dia',
    clearDayScheduleTitle: 'Limpar horário do dia?',
    clearDayScheduleDescription: 'Isso limpa o horário ou local de contrato desta data e deixa o funcionário disponível para atribuir novo trabalho. Os registros de entrada e saída continuam salvos.',
    clearDayScheduleConfirm: 'Limpar horário do dia',
    clearDayScheduleSuccess: 'Horário do dia limpo. O funcionário está disponível para novo trabalho nesta data.',
    clearingDaySchedule: 'Limpando horário do dia',
    clearingDayScheduleDescription: 'Estamos limpando a atribuição da data e atualizando a disponibilidade.',
    noScheduleToClear: 'Não há horário nem local de contrato atribuído nesta data.',
    cancel: 'Cancelar',
  },
  kpi: {
    absences: 'ausências',
    activeShifts: 'turnos ativos',
    checkIns: 'entradas',
    checkOuts: 'saídas',
    late: 'atrasos',
    noRecords: 'sem registro',
    operationRate: 'com entrada',
    reviewBadge: (count: number) => `${count} para revisar`,
    statusLabels: {
      absence: 'Ausência',
      late: 'Atraso',
      noRecord: 'Sem registro',
      onTrack: 'No horário',
      other: 'Outros',
    },
    summaryInsight: ({ activeShiftCount, checkInsCount, reviewCount, totalCount }: Parameters<ControlTranslations['kpi']['summaryInsight']>[0]) => {
      if (totalCount === 0) {
        return 'Operação do dia: sem funcionários para esta data.';
      }

      const reviewText = reviewCount > 0
        ? `${reviewCount} precisam de acompanhamento.`
        : 'sem incidentes pendentes.';

      return `Operação do dia: ${checkInsCount} de ${totalCount} funcionários registraram entrada, ${activeShiftCount} seguem em turno e ${reviewText}`;
    },
  },
} satisfies ControlTranslations;
