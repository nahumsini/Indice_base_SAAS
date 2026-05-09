import { enCA } from './en-CA';
import type { PermissionsTranslations } from './types';

export const ptBR = {
  ...enCA,
  title: 'Permissões',
  subtitle: 'Gerencie solicitações, ausências, férias e status de aprovação.',
  actions: { columns: 'Colunas', addRequest: 'Adicionar solicitação', close: 'Fechar', approve: 'Aprovar', reject: 'Rejeitar', view: 'Ver' },
  columns: { ...enCA.columns, employee: 'Colaborador', type: 'Tipo', startDate: 'Data inicial', endDate: 'Data final', days: 'Dias', status: 'Status', actions: 'Ações' },
  filters: { ...enCA.filters, title: 'Filtros', searchLabel: 'Buscar solicitação', status: 'Status', allStatuses: 'Todos os status', allTypes: 'Todos os tipos', employee: 'Colaborador', allEmployees: 'Todos os colaboradores' },
  types: { vacation: 'Férias', sick_leave: 'Licença médica', personal: 'Pessoal', maternity: 'Maternidade/Paternidade', bereavement: 'Luto', unpaid: 'Licença sem remuneração', other: 'Outro' },
  status: { pending: 'Pendente', approved: 'Aprovada', rejected: 'Rejeitada' },
  columnsModal: { ...enCA.columnsModal, title: 'Colunas da tabela', close: 'Fechar modal de colunas', required: 'Obrigatória', done: 'Concluir' },
} as const satisfies PermissionsTranslations;
