import { esMX } from './es-MX';

export const esCO = {
  ...esMX,
  learningMode: {
    ...esMX.learningMode,
    subtitle: 'Usa esta vista para preparar cotizaciones completas, rentables, vigentes y listas para convertirse en venta cuando el cliente acepta.',
    flow: [
      esMX.learningMode.flow[0],
      esMX.learningMode.flow[1],
      esMX.learningMode.flow[2],
      {
        label: 'Decisión',
        description: 'Cuando se acepta, conecta la cotización con oportunidad, venta y ejecución operativa.',
      },
    ],
    footer: 'Una cotización no es solo un documento. Es la promesa comercial que puede convertirse en trabajo de Ventas, Inventario, Cartera y Posventa.',
  },
};
