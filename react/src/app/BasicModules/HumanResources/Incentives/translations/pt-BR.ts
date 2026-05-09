import { enCA } from './en-CA';
import type { IncentivesTranslations } from './types';

export const ptBR = {
  ...enCA,
  title: 'Incentivos',
  subtitle: 'Gerencie bônus manuais, regras automatizadas e aplicação na folha.',
  actions: { columns: 'Colunas', addIncentive: 'Adicionar incentivo' },
  columns: { incentive: 'Incentivo', type: 'Tipo', scope: 'Escopo', amount: 'Valor', application: 'Aplicação', status: 'Status' },
  filters: { ...enCA.filters, title: 'Filtros', searchLabel: 'Buscar incentivo', type: 'Tipo', status: 'Status', allTypes: 'Todos os tipos', allStatuses: 'Todos os status' },
  types: { Automatizado: 'Automatizado', Manual: 'Manual' },
  statuses: { Activo: 'Ativo', Programado: 'Agendado', Pausado: 'Pausado' },
  columnsModal: { ...enCA.columnsModal, title: 'Colunas da tabela', close: 'Fechar modal de colunas', required: 'Obrigatória', done: 'Concluir' },
} as const satisfies IncentivesTranslations;
