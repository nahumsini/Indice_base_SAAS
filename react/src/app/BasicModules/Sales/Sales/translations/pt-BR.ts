import { enCA } from './en-CA';

export const ptBR = {
  ...enCA,
  common: { ...enCA.common, all: 'Todos', cancel: 'Cancelar', close: 'Fechar', save: 'Salvar venda', view: 'Ver venda' },
  header: {
    emoji: '💼',
    title: 'Vendas',
    subtitle: 'Acompanhe vendas ganhas, evidência de pagamento, validações, inventário e comissões.',
    columnsAction: 'Colunas',
    primaryAction: 'Nova venda',
  },
  filters: {
    ...enCA.filters,
    title: 'Filtros',
    search: 'Buscar',
    businessUnit: 'Unidade de negócio',
    business: 'Negócio',
    period: 'Período',
    seller: 'Vendedor',
    customer: 'Cliente',
    periodOptions: {
      today: 'Hoje',
      thisWeek: 'Esta semana',
      thisMonth: 'Este mês',
      lastMonth: 'Mês passado',
      custom: 'Intervalo personalizado',
    },
  },
  kpis: {
    totalSalesAmount: 'Valor total vendido',
    totalCommissions: 'Comissões totais',
    averageTicket: 'Ticket médio',
    salesCount: 'Vendas',
    pendingFinanceValidation: 'Finanças pendentes',
    pendingInventoryMovement: 'Movimento pendente',
    deliveredSales: 'Vendas entregues',
  },
  insight: {
    summary: (totalAmount: string, totalCommissions: string, visible: number, total: number) => (
      `Resumo de vendas: ${totalAmount} vendidos · ${totalCommissions} em comissões · ${visible} vendas · mostrando ${visible} de ${total}.`
    ),
  },
  statuses: {
    ...enCA.statuses,
    paymentEvidence: {
      missing: 'Ausente',
      uploaded: 'Enviada',
      under_review: 'Em revisão',
      approved: 'Aprovada',
      rejected: 'Rejeitada',
    },
  },
  guidance: {
    ...enCA.guidance,
    title: 'Guia operacional',
  },
} as const;
