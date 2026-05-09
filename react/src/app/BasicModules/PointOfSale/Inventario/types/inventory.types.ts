export interface InventoryMovement {
  id: string;
  productId: string;
  type: 'entrada' | 'salida' | 'ajuste' | 'venta' | 'devolucion';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  reference?: string;
  user: string;
  date: Date;
}

export type MovementType = 'entrada' | 'salida' | 'ajuste' | 'venta' | 'devolucion';
export type StockStatus = 'normal' | 'bajo' | 'agotado' | 'exceso';
