package com.indice.erp.hr.attendance.kiosk;

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
class AttendanceKioskModuleAuditServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Test
    void humanResourcesAuditUsesTheDefinitionWhenThereIsNoLegacyReference() {
        var definition = new KioskResolvedDefinition(
            22L, 7L, "HUMAN_RESOURCES", "human_resources", null,
            "HUMAN_RESOURCES", "Recursos Humanos", KioskDefinitionStatus.ACTIVE,
            2L, 3L, null, KioskAccessLevel.CONTROLLED,
            null, "token-hint", false, 1, 1);
        var context = new KioskExecutionContext(
            "HUMAN_RESOURCES", "MOBILE_MULTI_KIOSK", "definition:22")
            .resolved(definition, null);
        var service = new AttendanceKioskModuleAuditService(jdbcTemplate, new ObjectMapper());

        service.success(context, "HR_PERMISSION_REQUEST_CREATED", "PERMISSION_REQUEST", 71L,
            Map.of("review_required", true));

        var parameters = ArgumentCaptor.forClass(Object[].class);
        then(jdbcTemplate).should().update(
            contains("kiosk_definition_id, legacy_reference_id"), parameters.capture());
        assertThat(parameters.getValue()[3]).isEqualTo(22L);
        assertThat(parameters.getValue()[4]).isNull();
        assertThat(parameters.getValue()[5]).isEqualTo("HR_PERMISSION_REQUEST_CREATED");
        assertThat(parameters.getValue()[9]).isEqualTo(71L);
    }
}
