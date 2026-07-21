package com.indice.erp.billing.lifecycle;

import org.springframework.stereotype.Service;

@Service
public class CommercialLifecycleAccessService {

    private final CommercialLifecycleProperties properties;
    private final CommercialLifecycleService lifecycle;

    public CommercialLifecycleAccessService(
        CommercialLifecycleProperties properties,
        CommercialLifecycleService lifecycle
    ) {
        this.properties = properties;
        this.lifecycle = lifecycle;
    }

    public void requireRead(long companyId) {
        if (!properties.isEnabled()) return;
        lifecycle.snapshot(companyId).ifPresent(snapshot -> {
            var state = CommercialLifecycleState.valueOf(snapshot.state());
            if (!state.allowsOperationalRead()) throw new CommercialAccessRestrictedException(state, false);
        });
    }

    public void requireWrite(long companyId) {
        if (!properties.isEnabled()) return;
        lifecycle.snapshot(companyId).ifPresent(snapshot -> {
            var state = CommercialLifecycleState.valueOf(snapshot.state());
            if (!state.allowsOperationalWrite()) {
                throw new CommercialAccessRestrictedException(state, state == CommercialLifecycleState.READ_ONLY);
            }
        });
    }
}
