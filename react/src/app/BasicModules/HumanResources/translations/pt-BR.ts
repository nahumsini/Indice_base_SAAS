import type { HumanResourcesTranslations } from './types';

export const ptBR = {
  title: 'Recursos Humanos',
  subtitle: 'Gerencie colaboradores, presença, folha e operação da equipe.',
  back: 'Voltar',
  loading: {
    title: 'Carregando aba de RH',
    description: 'Baixando apenas o espaço selecionado de recursos humanos.',
  },
  access: {
    loadingTitle: 'Carregando acesso de RH',
    loadingDescription: 'Verificando quais espaços de trabalho estão disponíveis.',
    empty: 'Nenhuma aba de Recursos Humanos está disponível para este usuário.',
  },
  tabs: {
    collaborators: 'Colaboradores',
    attendance: 'Presença',
    control: 'Controle de presença',
    payroll: 'Folha',
    announcements: 'Comunicados',
    assets: 'Ativos',
    records: 'Registros',
    permissions: 'Permissões',
    incentives: 'Incentivos',
    kpis: 'Indicadores',
  },
} satisfies HumanResourcesTranslations;
