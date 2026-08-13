import type { DistributorPortalCopy } from './types';

export const ptBR: DistributorPortalCopy = {
  navigation: { portalName: 'Portal do distribuidor', local: 'Local', backToErp: 'Voltar ao ERP' },
  tabs: { contractsAccess: 'Contratos e acessos', consulting: 'Consultorias' },
  header: { eyebrow: 'Operação de distribuição', title: 'Contratos e acessos', subtitle: 'Acompanhe cada prospect da sua carteira, do primeiro acesso ao contrato ativo.' },
  actions: { refresh: 'Atualizar', refreshing: 'Atualizando…', view: 'Ver cliente', manage: 'Administrar', addClient: 'Adicionar cliente', extendTrial: 'Estender teste', close: 'Fechar' },
  metrics: { totalClients: 'Clientes na carteira', prospects: 'Prospects', demosTrials: 'Demos e testes', activeContracts: 'Contratos ativos', attention: 'Requer atenção' },
  filters: { title: 'Carteira comercial', subtitle: 'Encontre uma empresa por nome, e-mail ou número da conta.', matches: 'clientes encontrados', search: 'Buscar', searchPlaceholder: 'Empresa, e-mail ou número da conta', stage: 'Etapa comercial', allStages: 'Todas as etapas' },
  table: { title: 'Prospects e clientes', subtitle: 'Somente contas vinculadas à sua distribuidora aparecem aqui.', company: 'Empresa', stage: 'Etapa', access: 'Acesso e módulos', contract: 'Contrato', users: 'Usuários', nextEvent: 'Próximo evento', action: 'Ação', noResults: 'Nenhum cliente corresponde aos filtros.', noClients: 'Sua carteira vinculada ainda está vazia.', noPlan: 'Sem contrato', noModules: 'Sem módulos habilitados', noDate: 'Sem data agendada', daysRemaining: 'dias restantes', members: 'ativos', seats: 'capacidade', review: 'Revisar pagamento' },
  detail: { eyebrow: 'Cliente da carteira', subtitle: 'Resumo comercial e de acesso somente leitura.', contact: 'Contato proprietário', country: 'País', stage: 'Etapa comercial', access: 'Status de acesso', contract: 'Contrato', billing: 'Status de cobrança', modules: 'Módulos habilitados', capacity: 'Capacidade de usuários', nextEvent: 'Próximo evento', directPortfolio: 'Esta conta está vinculada diretamente à sua distribuidora.' },
  states: { PROSPECT: 'Prospect', DEMO: 'Demo', TRIAL: 'Teste', ACTIVE: 'Ativo', ATTENTION: 'Atenção', INACTIVE: 'Inativo' },
  errors: { title: 'Não foi possível carregar a carteira', retry: 'Tentar novamente', forbidden: 'Esta empresa não tem acesso ao portal do distribuidor.' },
};
