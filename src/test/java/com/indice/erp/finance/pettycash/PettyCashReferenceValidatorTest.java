package com.indice.erp.finance.pettycash;

import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class PettyCashReferenceValidatorTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Test
    void validateFundReferencesRejectsSameFundAndFundingSourceAccount() {
        var validator = new PettyCashReferenceValidator(jdbcTemplate);

        var exception = assertThrows(FinanceApiException.class, () -> validator.validateFundReferences(
            context(),
            new PettyCashScopedAssignment(null, null),
            null,
            null,
            70L,
            70L,
            null,
            "MXN"
        ));

        assertEquals(HttpStatus.BAD_REQUEST, exception.status());
        assertEquals("paymentAccountId and fundingSourcePaymentAccountId must be different.", exception.getMessage());
        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void validateMovementReferencesRejectsSameSourceAndDestinationAccount() {
        var validator = new PettyCashReferenceValidator(jdbcTemplate);

        var exception = assertThrows(FinanceApiException.class, () -> validator.validateMovementReferences(
            context(),
            70L,
            70L,
            "MXN"
        ));

        assertEquals(HttpStatus.BAD_REQUEST, exception.status());
        assertEquals("fromPaymentAccountId and toPaymentAccountId must be different.", exception.getMessage());
        verifyNoInteractions(jdbcTemplate);
    }

    private FinanceContext context() {
        return new FinanceContext(1L, 7L, "Finance User", "user", true, FinanceScope.corporateOffice());
    }
}
