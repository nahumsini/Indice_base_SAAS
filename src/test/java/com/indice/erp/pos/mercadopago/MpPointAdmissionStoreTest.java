package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MpPointAdmissionStoreTest {
    @Test void sharedKeyArbitrationInsertsThenLocksBeforeCheckingImmutableOwner() {
        var jdbc = mock(JdbcTemplate.class);
        var reader = mock(MpPaymentAdmissionReader.class);
        var store = new MpPaymentAdmissionStore(jdbc, reader);
        var row = new MpPaymentAdmission("original_key", 9, 11, "hash", "RESERVED", null, null);
        when(reader.lock(42, "original_key")).thenReturn(row);
        assertSame(row, store.claim(MpTestFixtures.context(), MpPaymentTestFixtures.request("original_key"), "hash"));
        var ordered = inOrder(jdbc, reader);
        ordered.verify(jdbc).update(contains("ON DUPLICATE KEY UPDATE id=pos_mercado_pago_payment_admissions.id"), eq("original_key"), eq(11L),
            eq("CORPORATE_OFFICE"), isNull(), isNull(), eq("hash"), eq(42L), eq(9L));
        ordered.verify(reader).lock(42, "original_key");
        when(reader.lock(42, "original_key")).thenReturn(new MpPaymentAdmission("original_key", 8, 11, "hash", "RESERVED", null, null));
        assertThrows(PosApiException.class, () -> store.claim(MpTestFixtures.context(), MpPaymentTestFixtures.request("original_key"), "hash"));
    }
    @Test void rejectionCasCannotOverwriteAnAlreadyRejectedAdmission() {
        var jdbc = mock(JdbcTemplate.class);
        var store = new MpPaymentAdmissionStore(jdbc, null);
        var row = new MpPaymentAdmission("original_key", 9, 11, "hash", "RESERVED", null, null);
        assertThrows(PosApiException.class, () -> store.reject(MpTestFixtures.context(), row, PosApiException.conflict("Missing setup")));
        verify(jdbc).update(contains("AND status='RESERVED'"), eq("PREFLIGHT_REJECTED"), eq("Missing setup"), eq(409),
            eq(42L), eq("original_key"), eq(9L), eq(11L), eq("hash"));
    }
    @Test void typedAdviceContainsMatchingRequestKeyAndNoFabricatedIntent() {
        var response = new MpPaymentSubmissionAdvice().rejected(new MpPaymentNotSubmittedException(
            org.springframework.http.HttpStatus.CONFLICT, "original_key", "Missing setup"));
        assertEquals(409, response.getStatusCode().value());
        assertEquals(new MpPaymentSubmissionError("PAYMENT_NOT_SUBMITTED", "not_submitted", "original_key", "Missing setup"), response.getBody());
    }
}
