package com.indice.erp.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
import org.junit.jupiter.api.Test;

class SignupPlanCalculatorTest {

    private final SignupPlanCalculator calculator = new SignupPlanCalculator();

    @Test
    void allBasicPlanStartsWithIncludedCollaboratorsOnly() {
        var selection = calculator.calculate(request("all-modules", 3, 0, "6-20"));

        assertEquals("all-modules", selection.planId());
        assertEquals(7, selection.moduleCount());
        assertEquals(5, selection.includedCollaborators());
        assertEquals(0, selection.extraCollaborators());
        assertEquals(19_900, selection.monthlyAmountCents());
    }

    @Test
    void customPlanPricesAdditionalModulesAndExtraSeats() {
        var selection = calculator.calculate(request("custom-modules", 4, 16, "21-100"));

        assertEquals("custom-modules", selection.planId());
        assertEquals(4, selection.moduleCount());
        assertEquals(16, selection.extraCollaborators());
        assertEquals(35_700, selection.monthlyAmountCents());
    }

    private SignupCheckoutRequest request(String planId, int modules, int extraCollaborators, String companySize) {
        return new SignupCheckoutRequest(
            "Ada Owner",
            "ada@example.com",
            "securePass123",
            "Ada Studio",
            "Retail",
            companySize,
            "US",
            "",
            planId,
            modules,
            extraCollaborators,
            List.of("human_resources", "expenses", "petty_cash", "pos").subList(0, modules)
        );
    }
}
