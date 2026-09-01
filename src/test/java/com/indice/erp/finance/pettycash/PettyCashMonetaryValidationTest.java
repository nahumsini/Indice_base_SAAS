package com.indice.erp.finance.pettycash;

import com.indice.erp.finance.FinanceAccessService;
import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.pettycash.dto.CreatePettyCashSettlementLineRequest;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.then;

@ExtendWith(MockitoExtension.class)
class PettyCashMonetaryValidationTest {

    @Mock private FinanceAccessService accessService;
    @Mock private PettyCashReferenceValidator referenceValidator;

    private PettyCashValidator validator;

    @BeforeEach
    void setUp() {
        validator = new PettyCashValidator(accessService, referenceValidator);
    }

    @Test
    void acceptsAnExactEquationRegardlessOfDecimalScale() {
        var request = request("100.0", "16.00", "116.000");

        validator.validateSettlementLine(context(), request);

        then(referenceValidator).should().validateSettlementReferences(
            context(), null, null, null);
    }

    @Test
    void derivesMissingSubtotalFromTotalMinusTaxWithoutRounding() {
        var request = request(null, "16.00", "116.00");

        validator.validateSettlementLine(context(), request);
        var command = new PettyCashMapper().toCommand(context(), request);

        assertThat(command.subtotalAmount()).isEqualByComparingTo("100.00");
        assertThat(command.taxAmount()).isEqualByComparingTo("16.00");
        assertThat(command.totalAmount()).isEqualByComparingTo("116.00");
    }

    @Test
    void rejectsTaxGreaterThanTotalWhenSubtotalIsMissing() {
        assertBadRequest(
            request(null, "116.01", "116.00"),
            "taxAmount cannot exceed totalAmount.");
    }

    @Test
    void rejectsAnInconsistentClientSubtotal() {
        assertBadRequest(
            request("99.99", "16.00", "116.00"),
            "subtotalAmount plus taxAmount must equal totalAmount.");
    }

    @Test
    void rejectsNegativeTaxAndSubtotal() {
        assertBadRequest(request("100.00", "-1.00", "99.00"),
            "taxAmount must be non-negative.");
        assertBadRequest(request("-1.00", "0.00", "1.00"),
            "subtotalAmount must be non-negative.");
    }

    private void assertBadRequest(
            CreatePettyCashSettlementLineRequest request,
            String expectedMessage) {
        assertThatThrownBy(() -> validator.validateSettlementLine(context(), request))
            .isInstanceOfSatisfying(FinanceApiException.class, failure -> {
                assertThat(failure.status()).isEqualTo(HttpStatus.BAD_REQUEST);
                assertThat(failure).hasMessage(expectedMessage);
            });
    }

    private CreatePettyCashSettlementLineRequest request(
            String subtotal,
            String tax,
            String total) {
        return new CreatePettyCashSettlementLineRequest(
            null,
            null,
            null,
            null,
            "Employee receipt",
            null,
            decimal(subtotal),
            decimal(tax),
            decimal(total),
            "MXN",
            LocalDate.of(2026, 8, 31),
            0,
            null,
            null,
            null);
    }

    private BigDecimal decimal(String value) {
        return value == null ? null : new BigDecimal(value);
    }

    private FinanceContext context() {
        return new FinanceContext(
            1L, 7L, "Finance User", "user", true, FinanceScope.corporateOffice());
    }
}
