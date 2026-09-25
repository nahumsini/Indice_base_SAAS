package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MpPointAdmissionCommitTest {
    @Test void knownPreflightRejectionCommitsBeforeTypedErrorEscapes() {
        var f = new MpAdmissionTestFixtures();
        var error = PosApiException.conflict("Terminal configuration is missing.");
        doThrow(error).when(f.preparation).prepare(any(), any(), any());
        when(f.admissions.reject(any(), any(), eq(error))).thenReturn(
            new MpPaymentNotSubmittedException(error.status(), f.request.idempotencyKey(), error.getMessage()));
        var rejected = assertThrows(MpPaymentNotSubmittedException.class,
            () -> f.service.reserve(MpTestFixtures.context(), f.request));
        assertTrue(f.committed);
        assertEquals("original_key", rejected.requestKey());
        verifyNoInteractions(f.creator);
    }
    @Test void creatorInsertFaultNeverBecomesNonSubmissionProof() {
        var f = new MpAdmissionTestFixtures();
        when(f.creator.create(any(), any(), any(), any(), any(), anyString(), anyString(), anyString(), any()))
            .thenThrow(new IllegalStateException("database failure"));
        assertThrows(IllegalStateException.class, () -> f.service.reserve(MpTestFixtures.context(), f.request));
        assertFalse(f.committed);
        verify(f.admissions, never()).reject(any(), any(), any());
    }
    @Test void unknownPreparationFaultNeverBecomesNonSubmissionProof() {
        var f = new MpAdmissionTestFixtures();
        doThrow(new IllegalStateException("unknown configuration failure")).when(f.preparation).prepare(any(), any(), any());
        assertThrows(IllegalStateException.class, () -> f.service.reserve(MpTestFixtures.context(), f.request));
        verify(f.admissions, never()).reject(any(), any(), any());
        verifyNoInteractions(f.creator);
    }
}
