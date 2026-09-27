package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MpPointPaymentReservationTest {
    private final MpIntentReader reader = mock(MpIntentReader.class);
    private final MpPaymentIdentity identity = new MpPaymentIdentity(MpPaymentTestFixtures.JSON);
    private final MpTerminalVerification verification = mock(MpTerminalVerification.class);
    private final MpPaymentReservationTransaction transaction = mock(MpPaymentReservationTransaction.class);
    private final MpPaymentReservation service = new MpPaymentReservation(identity, reader, verification, transaction);
    @Test void identicalKeyReturnsOriginalFrozenAttemptEvenAfterLocalExpiration() {
        var request = MpPaymentTestFixtures.request("original_key");
        var original = MpPaymentTestFixtures.change(MpPaymentTestFixtures.intent(), "payloadHash", identity.hash(request));
        original = MpPaymentTestFixtures.change(original, "expiresAt", MpTestFixtures.NOW.minusSeconds(1));
        when(reader.byKey(MpTestFixtures.context(), "original_key")).thenReturn(Optional.of(original));
        assertSame(original, service.reserve(MpTestFixtures.context(), request));
        verifyNoInteractions(verification, transaction);
    }
    @Test void changedPayloadCannotUseOriginalAttemptKeyOrReachPreflight() {
        var original = MpPaymentTestFixtures.intent();
        when(reader.byKey(MpTestFixtures.context(), "original_key")).thenReturn(Optional.of(original));
        assertThrows(PosApiException.class, () -> service.reserve(MpTestFixtures.context(), MpPaymentTestFixtures.request("original_key")));
    }
    @Test void invalidCurrencyOrKeyFailsBeforeRegisterLookup() {
        var request = MpPaymentTestFixtures.request("original_key");
        var wrongCurrency = new MpCreatePayment(request.idempotencyKey(), 9L, null, null, null, "USD", request.items(), null);
        assertThrows(PosApiException.class, () -> service.reserve(MpTestFixtures.context(), wrongCurrency));
        assertThrows(PosApiException.class, () -> service.reserve(MpTestFixtures.context(), MpPaymentTestFixtures.request("unsafe key")));
        verifyNoInteractions(reader, verification, transaction);
    }
}
