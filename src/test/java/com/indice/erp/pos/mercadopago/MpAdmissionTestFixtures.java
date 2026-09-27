package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.terminal.TerminalPaymentGuard;
import java.math.BigDecimal;
import java.util.Optional;
import java.util.function.Supplier;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

final class MpAdmissionTestFixtures {
    final MpPaymentIdentity identity = new MpPaymentIdentity(MpPaymentTestFixtures.JSON);
    final MpIntentReader reader = mock(MpIntentReader.class);
    final TerminalPaymentGuard guard = mock(TerminalPaymentGuard.class);
    final MpPaymentPreparation preparation = mock(MpPaymentPreparation.class);
    final MpTerminalVerification verification = mock(MpTerminalVerification.class);
    final MpIntentCreator creator = mock(MpIntentCreator.class);
    final MpPaymentAdmissionStore admissions = mock(MpPaymentAdmissionStore.class);
    final MpCreatePayment request = MpPaymentTestFixtures.request("original_key");
    final MpPaymentAdmission admission = new MpPaymentAdmission("original_key", 9, 11,
        identity.hash(request), "RESERVED", null, null);
    final MpPaymentReservationTransaction transaction = new MpPaymentReservationTransaction(reader, guard, preparation, creator, admissions);
    final MpPaymentReservation service = new MpPaymentReservation(identity, reader, verification, transaction);
    boolean committed;
    MpAdmissionTestFixtures() {
        when(guard.withRegisterLock(any(), anyLong(), any())).thenAnswer(call -> {
            var result = ((Supplier<?>) call.getArgument(2)).get();
            committed = true;
            return result;
        });
        when(admissions.claim(any(), any(), anyString())).thenReturn(admission);
        when(reader.byKey(any(), anyString())).thenReturn(Optional.empty());
        when(verification.verify(any(), anyLong())).thenReturn(MpTerminalVerificationProof.from(MpTestFixtures.terminal("READY", 9L)));
        when(preparation.prepare(any(), any(), any())).thenReturn(new MpPaymentPrepared(
            MpTestFixtures.terminal("READY", 9L), MpTestFixtures.connection(),
            new MpPaymentDraft(null, new BigDecimal("70.00"), "{}"), "reference", "{}", MpTestFixtures.NOW.plusSeconds(300)));
    }
}
