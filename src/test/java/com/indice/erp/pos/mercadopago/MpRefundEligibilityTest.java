package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import java.time.Clock;
import java.time.Duration;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class MpRefundEligibilityTest {
    private final MpMerchantTokens tokens = mock(MpMerchantTokens.class);
    private final MpIntent intent = MpPaymentTestFixtures.intent();
    private MpRefundEligibility policy(Clock clock) {
        when(tokens.connection(42)).thenReturn(MpTestFixtures.connection());
        return new MpRefundEligibility(tokens, clock);
    }

    @Test void requiresOriginalMerchantAndEnvironment() {
        var policy = policy(Clock.fixed(MpTestFixtures.NOW, ZoneOffset.UTC));
        assertDoesNotThrow(() -> policy.require(intent));
        assertThrows(PosApiException.class, () -> policy.require(MpPaymentTestFixtures.change(intent, "sellerId", "other")));
        assertThrows(PosApiException.class, () -> policy.require(MpPaymentTestFixtures.change(intent, "connectionId", 8)));
        assertThrows(PosApiException.class, () -> policy.require(MpPaymentTestFixtures.change(intent, "environment", "production")));
    }

    @Test void refusesExpiredRefundPeriodAndUnverifiedProcessingRefund() {
        var boundary = MpTestFixtures.NOW.plus(Duration.ofDays(90));
        assertThrows(PosApiException.class, () -> policy(Clock.fixed(boundary, ZoneOffset.UTC)).require(intent));
        var pending = MpPaymentTestFixtures.change(intent, "refundPending", true);
        assertThrows(PosApiException.class, () -> policy(Clock.fixed(MpTestFixtures.NOW, ZoneOffset.UTC)).require(pending));
    }
}
