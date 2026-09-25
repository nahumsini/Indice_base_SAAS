package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class MpRefundReplayTest {
    private final MpRefundRequestStore requests = mock(MpRefundRequestStore.class);
    private final MpRefundRequest request = new MpRefundRequest("refund_key", null, "synthetic reason");
    private final MpJson json = MpPaymentTestFixtures.JSON;
    private MpRefundRecord record(long intentId, String status) {
        return new MpRefundRecord(19, 42, intentId, "refund_key", new BigDecimal("70.00"),
            BigDecimal.ZERO, "{}", json.hash(json.write(request)), status, 11L, "admin",
            "BUSINESS_OFFICE", 6L, 7L, null, null, 0, 0, MpTestFixtures.NOW, null, null, 0);
    }

    @Test void confirmedFullRefundReplaysWithoutNewVerificationOrProviderSubmission() {
        var refund = record(17, "CONFIRMED");
        when(requests.byKey(42, "refund_key")).thenReturn(Optional.of(refund));
        var full = MpPaymentTestFixtures.change(MpPaymentTestFixtures.intent(), "status", "REFUNDED");
        var reader = mock(MpIntentReader.class);
        when(reader.find(full.context(), 17)).thenReturn(Optional.of(full));
        var lifecycle = mock(MpRefundLifecycle.class);
        when(lifecycle.progress(eq(full), eq(refund), any())).thenReturn(refund);
        var service = new MpRefundService(new MpRefundPolicy(true), reader, null,
            null, null, new MpRefundReplay(requests, json), lifecycle);
        assertSame(refund, service.refund(full.context(), 17, request));
    }

    @Test void reusedKeyCannotDiscloseAnotherPaymentRefund() {
        when(requests.byKey(42, "refund_key")).thenReturn(Optional.of(record(18, "CONFIRMED")));
        assertThrows(PosApiException.class, () -> new MpRefundReplay(requests, json)
            .existing(MpPaymentTestFixtures.intent(), request));
    }
}
