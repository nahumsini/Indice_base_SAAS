package com.indice.erp.billing.collection;

import static org.assertj.core.api.Assertions.assertThat;

import com.indice.erp.billing.catalog.BillingInterval;
import com.indice.erp.billing.catalog.CommercialOfferSelection;
import com.indice.erp.billing.stripe.StripeCollectionGateway;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class PaymentCollectionSettlementTest {
    private final PaymentCollectionPaymentService.InvoiceObligation obligation =
        new PaymentCollectionPaymentService.InvoiceObligation("in_bound", "sub_bound", "cus_bound", "USD", 1000, 1500,
            "https://invoice.stripe.com/i/fixture");

    @Test
    void partiallyPaidObligationSettlesOnlyWhenItsOriginalInvoiceIsFullyPaid() {
        assertThat(PaymentCollectionPaymentService.settledInvoice(invoice("paid", 1500L, 0L, 0L), obligation, "TEST")).isTrue();
        assertThat(PaymentCollectionPaymentService.settledInvoice(invoice("open", 500L, 1000L, 0L), obligation, "TEST")).isFalse();
        assertThat(PaymentCollectionPaymentService.payableInvoice(invoice("open", 500L, 1000L, 0L), obligation, "TEST")).isTrue();
    }

    @Test
    void rejectsManualZeroPartialVoidedAndWrongModePayments() {
        assertThat(PaymentCollectionPaymentService.settledInvoice(invoice("paid", 1500L, 0L, 1500L), obligation, "TEST")).isFalse();
        assertThat(PaymentCollectionPaymentService.settledInvoice(invoice("paid", 0L, 0L, 0L), obligation, "TEST")).isFalse();
        assertThat(PaymentCollectionPaymentService.settledInvoice(invoice("paid", 1400L, 100L, 0L), obligation, "TEST")).isFalse();
        assertThat(PaymentCollectionPaymentService.settledInvoice(invoice("void", 1500L, 0L, 0L), obligation, "TEST")).isFalse();
        assertThat(PaymentCollectionPaymentService.settledInvoice(invoice("paid", 1500L, 0L, 0L), obligation, "LIVE")).isFalse();
        assertThat(PaymentCollectionPaymentService.settledInvoice(invoice("paid", 1500L, 0L, null), obligation, "TEST")).isFalse();
    }

    @Test
    void requiresExactInvoiceCustomerSubscriptionCurrencyAndOriginalTotal() {
        for (var different : List.of(
            new PaymentCollectionPaymentService.InvoiceObligation("in_other", "sub_bound", "cus_bound", "USD", 1000, 1500, ""),
            new PaymentCollectionPaymentService.InvoiceObligation("in_bound", "sub_other", "cus_bound", "USD", 1000, 1500, ""),
            new PaymentCollectionPaymentService.InvoiceObligation("in_bound", "sub_bound", "cus_other", "USD", 1000, 1500, ""),
            new PaymentCollectionPaymentService.InvoiceObligation("in_bound", "sub_bound", "cus_bound", "EUR", 1000, 1500, ""),
            new PaymentCollectionPaymentService.InvoiceObligation("in_bound", "sub_bound", "cus_bound", "USD", 1000, 1600, "")
        )) assertThat(PaymentCollectionPaymentService.settledInvoice(invoice("paid", 1500L, 0L, 0L), different, "TEST")).isFalse();
    }

    @Test
    void activationRequiresFirstPositiveInvoiceWithExactFrozenPricesAndRequestMetadata() {
        var selection = new CommercialOfferSelection(4, "v4", "basic_hr", BillingInterval.MONTH, "USD", 5, 0,
            1500L, 1500L, 0, 0, "price_bound", null, List.of());
        var correct = invoice("paid", 1500L, 0L, 0L);
        assertThat(PaymentCollectionPaymentService.settledActivation(correct, selection, "TEST", "cus_bound", "sub_bound", 19)).isTrue();
        assertThat(PaymentCollectionPaymentService.settledActivation(correct, selection, "TEST", "cus_bound", "sub_bound", 20)).isFalse();
        assertThat(PaymentCollectionPaymentService.settledActivation(correct, selection, "TEST", "cus_other", "sub_bound", 19)).isFalse();
        var wrongPrice = new CommercialOfferSelection(4, "v4", "basic_hr", BillingInterval.MONTH, "USD", 5, 0,
            1500L, 1500L, 0, 0, "price_new_catalog", null, List.of());
        assertThat(PaymentCollectionPaymentService.settledActivation(correct, wrongPrice, "TEST", "cus_bound", "sub_bound", 19)).isFalse();
        var renewal = new StripeCollectionGateway.Invoice(correct.id(), correct.subscriptionId(), correct.customerId(), correct.status(),
            correct.currency(), false, 1500L, 1500L, 0L, 0L, 1500L, 1500L, "subscription_cycle", correct.hostedInvoiceUrl(),
            correct.createdAt(), correct.lines(), correct.subscriptionMetadata());
        assertThat(PaymentCollectionPaymentService.settledActivation(renewal, selection, "TEST", "cus_bound", "sub_bound", 19)).isFalse();
    }

    private StripeCollectionGateway.Invoice invoice(String status, Long paid, Long remaining, Long offStripe) {
        return new StripeCollectionGateway.Invoice("in_bound", "sub_bound", "cus_bound", status, "usd", false,
            1500L, paid, remaining, offStripe, 1500L, 1500L, "subscription_create", "https://invoice.stripe.com/i/fixture",
            Instant.parse("2026-09-08T12:00:00Z"), List.of(new StripeCollectionGateway.Line("price_bound", 1, 1500, "usd")),
            Map.of("indice_payment_request", "19"));
    }
}
