export interface VentasPorDepartamento {
  departamento: string;
  monto: number;
}

export interface Impuesto {
  tipo: string;
  tasa: number;
  monto: number;
}

export interface ClienteVenta {
  nombre: string;
  ventas?: number;
  ganancia?: number;
}

export interface CorteData {
  fecha: Date;
  ventasTotales: number;
  dineroEnCaja: number;

  // Desglose de ventas
  ventasEfectivoVales: number;
  ventasTarjetas: number;
  efectivo: number;
  tarjetas: number;
  ventasEnEfectivo: number;

  // Entradas
  entradasEfectivo: number;

  // Ventas por departamento
  ventasPorDepartamento: VentasPorDepartamento[];

  // Impuestos
  impuestos: Impuesto[];

  // Ganancia
  ventasSinImpuestos: number;
  egresos: number;
  costoTotalArticulos: number;
  descuentos: number;
  conTransferencia: number;
  otrosValesDespensa: number;
  conCheque: number;
  devolucionesVentas: number;
  gananciaTotal: number;

  // Ingresos de contado
  ventasEfectivoContado: number;
  ventasTransferencia: number;
  ventasCheque: number;

  // Salidas
  salidasEfectivo: number;
  pagoProveedores: number;

  // Pagos de créditos
  pagosCreditos: number;

  // Clientes destacados
  clientesMasVentas: ClienteVenta[];
  clientesMasGanancia: ClienteVenta[];
}
