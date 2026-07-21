package com.indice.erp.billing.stripe;

import com.stripe.exception.StripeException;
import com.stripe.model.Customer;
import com.stripe.model.checkout.Session;
import com.stripe.net.RequestOptions;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class StripeJavaCheckoutGateway implements StripeCheckoutGateway {

    private final StripeSecretProvider secrets;

    public StripeJavaCheckoutGateway(StripeSecretProvider secrets) {
        this.secrets = secrets;
    }

    @Override
    public CustomerResult createCustomer(CustomerCommand command, String idempotencyKey) {
        var params = new LinkedHashMap<String, Object>();
        params.put("email", command.email());
        params.put("name", command.name());
        if (command.phone() != null && !command.phone().isBlank()) {
            params.put("phone", command.phone());
        }
        params.put("address", Map.of("country", command.countryCode()));
        params.put("metadata", command.metadata());
        try {
            var customer = Customer.create(params, requestOptions(idempotencyKey));
            return new CustomerResult(customer.getId());
        } catch (StripeException exception) {
            throw new StripeGatewayException("Stripe customer creation failed.", exception);
        }
    }

    @Override
    public CheckoutResult createCheckout(CheckoutCommand command, String idempotencyKey) {
        var params = new LinkedHashMap<String, Object>();
        params.put("mode", "subscription");
        params.put("customer", command.customerId());
        params.put("success_url", command.successUrl());
        params.put("cancel_url", command.cancelUrl());
        params.put("payment_method_types", java.util.List.of("card"));
        params.put("payment_method_collection", "always");
        params.put("billing_address_collection", "required");
        params.put("customer_update", Map.of("address", "auto", "name", "auto"));
        params.put("automatic_tax", Map.of("enabled", command.automaticTaxEnabled()));
        params.put("tax_id_collection", Map.of("enabled", command.taxIdCollectionEnabled()));
        params.put("expires_at", command.expiresAt().getEpochSecond());
        params.put("metadata", command.metadata());
        params.put("subscription_data", Map.of(
            "trial_period_days", command.trialDays(),
            "trial_settings", Map.of(
                "end_behavior", Map.of("missing_payment_method", "cancel")
            ),
            "metadata", command.metadata()
        ));
        var lineItems = new ArrayList<Map<String, Object>>();
        for (var line : command.lineItems()) {
            lineItems.add(Map.of("price", line.priceId(), "quantity", line.quantity()));
        }
        params.put("line_items", lineItems);

        try {
            var session = Session.create(params, requestOptions(idempotencyKey));
            var expiresAt = session.getExpiresAt() == null
                ? command.expiresAt()
                : Instant.ofEpochSecond(session.getExpiresAt());
            return new CheckoutResult(session.getId(), session.getUrl(), expiresAt);
        } catch (StripeException exception) {
            throw new StripeGatewayException("Stripe checkout creation failed.", exception);
        }
    }

    private RequestOptions requestOptions(String idempotencyKey) {
        return RequestOptions.builder()
            .setApiKey(secrets.secretKey())
            .setIdempotencyKey(idempotencyKey)
            .build();
    }
}
