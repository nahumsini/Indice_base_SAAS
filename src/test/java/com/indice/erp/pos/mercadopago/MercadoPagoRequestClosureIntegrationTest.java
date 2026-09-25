package com.indice.erp.pos.mercadopago;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import static org.junit.jupiter.api.Assertions.*;

class MercadoPagoRequestClosureIntegrationTest extends MpAdmissionDatabaseFixture {
    @Test void closeBeforeLateSubmissionSerializesKeyAndKeepsImmutableClosedTombstone() {
        var request = request();
        var closure = application.getBean(MpPaymentRequestClosure.class).close(context(), request.idempotencyKey(), registerId);
        assertEquals(request.idempotencyKey(), closure.rejection().requestKey());
        assertThrows(MpPaymentNotSubmittedException.class,
            () -> application.getBean(MpPaymentReservation.class).reserve(context(), request));
        assertEquals("REQUEST_CLOSED", jdbc.queryForObject("SELECT reason FROM pos_mercado_pago_payment_admissions "
            + "WHERE company_id=? AND idempotency_key=?", String.class, companyId, request.idempotencyKey()));
        assertTrue(application.getBean(MpIntentReader.class).byKey(context(), request.idempotencyKey()).isEmpty());
        var again = application.getBean(MpPaymentRequestClosure.class).close(context(), request.idempotencyKey(), registerId);
        assertEquals(closure.rejection(), again.rejection());
    }
    @ParameterizedTest @ValueSource(strings={"WAITING","UNCERTAIN","APPROVED","DECLINED","REFUNDED"})
    void existingIntentAlwaysWinsAndCannotBeClosed(String status) {
        jdbc.update("UPDATE pos_mercado_pago_payment_intents SET status=? WHERE company_id=? AND id=?",
            status, companyId, observed.id());
        var closure = application.getBean(MpPaymentRequestClosure.class).close(context(), observed.idempotencyKey(), registerId);
        assertEquals(observed.id(), closure.intent().id());
        assertNull(closure.rejection());
        assertEquals("RESERVED", jdbc.queryForObject("SELECT status FROM pos_mercado_pago_payment_admissions "
            + "WHERE company_id=? AND idempotency_key=?", String.class, companyId, observed.idempotencyKey()));
    }
}
