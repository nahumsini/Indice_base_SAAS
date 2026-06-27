package com.indice.erp.hr.payroll.engine;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class PayrollManualAdjustmentServiceTest {

    private final PayrollManualAdjustmentService service = new PayrollManualAdjustmentService();

    @Test
    void normalizeKeepsEmployerContributionAsEmployerCostAdjustment() {
        var adjustment = service.normalize("employer_contribution", "Costo patronal", new BigDecimal("750.00"), "MXN");

        assertEquals("MANUAL_EMPLOYER_CONTRIBUTION", adjustment.code());
        assertEquals("employer_contribution", adjustment.category());
        assertEquals(0, new BigDecimal("750.00").compareTo(adjustment.amount()));
        assertFalse(adjustment.taxable());
        assertFalse(adjustment.affectsSocialSecurity());
        assertTrue(adjustment.affectsEmployerCost());
    }

    @Test
    void normalizeKeepsProvisionAsEmployerCostAdjustment() {
        var adjustment = service.normalize("provision", "Provisión manual", new BigDecimal("300.00"), "COP");

        assertEquals("MANUAL_PROVISION", adjustment.code());
        assertEquals("provision", adjustment.category());
        assertEquals(0, new BigDecimal("300.00").compareTo(adjustment.amount()));
        assertFalse(adjustment.taxable());
        assertFalse(adjustment.affectsSocialSecurity());
        assertTrue(adjustment.affectsEmployerCost());
    }

    @Test
    void normalizeRejectsUnknownCategoryWithSupportedCategoriesInMessage() {
        var exception = assertThrows(IllegalArgumentException.class, () ->
            service.normalize("unknown", "Ajuste", BigDecimal.ONE, "USD")
        );

        assertTrue(exception.getMessage().contains("employer_contribution"));
        assertTrue(exception.getMessage().contains("provision"));
    }
}
