package com.indice.erp.billing.signup;

import static org.assertj.core.api.Assertions.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class PublicTrialPaidInvoiceTest {
    private final ObjectMapper mapper = new ObjectMapper();
    private final Instant cutoff = Instant.parse("2026-10-23T22:00:00Z");
    private PublicTrialPaymentRepository.Consent consent() {
        return new PublicTrialPaymentRepository.Consent(7, 9, "quote", "CAD", 19900, cutoff, cutoff, "AFTER_TRIAL",
            "price_regional", "TEST", "acct_verified", "cus_owner", "sub_owner", "cs_owner", cutoff.minusSeconds(5), null, cutoff.minusSeconds(10));
    }
    private ObjectNode invoice() throws Exception {
        return (ObjectNode) mapper.readTree("""
            {"id":"in_regional","status":"paid","customer":"cus_owner","subscription":"sub_owner","livemode":false,"currency":"cad",
             "amount_paid":22487,"amount_due":22487,"total":22487,"paid_out_of_band":false,
             "lines":{"has_more":false,"data":[{"quantity":1,"amount":19900,
               "pricing":{"price_details":{"price":"price_regional"}},"period":{"start":1792792800}}]}}
            """);
    }
    @Test void acceptsOnlyFullMatchedPaymentAtOriginalCutoff() throws Exception {
        var invoice = invoice();
        ((ObjectNode) invoice.path("lines").path("data").path(0).path("period")).put("start", cutoff.getEpochSecond());
        assertThat(PublicTrialPaymentService.validPaidInvoice(consent(), invoice)).isTrue();
    }
    @Test void rejectsZeroTrialInvoiceForeignCustomerWrongCurrencyAndOutOfBandPayment() throws Exception {
        for (var field : java.util.List.of("amount_paid", "customer", "currency", "paid_out_of_band", "livemode", "subscription")) {
            var invoice = invoice();
            switch (field) {
                case "amount_paid" -> invoice.put(field, 0);
                case "customer" -> invoice.put(field, "cus_foreign");
                case "currency" -> invoice.put(field, "usd");
                case "subscription" -> invoice.put(field, "sub_foreign");
                default -> invoice.put(field, true);
            }
            assertThat(PublicTrialPaymentService.validPaidInvoice(consent(), invoice)).isFalse();
        }
    }
    @Test void rejectsForeignPriceTruncatedLinesWrongQuantityAndEarlyPeriod() throws Exception {
        for (var failure : java.util.List.of("price", "has_more", "quantity", "period")) {
            var invoice = invoice();
            var line = (ObjectNode) invoice.path("lines").path("data").path(0);
            switch (failure) {
                case "price" -> ((ObjectNode) line.path("pricing").path("price_details")).put("price", "price_foreign");
                case "has_more" -> ((ObjectNode) invoice.path("lines")).put("has_more", true);
                case "quantity" -> line.put("quantity", 2);
                default -> ((ObjectNode) line.path("period")).put("start", cutoff.minusSeconds(1).getEpochSecond());
            }
            assertThat(PublicTrialPaymentService.validPaidInvoice(consent(), invoice)).isFalse();
        }
    }
    @Test void providerSecondsNeverAdvanceOrRestartTheOriginalTrial() {
        assertThat(PublicTrialPaymentRepository.providerDeadline(cutoff)).isEqualTo(cutoff);
        assertThat(PublicTrialPaymentRepository.providerDeadline(cutoff.plusNanos(1))).isEqualTo(cutoff.plusSeconds(1));
    }
}
