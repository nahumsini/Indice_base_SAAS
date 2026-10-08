package com.indice.erp.billing.stripe;

import com.stripe.exception.StripeException;
import com.stripe.model.Account;
import com.stripe.model.PaymentMethod;
import com.stripe.model.SetupIntent;
import com.stripe.model.Subscription;
import com.stripe.model.checkout.Session;
import com.stripe.net.RequestOptions;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class StripeJavaTrialPaymentGateway implements StripeTrialPaymentGateway {
    private final StripeSecretProvider secrets;
    public StripeJavaTrialPaymentGateway(StripeSecretProvider secrets) { this.secrets = secrets; }

    @Override public StripeCheckoutGateway.CheckoutResult createSetup(String customerId, String currency,
        String returnUrl, Instant expiresAt, Map<String, String> metadata, String key) {
        try {
            var params = new LinkedHashMap<String, Object>();
            params.put("mode", "setup");
            params.put("customer", customerId);
            params.put("currency", currency.toLowerCase(java.util.Locale.ROOT));
            params.put("payment_method_types", List.of("card"));
            params.put("billing_address_collection", "required");
            params.put("customer_update", Map.of("address", "auto", "name", "auto"));
            params.put("success_url", returnUrl + "?setup=success");
            params.put("cancel_url", returnUrl + "?setup=cancelled");
            params.put("metadata", metadata);
            params.put("setup_intent_data", Map.of("metadata", metadata));
            params.put("expires_at", expiresAt.getEpochSecond());
            var session = Session.create(params, options(key));
            return new StripeCheckoutGateway.CheckoutResult(session.getId(), session.getUrl(), Instant.ofEpochSecond(session.getExpiresAt()));
        } catch (StripeException ex) { throw new StripeGatewayException("Trial method setup failed.", ex); }
    }

    @Override public VerifiedSetup verifySetup(String sessionId) {
        try {
            var session = Session.retrieve(sessionId, Map.of("expand", List.of("setup_intent")), options(null));
            if (!"complete".equals(session.getStatus()) || !"setup".equals(session.getMode())) {
                throw new StripeWebhookIntegrityException("Trial setup is not complete.");
            }
            var setup = session.getSetupIntentObject();
            if (setup == null) setup = SetupIntent.retrieve(session.getSetupIntent(), options(null));
            var method = PaymentMethod.retrieve(setup.getPaymentMethod(), options(null));
            var customer = session.getCustomer();
            if (!"succeeded".equals(setup.getStatus()) || !"card".equals(method.getType())
                || customer == null || !customer.equals(setup.getCustomer()) || !customer.equals(method.getCustomer())
                || !java.util.Objects.equals(session.getLivemode(), setup.getLivemode())
                || !java.util.Objects.equals(session.getLivemode(), method.getLivemode())) {
                throw new StripeWebhookIntegrityException("Trial setup ownership or method is invalid.");
            }
            var details = session.getCustomerDetails();
            var country = details == null || details.getAddress() == null ? null : details.getAddress().getCountry();
            return new VerifiedSetup(customer, method.getId(), country, Account.retrieve(options(null)).getId(),
                Boolean.TRUE.equals(session.getLivemode()), session.getMetadata());
        } catch (StripeException ex) { throw new StripeGatewayException("Trial setup verification failed.", ex); }
    }

    @Override public String createSubscription(SubscriptionCommand command, String key) {
        try { return Subscription.create(subscriptionParameters(command), options(key)).getId(); }
        catch (StripeException ex) { throw new StripeGatewayException("Regional trial subscription creation failed.", ex); }
    }

    static Map<String, Object> subscriptionParameters(SubscriptionCommand command) {
        var params = new LinkedHashMap<String, Object>();
        params.put("customer", command.customerId());
        params.put("default_payment_method", command.paymentMethodId());
        params.put("items", List.of(Map.of("price", command.priceId(), "quantity", 1)));
        params.put("collection_method", "charge_automatically");
        params.put("payment_behavior", "default_incomplete");
        params.put("automatic_tax", Map.of("enabled", command.automaticTax()));
        params.put("payment_settings", Map.of("save_default_payment_method", "on_subscription", "payment_method_types", List.of("card")));
        params.put("metadata", command.metadata());
        if (command.absoluteTrialEnd() != null) {
            // Never replace a past deadline with "now" on a retry. Stripe must reject it or replay
            // the same idempotent result: an uncertain response cannot become an undisclosed charge.
            params.put("trial_end", command.absoluteTrialEnd().getEpochSecond());
            params.put("trial_settings", Map.of("end_behavior", Map.of("missing_payment_method", "cancel")));
        }
        return Map.copyOf(params);
    }

    private RequestOptions options(String key) {
        return RequestOptions.builder().setApiKey(secrets.secretKey()).setIdempotencyKey(key).build();
    }
}
