package com.indice.erp.ai.task;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.indice.erp.ai.access.AiAccessTokenRepository;
import com.indice.erp.ai.task.AiTaskActionContracts.TaskDraft;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.processTasks.tasks.ProcessTasksService;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AiTaskActionExecutionServiceTest {

    private static final Instant NOW = Instant.parse("2026-08-31T12:00:00Z");

    @Mock private AiTaskActionRepository repository;
    @Mock private ProcessTasksService processTasksService;

    @Test
    void createsTheTaskForTheConnectedMembershipUsingTheExistingService() {
        var user = new AuthSessionUser(3L, 23L, 41L, "Owner", "admin");
        var token = new AiAccessTokenRepository.StoredToken(91L, user, Set.of("tasks.create"));
        var confirmation = new AiTaskActionRepository.Confirmation(
            501L,
            91L,
            23L,
            3L,
            41L,
            "fingerprint",
            "{}",
            new TaskDraft("Revisar caja", "Validar cierre", "high", LocalDate.of(2026, 9, 1), "Usuario conectado"),
            NOW.plusSeconds(300),
            null
        );
        when(repository.insertPendingExecution(token, confirmation, "idempotency", "correlation")).thenReturn(601L);
        when(repository.consumeConfirmation(501L, NOW)).thenReturn(1);
        when(processTasksService.createTask(eq(23L), eq(3L), org.mockito.ArgumentMatchers.any())).thenReturn(
            new LinkedHashMap<>(Map.of(
                "id", 701L,
                "folio", "T-701",
                "title", "Revisar caja",
                "status", "pending",
                "dueDate", "2026-09-01"
            ))
        );
        when(repository.completeExecution(eq(601L), org.mockito.ArgumentMatchers.any(), eq(NOW))).thenReturn(1);
        var service = new AiTaskActionExecutionService(
            repository,
            processTasksService,
            Clock.fixed(NOW, ZoneOffset.UTC)
        );

        var response = service.execute(token, confirmation, "idempotency", "correlation");

        var payload = ArgumentCaptor.forClass(Map.class);
        verify(processTasksService).createTask(eq(23L), eq(3L), payload.capture());
        assertEquals(41L, payload.getValue().get("assignedUserCompanyId"));
        assertEquals("pending", payload.getValue().get("status"));
        assertEquals("high", payload.getValue().get("priority"));
        assertEquals("2026-09-01", payload.getValue().get("dueDate"));
        assertEquals(701L, response.task().id());
    }
}
