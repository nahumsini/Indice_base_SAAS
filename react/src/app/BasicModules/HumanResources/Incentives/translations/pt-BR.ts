import { enCA } from './en-CA';
import type { IncentivesTranslations } from './types';
import { ptBRIncentiveForm } from './formLocales';

export const ptBR = {
  ...enCA,
  form: ptBRIncentiveForm,
  title: 'Incentivos',
  subtitle: 'Gerencie bônus manuais, regras automatizadas e aplicação na folha.',
  actions: { columns: 'Colunas', addIncentive: 'Adicionar incentivo' },
  columns: { incentive: 'Incentivo', type: 'Tipo', scope: 'Escopo', amount: 'Valor', application: 'Aplicação', status: 'Situação' },
  filters: { title: 'Filtros', searchLabel: 'Buscar incentivo', searchPlaceholder: 'Nome, escopo, valor ou aplicação', type: 'Tipo', status: 'Situação', allTypes: 'Todos os tipos', allStatuses: 'Todas as situações' },
  types: { Automatizado: 'Automatizado', Manual: 'Manual' },
  statuses: { Activo: 'Ativo', Programado: 'Agendado', Pausado: 'Pausado' },
  kpis: {
    total: 'Total de incentivos',
    active: 'Ativos',
    automated: 'Automatizados',
    manual: 'Manuais',
    visibleAfterFilters: 'visíveis após filtros',
    eligibleEmployees: 'colaboradores elegíveis',
    summary: (activeCount: number, scheduledCount: number, pausedCount: number, selectedCount: number, visibleCount: number, totalCount: number) =>
      `Resumo de incentivos: ${activeCount} ativos · ${scheduledCount} agendados · ${pausedCount} pausados · ${selectedCount} selecionados · mostrando ${visibleCount} de ${totalCount}.`,
  },
  columnsModal: { title: 'Colunas da tabela', subtitle: 'Escolha as colunas de incentivos visíveis nesta visão.', close: 'Fechar modal de colunas', required: 'Obrigatória', done: 'Concluir' },
  table: { empty: 'Nenhum incentivo corresponde aos filtros atuais.', showing: (count: number) => `Mostrando ${count} incentivos`, page: 'Página 1 de 1', previous: 'Anterior', next: 'Próximo' },
  pagination: {
    pageSize: 'Linhas por página',
    showing: (start: number, end: number, total: number) => `Mostrando ${start}-${end} de ${total} incentivos`,
    page: (current: number, total: number) => `Página ${current} de ${total}`,
    previous: 'Anterior',
    next: 'Próximo',
  },
  newIncentive: { selectedCollaborators: (count: number) => `${count} colaboradores`, automatedRule: 'Regra automática', fixed: 'fixo', pending: 'Pendente', nextPayroll: 'Próxima folha' },
} as const satisfies IncentivesTranslations;
