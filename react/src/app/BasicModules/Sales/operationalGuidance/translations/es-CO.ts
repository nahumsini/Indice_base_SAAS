import { esMX } from './es-MX';

export const esCO = {
  ...esMX,
  subtitle: 'Conecta oportunidades, cotizaciones, cierre comercial, alistamiento de inventario, validacion financiera y posventa.',
  tabs: {
    ...esMX.tabs,
    sales: {
      ...esMX.tabs.sales,
      summary: 'Usa Ventas para registrar negocios ganados y preparar el traspaso a cartera, inventario, comisiones y posventa.',
      steps: [
        esMX.tabs.sales.steps[0],
        {
          title: 'Valida soporte de pago',
          description: 'Cartera avanza mejor cuando metodo, referencia y estado del soporte estan claros.',
        },
        esMX.tabs.sales.steps[2],
      ],
    },
    'after-sales': {
      ...esMX.tabs['after-sales'],
      label: 'Posventa',
      ctaLabel: 'Revisar posventa',
    },
  },
} as const;
