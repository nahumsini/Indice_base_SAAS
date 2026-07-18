package com.indice.erp.processTasks.kiosk;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Arrays;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.slf4j.MDC;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class ProcessTaskKioskModuleAuditServiceTest {

    @Test
    void correlatesFunctionalAuditWithEngineRequestAndAction() {
        var jdbcTemplate = mock(JdbcTemplate.class);
        var service = new ProcessTaskKioskModuleAuditService(jdbcTemplate, new ObjectMapper());
        var kiosk = new ProcessTaskKioskRow(
            31L, 7L, 2L, "Operations", 3L, "Field", "TASKS", "Tasks",
            "active", "ACTIVE", null, "", "hint", false, "{}", null, null);
        var employee = new ProcessTaskKioskEmployee(
            81L, 19L, "E-81", "Alex", "Operator", "Operations", "active");
        var context = new ProcessTaskPublicKioskContext(kiosk, employee);
        MDC.put("requestId", "request-17");
        MDC.put("actionId", "action-41");
        try {
            service.record(context, 55L, "TASK_COMPLETED", Map.of("completion_percent", 100));
        } finally {
            MDC.clear();
        }

        var arguments = ArgumentCaptor.forClass(Object[].class);
        verify(jdbcTemplate).update(
            contains("INSERT INTO process_task_kiosk_audit_events"), arguments.capture());
        assertThat(Arrays.asList(arguments.getValue()))
            .contains("request-17", "action-41", "task:55", 7L, 31L, 55L, 19L, 81L);
    }
}
