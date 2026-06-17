import { enCA } from './en-CA';
import type { SalesKpisTranslations } from './types';

export const esMX: SalesKpisTranslations = {
  ...enCA,
  header: {
    title: 'KPIs comerciales',
    subtitle: 'Tablero real de ventas: prospectos, cotizaciones, cierres, comisiones, productos e inventario comercial.',
  },
  filters: {
    title: 'Filtros',
    allUnits: 'Todas las unidades',
    allBusinesses: 'Todos los negocios',
    allSellers: 'Todos los vendedores',
    searchPlaceholder: 'Buscar prospecto, cliente o vendedor',
  },
  cards: {
    activeProspects: { label: 'Prospectos activos', detail: (count) => `${count} oportunidades totales` },
    quotes: { label: 'Cotizaciones', detail: (count) => `${count} aprobadas o ganadas` },
    salesRevenue: { label: 'Ingresos por ventas', detail: (count) => `${count} ventas registradas` },
    commissions: { label: 'Comisiones', detail: 'Calculadas desde ventas' },
    contacts: { label: 'Contactos', detail: (count) => `${count} clientes activos` },
    products: { label: 'Productos', detail: (count) => `${count} activos en catálogo` },
    averageTicket: { label: 'Ticket promedio', detail: 'Sobre ventas registradas' },
    quoteApproval: { label: 'Aprobación de cotizaciones', detail: (value) => `${value} rechazadas o expiradas` },
  },
  signals: {
    title: 'Señales comerciales',
    subtitle: 'Lectura rápida del embudo comercial y puntos que pueden frenar cierre o ejecución.',
    risk: 'Atención requerida',
    stable: 'Operación estable',
    conversion: 'Conversión cotización → venta',
    inventoryReadiness: 'Preparación inventario',
    inventoryReadyDetail: (ready, total) => `${ready} de ${total} productos listos`,
    commercialRisk: 'Riesgo comercial',
    commercialRiskDescription: 'Prospectos vencidos, estancados o sin seguimiento oportuno.',
  },
  sellerTable: {
    title: 'Rendimiento por vendedor',
    subtitle: 'Ranking por ventas ganadas, conversión, cotizaciones y pipeline.',
    columns: {
      rank: 'Rank',
      seller: 'Vendedor',
      sales: 'Ventas',
      pipeline: 'Pipeline',
      quotes: 'Cotizaciones',
      closed: 'Cierres',
      conversion: 'Conversión',
    },
  },
  prospectsTable: {
    title: 'Prospectos filtrados',
    subtitle: 'Operación diaria: seguimiento, etapa, valor estimado y próxima acción.',
    columns: {
      prospect: 'Prospecto',
      customer: 'Cliente',
      stage: 'Etapa',
      owner: 'Responsable',
      value: 'Valor',
      nextAction: 'Próxima acción',
      status: 'Estado',
    },
  },
};
