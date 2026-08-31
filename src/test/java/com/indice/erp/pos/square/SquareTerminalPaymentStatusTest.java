package com.indice.erp.pos.square;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class SquareTerminalPaymentStatusTest {

    @Test
    void mapsSquareCheckoutStatesToIndiceStates() {
        assertThat(SquareTerminalPaymentStatus.fromSquare("COMPLETED", null))
            .isEqualTo(SquareTerminalPaymentStatus.APPROVED);
        assertThat(SquareTerminalPaymentStatus.fromSquare("PENDING", null))
            .isEqualTo(SquareTerminalPaymentStatus.WAITING);
        assertThat(SquareTerminalPaymentStatus.fromSquare("IN_PROGRESS", null))
            .isEqualTo(SquareTerminalPaymentStatus.WAITING);
        assertThat(SquareTerminalPaymentStatus.fromSquare("CANCEL_REQUESTED", null))
            .isEqualTo(SquareTerminalPaymentStatus.WAITING);
        assertThat(SquareTerminalPaymentStatus.fromSquare("CANCELED", "BUYER_CANCELED"))
            .isEqualTo(SquareTerminalPaymentStatus.CANCELLED);
        assertThat(SquareTerminalPaymentStatus.fromSquare("CANCELED", "DECLINED"))
            .isEqualTo(SquareTerminalPaymentStatus.DECLINED);
        assertThat(SquareTerminalPaymentStatus.fromSquare("SOMETHING_NEW", null))
            .isEqualTo(SquareTerminalPaymentStatus.UNCERTAIN);
    }
}
