package com.indice.erp.billing.stripe;

import com.stripe.exception.StripeException;
import com.stripe.model.Customer;
import com.stripe.model.Subscription;
import com.stripe.model.checkout.Session;
import com.stripe.net.RequestOptions;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class StripeBillingGateway {

    private final StripeSignupProperties properties;

    public StripeBillingGateway(StripeSignupProperties properties) {
        this.properties = properties;
    }

    public Customer createCustomer(Map<String, Object> params, String idempotencyKey) throws StripeException {
        return Customer.create(params, requestOptions(idempotencyKey));
    }

    public Session createCheckoutSession(Map<String, Object> params, String idempotencyKey) throws StripeException {
        return Session.create(params, requestOptions(idempotencyKey));
    }

    public Subscription retrieveSubscription(String subscriptionId) throws StripeException {
        return Subscription.retrieve(subscriptionId, requestOptions());
    }

    public void expireCheckoutSession(String sessionId) throws StripeException {
        Session.retrieve(sessionId, requestOptions()).expire(requestOptions());
    }

    public Subscription updateSubscription(String subscriptionId, Map<String, Object> params, String idempotencyKey)
            throws StripeException {
        return Subscription.retrieve(subscriptionId, requestOptions()).update(params, requestOptions(idempotencyKey));
    }

    private RequestOptions requestOptions() {
        return RequestOptions.builder()
            .setApiKey(properties.getSecretKey())
            .build();
    }

    private RequestOptions requestOptions(String idempotencyKey) {
        return RequestOptions.builder()
            .setApiKey(properties.getSecretKey())
            .setIdempotencyKey(idempotencyKey)
            .build();
    }
}
