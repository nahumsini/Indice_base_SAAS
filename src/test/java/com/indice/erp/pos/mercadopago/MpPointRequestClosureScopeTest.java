package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MpPointRequestClosureScopeTest {
    @Test void scopedReaderAbsenceCannotCloseAnotherOwnedOrHistoricalIntent() {
        var jdbc = mock(JdbcTemplate.class);
        var reader = mock(MpIntentReader.class);
        when(reader.byKey(any(), anyString())).thenReturn(Optional.empty());
        when(jdbc.queryForList(anyString(), eq(Long.class), eq(42L), eq("original_key"))).thenReturn(java.util.List.of(17L));
        var intents = new MpPaymentClosureIntents(jdbc, reader);
        assertThrows(PosApiException.class, () -> intents.find(MpTestFixtures.context(), "original_key", 9));
        verify(jdbc).queryForList(contains("WHERE company_id=? AND idempotency_key=? FOR UPDATE"), eq(Long.class), eq(42L), eq("original_key"));
    }
    @Test void invalidIdentityNeverEntersRegisterOrAdmissionTransaction() {
        var f = new MpAdmissionTestFixtures();
        var service = new MpPaymentRequestClosure(f.guard, f.admissions, null);
        assertThrows(PosApiException.class, () -> service.close(MpTestFixtures.context(), "unsafe key", 9));
        assertThrows(PosApiException.class, () -> service.close(MpTestFixtures.context(), "original_key", 0));
        verifyNoInteractions(f.guard, f.admissions);
    }
}
