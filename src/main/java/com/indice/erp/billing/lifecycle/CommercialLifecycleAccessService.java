package com.indice.erp.billing.lifecycle;

import com.indice.erp.billing.collection.PaymentCollectionAccessService;
import org.springframework.stereotype.Service;

@Service
public class CommercialLifecycleAccessService {

    private final CommercialLifecycleProperties properties;
    private final CommercialLifecycleService lifecycle;
    private final PaymentCollectionAccessService collection;

    public CommercialLifecycleAccessService(
        CommercialLifecycleProperties properties,
        CommercialLifecycleService lifecycle,
        PaymentCollectionAccessService collection
    ) {
        this.properties = properties;
        this.lifecycle = lifecycle;
        this.collection = collection;
    }

    public PaymentCollectionAccessService.Access collectionAccess(long companyId) { return collection.access(companyId); }

    private boolean hasCollectionGrace(long companyId) {
        var decision = collectionAccess(companyId);
        if (decision == PaymentCollectionAccessService.Access.PAYMENT_ONLY) {
            throw new CommercialAccessRestrictedException(CommercialLifecycleState.SUSPENDED, false, true);
        }
        return decision == PaymentCollectionAccessService.Access.GRACE;
    }

    public void requireRead(long companyId) {
        if (hasCollectionGrace(companyId)) return;
        if (!properties.isEnabled()) return;
        lifecycle.snapshot(companyId).ifPresent(snapshot -> {
            var state = CommercialLifecycleState.valueOf(snapshot.state());
            if (!state.allowsOperationalRead()) throw new CommercialAccessRestrictedException(state, false);
        });
    }

    public void requireWrite(long companyId) {
        if (hasCollectionGrace(companyId)) return;
        if (!properties.isEnabled()) return;
        lifecycle.snapshot(companyId).ifPresent(snapshot -> {
            var state = CommercialLifecycleState.valueOf(snapshot.state());
            if (!state.allowsOperationalWrite()) {
                throw new CommercialAccessRestrictedException(state, state == CommercialLifecycleState.READ_ONLY);
            }
        });
    }
}
