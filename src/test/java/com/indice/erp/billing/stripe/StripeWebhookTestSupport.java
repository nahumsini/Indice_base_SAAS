package com.indice.erp.billing.stripe;

import com.stripe.model.Event;
import com.stripe.model.EventDataObjectDeserializer;
import com.stripe.model.Invoice;
import com.stripe.model.StripeObject;
import com.stripe.model.Subscription;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Optional;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

final class StripeWebhookTestSupport {

    private StripeWebhookTestSupport() {
    }

    static Event event(String type, StripeObject object) {
        var event = event(object);
        org.mockito.Mockito.when(event.getType()).thenReturn(type);
        return event;
    }

    static Event event(StripeObject object) {
        var event = org.mockito.Mockito.mock(Event.class);
        var deserializer = org.mockito.Mockito.mock(EventDataObjectDeserializer.class);
        org.mockito.Mockito.when(event.getDataObjectDeserializer()).thenReturn(deserializer);
        org.mockito.Mockito.when(deserializer.getObject()).thenReturn(Optional.of(object));
        return event;
    }

    static Subscription subscription(String id, String status) {
        var subscription = new Subscription();
        subscription.setId(id);
        subscription.setStatus(status);
        return subscription;
    }

    static Invoice invoice(String id, String subscriptionId) {
        var invoice = new Invoice();
        invoice.setId(id);
        var parent = new Invoice.Parent();
        var details = new Invoice.Parent.SubscriptionDetails();
        details.setSubscription(subscriptionId);
        parent.setSubscriptionDetails(details);
        invoice.setParent(parent);
        return invoice;
    }

    static String signature(String payload, String secret) {
        var timestamp = Long.toString(Instant.now().getEpochSecond());
        return "t=" + timestamp + ",v1=" + hmacSha256(timestamp + "." + payload, secret);
    }

    private static String hmacSha256(String value, String secret) {
        try {
            var mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            var bytes = mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
            var hex = new StringBuilder();
            for (var current : bytes) {
                hex.append(String.format("%02x", current));
            }
            return hex.toString();
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }
}
