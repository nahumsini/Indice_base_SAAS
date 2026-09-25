package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MpPointAdmissionReplayTest {
    @Test void durableRejectedKeyNeverChargesAfterConfigurationChanges() {
        var f = new MpAdmissionTestFixtures();
        when(f.admissions.claim(any(), any(), anyString())).thenReturn(new MpPaymentAdmission(
            "original_key", 9, 11, f.admission.payloadHash(), "REJECTED", "Missing setup", 409));
        assertThrows(MpPaymentNotSubmittedException.class, () -> f.service.reserve(MpTestFixtures.context(), f.request));
        assertTrue(f.committed);
        verifyNoInteractions(f.preparation, f.creator);
        verify(f.admissions, never()).reject(any(), any(), any());
    }
    @Test void exactPersistedIntentWinsBeforeAnyRejectionOrPreflight() {
        var f = new MpAdmissionTestFixtures();
        var intent = MpPaymentTestFixtures.change(MpPaymentTestFixtures.intent(), "payloadHash", f.admission.payloadHash());
        when(f.reader.byKey(any(), anyString())).thenReturn(Optional.of(intent));
        assertSame(intent, f.service.reserve(MpTestFixtures.context(), f.request));
        verifyNoInteractions(f.verification, f.preparation, f.creator);
    }
    @Test void immutableAdmissionOwnerRejectsRegisterActorAndPayloadSwaps() {
        var f = new MpAdmissionTestFixtures();
        assertThrows(PosApiException.class, () -> new MpPaymentAdmission("original_key", 8, 11,
            f.admission.payloadHash(), "RESERVED", null, null).requireOwner(MpTestFixtures.context(), f.request, f.admission.payloadHash()));
        assertThrows(PosApiException.class, () -> new MpPaymentAdmission("original_key", 9, 12,
            f.admission.payloadHash(), "RESERVED", null, null).requireOwner(MpTestFixtures.context(), f.request, f.admission.payloadHash()));
        assertThrows(PosApiException.class, () -> f.admission.requireOwner(MpTestFixtures.context(), f.request, "changed"));
    }
}
