package com.indice.erp.pos.square;

import org.springframework.stereotype.Component;

@Component
class SquareCheckoutStatusMapper {

    SquareRecords.GatewayStatus map(SquareTerminalGateway.Checkout checkout) {
        if (checkout == null || checkout.id() == null || checkout.id().isBlank()) {
            return uncertain(null, null, "Square checkout response is missing.");
        }
        var status = SquareTerminalPaymentStatus.fromSquare(checkout.status(), checkout.cancelReason());
        if (status == SquareTerminalPaymentStatus.APPROVED
                && (checkout.paymentId() == null || checkout.paymentId().isBlank())) {
            return uncertain(checkout.id(), checkout.rawJson(), "Square completed without a payment id.");
        }
        return new SquareRecords.GatewayStatus(
            checkout.id(), checkout.paymentId(), status, checkout.rawJson(), null, reason(checkout, status));
    }

    SquareRecords.GatewayStatus uncertain(String checkoutId, String rawJson, String message) {
        return new SquareRecords.GatewayStatus(
            checkoutId, null, SquareTerminalPaymentStatus.UNCERTAIN, rawJson, "SQUARE_UNCERTAIN", message);
    }

    private String reason(SquareTerminalGateway.Checkout checkout, SquareTerminalPaymentStatus status) {
        if (status == SquareTerminalPaymentStatus.DECLINED) return "Square terminal payment was declined.";
        if (status == SquareTerminalPaymentStatus.CANCELLED) return "Square terminal payment was cancelled.";
        if (status == SquareTerminalPaymentStatus.UNCERTAIN) return "Square terminal payment state is uncertain.";
        return null;
    }
}
