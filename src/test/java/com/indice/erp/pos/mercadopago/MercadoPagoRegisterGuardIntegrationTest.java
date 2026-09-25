package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.terminal.TerminalPaymentGuard;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class MercadoPagoRegisterGuardIntegrationTest extends MpFinancialDatabaseFixture {
    @Test void sharedRegisterGuardBlocksUnrelatedTenderAndAnotherProvider() {
        var guard = application.getBean(TerminalPaymentGuard.class);
        var context = observed.context();
        guard.lockRegister(context, registerId);
        assertThrows(PosApiException.class, () -> guard.assertNoPending(context, registerId));
        assertDoesNotThrow(() -> guard.assertNoPendingExcept(context, registerId, "MERCADO_PAGO", observed.id()));
        assertThrows(PosApiException.class, () -> guard.assertNoPendingExcept(context, registerId, "SQUARE", observed.id()));
    }

    @Test void onlyVerifiedFullRefundReleasesPendingRegisterHold() {
        var applicationOwner = application.getBean(MpEvidenceApplication.class);
        assertTrue(applicationOwner.apply(observed, partialRefund()));
        var guard = application.getBean(TerminalPaymentGuard.class);
        assertThrows(PosApiException.class, () -> guard.assertNoPending(observed.context(), registerId));
        observed = application.getBean(MpIntentStore.class).find(companyId, observed.id()).orElseThrow();
        var full = partialRefund();
        MpPaymentTestFixtures.transaction((com.fasterxml.jackson.databind.node.ObjectNode) full.order())
            .put("refunded_amount", "70.00");
        full.order().withObject("transactions").withArray("refunds").addObject()
            .put("id", "REFadditional" + companyId).put("transaction_id", observed.paymentId())
            .put("amount", "60.00").put("status", "processed");
        var verified = new MpVerifiedOrder(full.order(), MpPaymentTestFixtures.verifier().verify(observed, full.order()));
        assertTrue(applicationOwner.apply(observed, verified));
        assertDoesNotThrow(() -> guard.assertNoPending(observed.context(), registerId));
    }
}
