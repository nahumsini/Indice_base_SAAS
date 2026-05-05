import { CorteData } from '../types/corte.types';

export const mockCorteData: CorteData = {
  fecha: new Date('2026-05-04'),
  ventasTotales: 35580.50,
  dineroEnCaja: 23044.24,

  // Desglose de ventas
  ventasEfectivoVales: 12000.00,
  ventasTarjetas: 8536.26,
  efectivo: 6000.00,
  tarjetas: 1400.00,
  ventasEnEfectivo: 6000.00,

  // Entradas
  entradasEfectivo: 3200.00,

  // Ventas por departamento
  ventasPorDepartamento: [
    { departamento: 'Para el Hogar', monto: 15580.50 },
    { departamento: 'Limpieza', monto: 8200.00 },
    { departamento: 'Higiene Personal', monto: 7500.00 },
    { departamento: 'Desechables', monto: 4300.00 },
  ],

  // Impuestos
  impuestos: [
    { tipo: 'IVA (16%) - Trasladado', tasa: 16, monto: 4928.98 },
    { tipo: 'IVA (0%) - Trasladado', tasa: 0, monto: 0 },
  ],

  // Ganancia
  ventasSinImpuestos: 30651.52,
  egresos: 12115.00,
  costoTotalArticulos: 15890.00,
  descuentos: 850.00,
  conTransferencia: 8215.00,
  otrosValesDespensa: 335.00,
  conCheque: 515.00,
  devolucionesVentas: 0,
  gananciaTotal: 9588.40,

  // Ingresos de contado
  ventasEfectivoContado: 18417.26,
  ventasTransferencia: 12419.00,
  ventasCheque: 4744.24,

  // Salidas
  salidasEfectivo: 3500.00,
  pagoProveedores: 3500.00,

  // Pagos de créditos
  pagosCreditos: 0,

  // Clientes destacados
  clientesMasVentas: [
    { nombre: 'Supermercado El Ahorro', ventas: 18500.00 },
    { nombre: 'Comercializadora XYZ', ventas: 6400.00 },
    { nombre: 'Restaurante La Terraza', ventas: 3200.00 },
  ],

  clientesMasGanancia: [
    { nombre: 'Supermercado El Ahorro', ganancia: 5920.00 },
    { nombre: 'Comercializadora XYZ', ganancia: 2048.00 },
    { nombre: 'Restaurante La Terraza', ganancia: 1024.00 },
  ],
};
