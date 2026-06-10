import { AddPaymentModal } from './AddPaymentModal';
import { CashMovementModal } from './CashMovementModal';
import { CloseShiftModal } from './CloseShiftModal';
import { DiscountModal } from './DiscountModal';
import { ReturnModal } from './ReturnModal';
import { TicketModal } from './TicketModal';
import type { CashClosingInput } from '../../shared/cashClosing.types';
import type { Payment, PaymentMethod, SaleItem } from '../types/sale.types';
import type { Shift, CashMovement } from '../types/shift.types';
import type { SaleTotals } from '../utils/saleCalculations';

interface SaleModalsProps {
  showAddPaymentModal: boolean;
  selectedPaymentMethod: PaymentMethod | null;
  remainingAmount: number;
  showCloseShiftModal: boolean;
  currentShift: Shift | null;
  showCashMovementModal: boolean;
  selectedItemForDiscount: SaleItem | null;
  showDiscountModal: boolean;
  showGlobalDiscountModal: boolean;
  cart: SaleItem[];
  totals: SaleTotals;
  lastSale: {
    saleNumber: string;
    items: SaleItem[];
    payments: Payment[];
    totals: SaleTotals;
  } | null;
  showTicketModal: boolean;
  showReturnModal: boolean;
  onCloseAddPayment: () => void;
  onConfirmAddPayment: (amount: number, reference?: string, cashReceived?: number) => void;
  onCloseShiftModal: () => void;
  onConfirmCloseShift: (closing: CashClosingInput) => void;
  onCloseCashMovementModal: () => void;
  onConfirmCashMovement: (type: CashMovement['type'], amount: number, reason: string) => void;
  onCloseItemDiscount: () => void;
  onConfirmItemDiscount: (discount: number, type: SaleItem['discountType']) => void;
  onCloseGlobalDiscount: () => void;
  onConfirmGlobalDiscount: (discount: number, type: SaleItem['discountType']) => void;
  onCloseTicket: () => void;
  onCloseReturn: () => void;
  onConfirmReturn: (saleId: string, type: 'full' | 'partial') => void;
}

export function SaleModals({
  showAddPaymentModal,
  selectedPaymentMethod,
  remainingAmount,
  showCloseShiftModal,
  currentShift,
  showCashMovementModal,
  selectedItemForDiscount,
  showDiscountModal,
  showGlobalDiscountModal,
  cart,
  totals,
  lastSale,
  showTicketModal,
  showReturnModal,
  onCloseAddPayment,
  onConfirmAddPayment,
  onCloseShiftModal,
  onConfirmCloseShift,
  onCloseCashMovementModal,
  onConfirmCashMovement,
  onCloseItemDiscount,
  onConfirmItemDiscount,
  onCloseGlobalDiscount,
  onConfirmGlobalDiscount,
  onCloseTicket,
  onCloseReturn,
  onConfirmReturn,
}: SaleModalsProps) {
  const totalItemQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <AddPaymentModal
        isOpen={showAddPaymentModal}
        onClose={onCloseAddPayment}
        paymentMethod={selectedPaymentMethod}
        remainingAmount={remainingAmount}
        onConfirm={onConfirmAddPayment}
      />

      <CloseShiftModal
        isOpen={showCloseShiftModal}
        onClose={onCloseShiftModal}
        shift={currentShift}
        onConfirm={onConfirmCloseShift}
      />

      <CashMovementModal
        isOpen={showCashMovementModal}
        onClose={onCloseCashMovementModal}
        onConfirm={onConfirmCashMovement}
      />

      {selectedItemForDiscount && (
        <DiscountModal
          isOpen={showDiscountModal}
          onClose={onCloseItemDiscount}
          itemName={selectedItemForDiscount.name}
          itemPrice={selectedItemForDiscount.price}
          itemQuantity={selectedItemForDiscount.quantity}
          currentDiscount={selectedItemForDiscount.discount}
          currentDiscountType={selectedItemForDiscount.discountType}
          onConfirm={onConfirmItemDiscount}
        />
      )}

      <DiscountModal
        isOpen={showGlobalDiscountModal}
        onClose={onCloseGlobalDiscount}
        itemName={`Toda la venta (${cart.length} productos)`}
        itemPrice={totals.subtotal / totalItemQuantity || 0}
        itemQuantity={totalItemQuantity}
        currentDiscount={0}
        currentDiscountType="percentage"
        onConfirm={onConfirmGlobalDiscount}
      />

      {lastSale && (
        <TicketModal
          isOpen={showTicketModal}
          onClose={onCloseTicket}
          items={lastSale.items}
          payments={lastSale.payments}
          totals={lastSale.totals}
          shift={currentShift}
          saleNumber={lastSale.saleNumber}
        />
      )}

      <ReturnModal
        isOpen={showReturnModal}
        onClose={onCloseReturn}
        onConfirm={onConfirmReturn}
      />
    </>
  );
}
