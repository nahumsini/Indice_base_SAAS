package com.indice.erp.pos.square;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class SquareCheckoutEvidencePolicyTest {
    private final SquareCheckoutEvidencePolicy policy = new SquareCheckoutEvidencePolicy(new ObjectMapper(), new SquareCheckoutIdentityPolicy());
    @Test
    void matchingAuthoritativeCheckoutAcceptsItsOriginalAttempt() {
        assertThatCode(() -> policy.require(SquareEvidenceFixtures.intent(), SquareEvidenceFixtures.checkout(1050L, "device-1")))
            .doesNotThrowAnyException();
    }
    @Test
    void completedCheckoutFromDifferentDeviceCannotApproveSale() {
        assertThatThrownBy(() -> policy.require(SquareEvidenceFixtures.intent(), SquareEvidenceFixtures.checkout(1050L, "other-device")))
            .isInstanceOf(SquareGatewayException.class);
    }
    @Test
    void completedCheckoutWithDifferentAmountCannotApproveSale() {
        assertThatThrownBy(() -> policy.require(SquareEvidenceFixtures.intent(), SquareEvidenceFixtures.checkout(1000L, "device-1")))
            .isInstanceOf(SquareGatewayException.class);
    }
}
