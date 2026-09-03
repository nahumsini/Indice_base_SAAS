package com.indice.erp.finance.payablekiosk;

import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.payablekiosk.dto.PublicPayableRequest;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PayableKioskSubmissionValidatorTest {

    @Test
    void computesThePersistedTotalFromServerValidatedComponents() {
        var normalized = PayableKioskSubmissionValidator.validateAndNormalize(
            kiosk("MXN"), request("100.0", "16.00", "116.000", "mxn"));

        assertThat(normalized.subtotalAmount()).isEqualByComparingTo("100.0");
        assertThat(normalized.taxAmount()).isEqualByComparingTo("16.00");
        assertThat(normalized.totalAmount()).isEqualByComparingTo("116.00");
        assertThat(normalized.currencyCode()).isEqualTo("MXN");
    }

    @Test
    void rejectsInconsistentTotalsAndWrongCurrency() {
        assertBadRequest(
            request("100.00", "16.00", "115.99", "MXN"),
            "totalAmount must equal subtotalAmount plus taxAmount.");
        assertBadRequest(
            request("100.00", "16.00", "116.00", "USD"),
            "currencyCode must match the payable kiosk currency.");
    }

    @Test
    void rejectsZeroAndNegativeSubmissions() {
        assertBadRequest(
            request("0.00", "0.00", "0.00", "MXN"),
            "totalAmount must be greater than zero.");
        assertBadRequest(
            request("-1.00", "0.00", "-1.00", "MXN"),
            "subtotalAmount must be non-negative.");
    }

    private void assertBadRequest(PublicPayableRequest request, String expectedMessage) {
        assertThatThrownBy(() -> PayableKioskSubmissionValidator.validateAndNormalize(
            kiosk("MXN"), request))
            .isInstanceOfSatisfying(FinanceApiException.class, failure -> {
                assertThat(failure.status()).isEqualTo(HttpStatus.BAD_REQUEST);
                assertThat(failure).hasMessage(expectedMessage);
            });
    }

    private PublicPayableRequest request(
            String subtotal,
            String tax,
            String total,
            String currency) {
        return new PublicPayableRequest(
            9L, "Employee payable", "Evidence-backed expense",
            new BigDecimal(subtotal), new BigDecimal(tax), new BigDecimal(total),
            currency, LocalDate.of(2026, 9, 15), "INV-100");
    }

    private PayableKioskRow kiosk(String currency) {
        return new PayableKioskRow(
            2L, 7L, 3L, 4L, null, "PAYABLE-02", "Captura de proveedores",
            "ACTIVE", "EMPLOYEE", "token", "pin-hash", currency, false);
    }
}
