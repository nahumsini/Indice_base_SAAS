import { esMX } from './es-MX';
import type { SalesKpisTranslations } from './types';

export const ptBR: SalesKpisTranslations = {
  ...esMX,
  header: {
    title: 'KPIs comerciais',
    subtitle: 'Painel real de vendas: oportunidades, cotações, fechamentos, comissões, produtos e inventário comercial.',
  },
  filters: {
    title: 'Filtros',
    allUnits: 'Todas as unidades',
    allBusinesses: 'Todos os negócios',
    allSellers: 'Todos os vendedores',
    searchPlaceholder: 'Buscar oportunidade, cliente ou vendedor',
  },
};
