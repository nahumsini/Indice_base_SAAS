import { esMX } from './es-MX';
import type { SalesKpisTranslations } from './types';

export const ptBR: SalesKpisTranslations = {
  ...esMX,
  header: {
    title: 'KPIs comerciais',
    subtitle: 'Painel real de vendas: oportunidades, cotações, fechamentos, clientes, comissões e risco comercial.',
  },
  filters: {
    title: 'Filtros',
    search: 'Buscar',
    unit: 'Unidade',
    business: 'Negócio',
    seller: 'Vendedor',
    allUnits: 'Todas as unidades',
    allBusinesses: 'Todos os negócios',
    allSellers: 'Todos os vendedores',
    searchPlaceholder: 'Buscar oportunidade, cliente ou vendedor',
  },
};
