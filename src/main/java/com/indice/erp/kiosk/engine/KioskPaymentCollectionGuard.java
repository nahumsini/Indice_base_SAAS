package com.indice.erp.kiosk.engine;

import com.indice.erp.billing.collection.PaymentCollectionAccessService;
import org.springframework.stereotype.Service;

/** Applies the billing owner's payment-only decision after a public kiosk resolves its tenant. */
@Service
public class KioskPaymentCollectionGuard {
    private final PaymentCollectionAccessService collection;

    public KioskPaymentCollectionGuard(PaymentCollectionAccessService collection) {
        this.collection = collection;
    }

    public void requireOperationalAccess(long companyId) {
        if (collection.access(companyId) == PaymentCollectionAccessService.Access.PAYMENT_ONLY) {
            // Public visitors receive no billing or account-owner details.
            throw new KioskUnavailableException();
        }
    }
}
