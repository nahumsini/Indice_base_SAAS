package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MpPointCancellationSafetyTest {
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final MpMerchantTokens tokens = mock(MpMerchantTokens.class);
    private final MpPointGateway gateway = mock(MpPointGateway.class);
    private final MpPaymentCancellation service = new MpPaymentCancellation(tokens, gateway,
        new MpOrderOwnership(), new MpIntentWriter(jdbc), null, MpPaymentTestFixtures.JSON);
    @Test void missingOrderIdentifierCannotBeTreatedAsCancelled() {
        var intent = MpPaymentTestFixtures.change(MpPaymentTestFixtures.intent(), "orderId", null);
        service.cancel(intent);
        verifyNoInteractions(tokens, gateway);
        verify(jdbc).update(contains("status=CASE"),
            eq("Submission may have reached the terminal. Recover before cancelling."), eq(42L), eq(17L));
    }
    @Test void approvalCannotBeCancelledBeforeOrAfterSaleFinalization() {
        var approved = MpPaymentTestFixtures.change(MpPaymentTestFixtures.intent(), "status", "APPROVED");
        assertThrows(PosApiException.class, () -> service.cancel(approved));
        var completed = MpPaymentTestFixtures.change(approved, "posTicketId", 81L);
        assertThrows(PosApiException.class, () -> service.cancel(completed));
        verifyNoInteractions(tokens, gateway, jdbc);
    }
}
