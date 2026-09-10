package com.indice.erp.finance.kiosk;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.BDDMockito.then;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.kiosk.engine.KioskAccessLevel;
import com.indice.erp.kiosk.engine.KioskDefinitionStatus;
import com.indice.erp.kiosk.engine.KioskExecutionContext;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

@ExtendWith(MockitoExtension.class)
class FinanceKioskModuleAuditServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Test
    void providerCenterAuditUsesTheDefinitionWhenThereIsNoLegacyReference() {
        var definition = new KioskResolvedDefinition(
            29L, 7L, "EXPENSES", "provider_payables", null,
            "PROVIDER_PAYABLES", "Cuentas por pagar", KioskDefinitionStatus.ACTIVE,
            2L, 3L, null, KioskAccessLevel.CONTROLLED,
            null, "token-hint", false, 1, 1);
        var context = KioskExecutionContext.publicLink("EXPENSES", "provider-center")
            .resolved(definition, null);
        var service = new FinanceKioskModuleAuditService(jdbcTemplate, new ObjectMapper());

        service.success(context, "PAYABLE_SUBMITTED", "EXPENSE", 901L,
            Map.of("policy", "REVIEW_REQUIRED"));

        var parameters = ArgumentCaptor.forClass(Object[].class);
        then(jdbcTemplate).should().update(
            contains("kiosk_definition_id, legacy_reference_id"), parameters.capture());
        assertThat(parameters.getValue()[4]).isEqualTo(29L);
        assertThat(parameters.getValue()[5]).isNull();
        assertThat(parameters.getValue()[6]).isEqualTo("PAYABLE_SUBMITTED");
        assertThat(parameters.getValue()[10]).isEqualTo(901L);
    }
}
