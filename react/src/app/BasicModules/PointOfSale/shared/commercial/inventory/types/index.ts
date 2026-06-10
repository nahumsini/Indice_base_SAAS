export interface CommercialInventoryMovement {
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

export type InventoryMovement = CommercialInventoryMovement;
export type MovementType = CommercialInventoryMovement['type'];
export type StockStatus = 'normal' | 'bajo' | 'agotado' | 'exceso';
