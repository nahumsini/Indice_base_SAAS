package com.indice.erp.billing.stripe;

import com.stripe.exception.StripeException;
import com.stripe.model.PaymentMethod;
import com.stripe.net.LiveStripeResponseGetter;
import com.stripe.net.RequestOptions;
import com.stripe.net.StripeResponseGetter;
import com.stripe.service.CustomerService;
import com.stripe.service.PaymentMethodService;
import com.stripe.service.SubscriptionService;
import java.time.Clock;
import java.time.YearMonth;
import java.time.ZoneOffset;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class StripeJavaPaymentMethodGateway implements StripePaymentMethodGateway {
    private final StripeSecretProvider secrets;
    private final Clock clock;
    private final SubscriptionService subscriptions;
    private final CustomerService customers;
    private final PaymentMethodService paymentMethods;

    @Autowired
    public StripeJavaPaymentMethodGateway(StripeSecretProvider secrets, Clock clock) {
        this(secrets, clock, new LiveStripeResponseGetter());
    }

    StripeJavaPaymentMethodGateway(StripeSecretProvider secrets, Clock clock, StripeResponseGetter transport) {
        this.secrets = secrets;
        this.clock = clock;
        subscriptions = new SubscriptionService(transport);
        customers = new CustomerService(transport);
        paymentMethods = new PaymentMethodService(transport);
    }

    @Override
    public CardStatus inspect(String customerId, String subscriptionId) {
        if (!validId(customerId, "cus_") || (present(subscriptionId) && !validId(subscriptionId, "sub_"))) {
            return CardStatus.unavailable();
        }
        try {
            var options = RequestOptions.builder().setApiKey(secrets.secretKey())
                .setConnectTimeout(3_000).setReadTimeout(5_000).setMaxNetworkRetries(0).build();
            String paymentMethodId = null;
            if (present(subscriptionId)) {
                var subscription = subscriptions.retrieve(subscriptionId, options);
                if (subscription == null || !subscriptionId.equals(subscription.getId())
                    || !customerId.equals(subscription.getCustomer()) || !matchingMode(subscription.getLivemode())) {
                    return CardStatus.unavailable();
                }
                paymentMethodId = subscription.getDefaultPaymentMethod();
                // An explicit subscription default takes precedence, including unsupported legacy sources.
                if (!present(paymentMethodId) && present(subscription.getDefaultSource())) return CardStatus.unavailable();
            }
            if (!present(paymentMethodId)) {
                var customer = customers.retrieve(customerId, options);
                if (customer == null || !customerId.equals(customer.getId()) || Boolean.TRUE.equals(customer.getDeleted())
                    || !matchingMode(customer.getLivemode())) return CardStatus.unavailable();
                paymentMethodId = customer.getInvoiceSettings() == null
                    ? null : customer.getInvoiceSettings().getDefaultPaymentMethod();
                if (!present(paymentMethodId)) {
                    return present(customer.getDefaultSource()) ? CardStatus.unavailable() : CardStatus.noCard();
                }
            }
            if (!validId(paymentMethodId, "pm_")) return CardStatus.unavailable();
            var method = paymentMethods.retrieve(paymentMethodId, options);
            return cardStatus(method, paymentMethodId, customerId);
        } catch (StripeException | StripePhaseTwoUnavailableException exception) {
            // Do not retain provider errors, credentials, card data, or response bodies in logs or causes.
            return CardStatus.unavailable();
        }
    }

    private CardStatus cardStatus(PaymentMethod method, String methodId, String customerId) {
        if (method == null || !methodId.equals(method.getId()) || !customerId.equals(method.getCustomer())
            || !matchingMode(method.getLivemode()) || !"card".equals(method.getType())) return CardStatus.unavailable();
        var card = method.getCard();
        if (card == null || card.getExpYear() == null || card.getExpMonth() == null
            || card.getExpYear() < 1970 || card.getExpYear() > 9999
            || card.getExpMonth() < 1 || card.getExpMonth() > 12
            || card.getBrand() == null || !card.getBrand().matches("[a-z0-9_]{1,32}")
            || card.getLast4() == null || !card.getLast4().matches("[0-9]{4}")) return CardStatus.unavailable();
        // Expiry is used transiently for comparison and is neither returned nor persisted.
        var expiry = YearMonth.of(card.getExpYear().intValue(), card.getExpMonth().intValue());
        var currentMonth = YearMonth.now(clock.withZone(ZoneOffset.UTC));
        return new CardStatus(expiry.isBefore(currentMonth) ? Status.EXPIRED : Status.SAVED,
            card.getBrand(), card.getLast4());
    }

    private boolean matchingMode(Boolean live) {
        return live != null && live == secrets.isLiveMode();
    }

    private boolean present(String value) { return value != null && !value.isEmpty(); }

    private boolean validId(String value, String prefix) {
        return value != null && value.matches(prefix + "[A-Za-z0-9_]{1,240}");
    }
}
