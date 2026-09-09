package com.indice.erp.billing.subscription;

import com.indice.erp.billing.stripe.StripePaymentMethodGateway;
import com.indice.erp.billing.stripe.StripePaymentMethodGateway.Status;
import com.indice.erp.billing.stripe.StripeSecretProvider;
import java.time.Clock;
import org.springframework.stereotype.Service;

@Service
public class BillingPaymentMethodService {
    private final BillingAccountAuthorityService authority;
    private final BillingPaymentMethodRepository repository;
    private final StripePaymentMethodGateway gateway;
    private final StripeSecretProvider secrets;
    private final Clock clock;

    public BillingPaymentMethodService(BillingAccountAuthorityService authority, BillingPaymentMethodRepository repository,
        StripePaymentMethodGateway gateway, StripeSecretProvider secrets, Clock clock) {
        this.authority = authority;
        this.repository = repository;
        this.gateway = gateway;
        this.secrets = secrets;
        this.clock = clock;
    }

    // No transaction surrounds provider IO, and this use case never writes payment metadata.
    public BillingPaymentMethodResponse current(long companyId, long actorUserId) {
        authority.requireOwner(companyId, actorUserId);
        var identity = repository.find(companyId);
        if (identity.ambiguous()) return unavailable();
        if (identity.customerId() == null && identity.subscriptionId() == null) {
            return new BillingPaymentMethodResponse(Status.NO_CARD, null, null, clock.instant());
        }
        if (!secrets.isApiConfigured()) return unavailable();
        var result = gateway.inspect(identity.customerId(), identity.subscriptionId());
        if (result == null || result.status() == Status.UNAVAILABLE) return unavailable();
        return new BillingPaymentMethodResponse(result.status(), result.brand(), result.last4(), clock.instant());
    }

    private BillingPaymentMethodResponse unavailable() {
        return new BillingPaymentMethodResponse(Status.UNAVAILABLE, null, null, null);
    }
}
