import type { CommercialInventoryMovement } from '../types';

export function toCommercialInventoryMovement(
  movement: CommercialInventoryMovement,
): CommercialInventoryMovement {
  return { ...movement };
}
