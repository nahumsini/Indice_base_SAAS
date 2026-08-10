import type { BillingTranslations } from './types';

export const ptBR = {
  billingDayLabel: (day: number) => `Dia ${day} de cada mês`,
  recovery: {
    loadError: 'Não foi possível consultar a assinatura.',
    portalError: 'Não foi possível abrir o portal de faturamento.',
    loading: 'Consultando o estado comercial atual...',
    title: 'Estado comercial',
    syncing: 'Sincronizando',
    enabled: 'As operações da conta estão habilitadas.',
    actionRequired: 'Regularize o faturamento para restaurar todas as operações.',
    manage: 'Gerenciar no Stripe',
  },
  storage: {
    title: 'Armazenamento da conta',
    summary: (purchased: number, benefit: number) =>
      `5 GB incluídos · ${purchased} comprados · ${benefit} de cortesia`,
    usageLabel: 'Uso do armazenamento',
    note: 'Inclui arquivos salvos e envios reservados. A compra de blocos será habilitada após a aprovação do preço comercial.',
  },
} as const satisfies BillingTranslations;
