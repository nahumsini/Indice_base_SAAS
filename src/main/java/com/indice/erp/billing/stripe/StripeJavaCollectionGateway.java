package com.indice.erp.billing.stripe;

import com.stripe.exception.StripeException;
import com.stripe.net.LiveStripeResponseGetter;
import com.stripe.net.RequestOptions;
import com.stripe.net.StripeResponseGetter;
import com.stripe.param.InvoiceLineItemListParams;
import com.stripe.param.InvoiceRetrieveParams;
import com.stripe.service.InvoiceService;
import java.time.Instant;
import java.util.ArrayList;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class StripeJavaCollectionGateway implements StripeCollectionGateway {
    private final StripeSecretProvider secrets;
    private final InvoiceService invoices;
    private final com.stripe.service.checkout.SessionService sessions;

    @Autowired
    public StripeJavaCollectionGateway(StripeSecretProvider secrets) {
        this(secrets, new LiveStripeResponseGetter());
    }

    StripeJavaCollectionGateway(StripeSecretProvider secrets, StripeResponseGetter responseGetter) {
        this.secrets = secrets;
        this.invoices = new InvoiceService(responseGetter);
        this.sessions = new com.stripe.service.checkout.SessionService(responseGetter);
    }

    @Override
    public Invoice retrieveInvoice(String invoiceId) {
        if (invoiceId == null || !invoiceId.matches("in_[A-Za-z0-9_]+")) {
            throw new IllegalArgumentException("Invalid invoice reference.");
        }
        var options = RequestOptions.builder().setApiKey(secrets.secretKey())
            .setConnectTimeout(5_000).setReadTimeout(15_000).setMaxNetworkRetries(0).build();
        try {
            var invoice = invoices.retrieve(invoiceId,
                InvoiceRetrieveParams.builder().addExpand("amount_paid_off_stripe").build(), options);
            var lines = new ArrayList<Line>();
            String cursor = null;
            for (int page = 0; page < 10; page++) {
                var params = InvoiceLineItemListParams.builder().setLimit(100L);
                if (cursor != null) params.setStartingAfter(cursor);
                var batch = invoices.lineItems().list(invoiceId, params.build(), options);
                for (var line : batch.getData()) {
                    var price = line.getPricing() == null || line.getPricing().getPriceDetails() == null
                        ? null : line.getPricing().getPriceDetails().getPrice();
                    lines.add(new Line(price, line.getQuantity() == null ? 0 : line.getQuantity(),
                        line.getAmount() == null ? 0 : line.getAmount(), line.getCurrency()));
                    cursor = line.getId();
                }
                if (!Boolean.TRUE.equals(batch.getHasMore())) break;
                if (batch.getData().isEmpty() || page == 9) {
                    throw new IllegalStateException("Invoice evidence exceeds the supported size.");
                }
            }
            var parent = invoice.getParent() == null ? null : invoice.getParent().getSubscriptionDetails();
            return new Invoice(invoice.getId(), parent == null ? null : parent.getSubscription(),
                invoice.getCustomer(), invoice.getStatus(), invoice.getCurrency(),
                Boolean.TRUE.equals(invoice.getLivemode()), invoice.getAmountDue(), invoice.getAmountPaid(),
                invoice.getAmountRemaining(), invoice.getAmountPaidOffStripe(), invoice.getSubtotal(), invoice.getTotalExcludingTax(),
                invoice.getBillingReason(), invoice.getHostedInvoiceUrl(),
                invoice.getCreated() == null ? null : Instant.ofEpochSecond(invoice.getCreated()),
                lines, parent == null ? null : parent.getMetadata());
        } catch (StripeException exception) {
            // Provider text can contain credentials, customer details, or request bodies.
            throw new IllegalStateException("Stripe invoice verification is temporarily unavailable.");
        }
    }

    @Override
    public Checkout retrieveCheckout(String sessionId) {
        if (sessionId == null || !sessionId.matches("cs_[A-Za-z0-9_]+")) throw new IllegalArgumentException("Invalid checkout reference.");
        var options = RequestOptions.builder().setApiKey(secrets.secretKey())
            .setConnectTimeout(5_000).setReadTimeout(15_000).setMaxNetworkRetries(0).build();
        try {
            var session = sessions.retrieve(sessionId, options);
            return new Checkout(session.getId(), session.getStatus(), session.getPaymentStatus(), session.getCustomer(),
                session.getSubscription(), session.getInvoice(), session.getMetadata() == null ? java.util.Map.of() : session.getMetadata());
        } catch (StripeException exception) {
            throw new IllegalStateException("Stripe checkout verification is temporarily unavailable.");
        }
    }
}
