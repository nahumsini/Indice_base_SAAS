package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosContext;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import static org.junit.jupiter.api.Assertions.*;

class MercadoPagoAdmissionIntegrationTest extends MpAdmissionDatabaseFixture {
    @Test void disabledProviderRejectionPersistsWithoutPoisoningCallerTransactionAndCannotLaterCharge() {
        var request = request();
        var service = application.getBean(MpPaymentReservation.class);
        new TransactionTemplate(application.getBean(PlatformTransactionManager.class)).execute(status -> {
            var error = assertThrows(MpPaymentNotSubmittedException.class, () -> service.reserve(context(), request));
            assertEquals(503, error.status().value());
            assertFalse(status.isRollbackOnly());
            var row = application.getBean(MpPaymentAdmissionReader.class).rejected(context(), request.idempotencyKey(), registerId).orElseThrow();
            assertEquals("REJECTED", row.status());
            assertEquals(request.idempotencyKey(), row.rejection().requestKey());
            assertThrows(MpPaymentNotSubmittedException.class, () -> service.reserve(context(), request));
            assertTrue(application.getBean(MpIntentReader.class).byKey(context(), request.idempotencyKey()).isEmpty());
            assertFalse(status.isRollbackOnly());
            return null;
        });
    }
    @Test void tombstoneLookupFailsClosedForAnotherTenantActorRegisterOrBusiness() {
        var request = request();
        assertThrows(MpPaymentNotSubmittedException.class, () -> application.getBean(MpPaymentReservation.class).reserve(context(), request));
        var reader = application.getBean(MpPaymentAdmissionReader.class);
        assertTrue(reader.rejected(context(), request.idempotencyKey(), registerId + 1).isEmpty());
        for (var other : new PosContext[]{
            new PosContext(actorId + 1, companyId, "Synthetic", "admin", true, context().scope()),
            new PosContext(actorId, companyId + 1, "Synthetic", "admin", true, context().scope()),
            new PosContext(actorId, companyId, "Synthetic", "admin", true, com.indice.erp.pos.PosScope.businessOffice(unitId, businessId + 1))}) {
            assertTrue(reader.rejected(other, request.idempotencyKey(), registerId).isEmpty());
        }
    }
    @Test void reservedAdmissionWithoutIntentDoesNotEstablishNonSubmission() {
        var request = request();
        var hash = application.getBean(MpPaymentIdentity.class).hash(request);
        var row = application.getBean(MpPaymentAdmissionStore.class).claim(context(), request, hash);
        assertEquals("RESERVED", row.status());
        assertTrue(application.getBean(MpPaymentAdmissionReader.class).rejected(context(), request.idempotencyKey(), registerId).isEmpty());
        assertTrue(application.getBean(MpIntentReader.class).byKey(context(), request.idempotencyKey()).isEmpty());
    }
}
