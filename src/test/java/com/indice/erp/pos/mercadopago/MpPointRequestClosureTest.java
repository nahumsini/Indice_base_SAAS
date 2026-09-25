package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MpPointRequestClosureTest {
    @Test void closeWinningBeforeLateCreatePermanentlyBlocksOriginalKeyDespitePlaceholderHash() {
        var f = new MpAdmissionTestFixtures();
        var intents = mock(MpPaymentClosureIntents.class);
        when(f.admissions.claim(any(), anyString(), anyLong(), anyString())).thenReturn(f.admission);
        when(intents.find(any(), anyString(), anyLong())).thenReturn(Optional.empty());
        when(f.admissions.reject(any(), any(), eq("REQUEST_CLOSED"), any())).thenAnswer(call -> {
            when(f.admissions.claim(any(), any(), anyString())).thenReturn(new MpPaymentAdmission(
                "original_key", 9, 11, "0".repeat(64), "REJECTED", "Closed", 409));
            return new MpPaymentNotSubmittedException(org.springframework.http.HttpStatus.CONFLICT, "original_key", "Closed");
        });
        var result = new MpPaymentRequestClosure(f.guard, f.admissions, intents).close(MpTestFixtures.context(), "original_key", 9);
        assertEquals("not_submitted", result.rejection().submissionState());
        assertThrows(MpPaymentNotSubmittedException.class, () -> f.service.reserve(MpTestFixtures.context(), f.request));
        verifyNoInteractions(f.preparation, f.creator);
    }
    @ParameterizedTest @ValueSource(strings={"WAITING","UNCERTAIN","APPROVED","DECLINED","REFUNDED"})
    void createWinningBeforeCloseReturnsExistingIntentAndNeverCreatesRejection(String status) {
        var f = new MpAdmissionTestFixtures();
        var intent = MpPaymentTestFixtures.change(MpPaymentTestFixtures.intent(), "status", status);
        var intents = mock(MpPaymentClosureIntents.class);
        when(f.admissions.claim(any(), anyString(), anyLong(), anyString())).thenReturn(f.admission);
        when(intents.find(any(), anyString(), anyLong())).thenReturn(Optional.of(intent));
        var result = new MpPaymentRequestClosure(f.guard, f.admissions, intents).close(MpTestFixtures.context(), "original_key", 9);
        assertSame(intent, result.intent());
        assertNull(result.rejection());
        verify(f.admissions, never()).reject(any(), any(), anyString(), any());
    }
}
