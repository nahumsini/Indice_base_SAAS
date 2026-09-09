package com.indice.erp.kiosk.engine;

import com.indice.erp.billing.collection.PaymentCollectionAccessService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class KioskPaymentCollectionGuardTest {
    @Mock private PaymentCollectionAccessService collection;

    @Test
    void doesNotAddRestrictionsWithoutAnOverdueRequestOrDuringGrace() {
        var guard = new KioskPaymentCollectionGuard(collection);
        given(collection.access(7L)).willReturn(
            PaymentCollectionAccessService.Access.NONE,
            PaymentCollectionAccessService.Access.GRACE);

        assertThatCode(() -> guard.requireOperationalAccess(7L)).doesNotThrowAnyException();
        assertThatCode(() -> guard.requireOperationalAccess(7L)).doesNotThrowAnyException();
    }

    @Test
    void hidesKioskAndBillingDetailsWhenItsResolvedCompanyIsOverdue() {
        var guard = new KioskPaymentCollectionGuard(collection);
        given(collection.access(7L)).willReturn(PaymentCollectionAccessService.Access.PAYMENT_ONLY);

        assertThatThrownBy(() -> guard.requireOperationalAccess(7L))
            .isInstanceOf(KioskUnavailableException.class)
            .hasMessage("Kiosk not found.");

        verify(collection).access(7L);
    }
}
