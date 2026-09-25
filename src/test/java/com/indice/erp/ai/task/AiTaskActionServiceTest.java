package com.indice.erp.ai.task;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.ai.access.AiAccessTokenRepository;
import com.indice.erp.ai.task.AiTaskActionContracts.CommitRequest;
import com.indice.erp.ai.task.AiTaskActionContracts.CommitResponse;
import com.indice.erp.ai.task.AiTaskActionContracts.PreviewRequest;
import com.indice.erp.ai.task.AiTaskActionContracts.TaskDraft;
import com.indice.erp.ai.task.AiTaskActionContracts.TaskResult;
import com.indice.erp.auth.AuthSessionUser;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AiTaskActionServiceTest {

    private static final Instant NOW = Instant.parse("2026-08-31T12:00:00Z");
    private static final AuthSessionUser USER = new AuthSessionUser(3L, 23L, 41L, "Owner", "admin");
    private static final AiAccessTokenRepository.StoredToken TOKEN =
        new AiAccessTokenRepository.StoredToken(91L, USER, Set.of("tasks.create"));

    @Mock private AiTaskActionRepository repository;
    @Mock private AiTaskActionExecutionService executionService;
    @Mock private AiTaskActionAuditService auditService;
    @Mock private AiTaskDraftService drafts;

    private AiTaskActionService service;

    @BeforeEach
    void setUp() {
        service = new AiTaskActionService(
            repository,
            executionService,
            auditService,
            new ObjectMapper(),
            Clock.fixed(NOW, ZoneOffset.UTC),
            drafts
        );
    }

    @Test
    void previewNormalizesAndStoresOnlyAHashOfTheConfirmation() {
        when(repository.insertConfirmation(any(), any(), any(), any(), any())).thenReturn(501L);

        when(drafts.create(eq(TOKEN), any())).thenReturn(new TaskDraft("Revisar caja", "Hoy", "medium", null, "Owner"));
        var response = service.preview(TOKEN, new PreviewRequest("  Revisar caja  ", "  Hoy  ", null, null));

        assertEquals("Revisar caja", response.task().title());
        assertEquals("Hoy", response.task().description());
        assertEquals("medium", response.task().priority());
        assertEquals(NOW.plusSeconds(300), response.expiresAt());
        assertTrue(response.requiresConfirmation());
        assertTrue(response.confirmationToken().startsWith("idx_confirm_"));

        var hash = ArgumentCaptor.forClass(String.class);
        verify(repository).insertConfirmation(
            eq(TOKEN),
            hash.capture(),
            any(),
            eq(response.task()),
            eq(response.expiresAt())
        );
        assertEquals(64, hash.getValue().length());
        assertFalse(hash.getValue().contains(response.confirmationToken()));
    }

    @Test
    void commitExecutesOnlyTheStoredConfirmedDraft() {
        var confirmation = confirmation(501L, 91L, NOW.plusSeconds(300), null);
        when(repository.findConfirmation(any())).thenReturn(Optional.of(confirmation));
        when(repository.findExecution(eq(23L), eq(3L), eq("create_task"), any())).thenReturn(Optional.empty());
        var result = new CommitResponse(
            false,
            "correlation",
            new TaskResult(701L, "T-701", "Revisar caja", "pending", null)
        );
        when(executionService.execute(eq(TOKEN), eq(confirmation), any(), any())).thenReturn(result);

        var response = service.commit(TOKEN, new CommitRequest(validConfirmationToken(), "retry-key-123"));

        assertEquals(701L, response.task().id());
        verify(executionService).execute(eq(TOKEN), eq(confirmation), any(), any());
    }

    @Test
    void sameConfirmationAndIdempotencyKeyReplaysTheExistingResult() {
        var confirmation = confirmation(501L, 91L, NOW.plusSeconds(300), NOW.minusSeconds(1));
        var execution = new AiTaskActionRepository.Execution(
            601L,
            501L,
            "fingerprint",
            "correlation",
            "COMPLETED",
            701L,
            "T-701",
            "Revisar caja",
            "pending",
            null
        );
        when(repository.findConfirmation(any())).thenReturn(Optional.of(confirmation));
        when(repository.findExecution(eq(23L), eq(3L), eq("create_task"), any())).thenReturn(Optional.of(execution));

        var response = service.commit(TOKEN, new CommitRequest(validConfirmationToken(), "retry-key-123"));

        assertTrue(response.replayed());
        assertEquals(701L, response.task().id());
        verify(executionService, never()).execute(any(), any(), any(), any());
    }

    @Test
    void confirmationFromAnotherConnectionIsRejected() {
        var confirmation = confirmation(501L, 999L, NOW.plusSeconds(300), null);
        when(repository.findConfirmation(any())).thenReturn(Optional.of(confirmation));

        var error = assertThrows(
            AiTaskActionConflictException.class,
            () -> service.commit(TOKEN, new CommitRequest(validConfirmationToken(), "retry-key-123"))
        );

        assertEquals("confirmation_identity_mismatch", error.code());
        verify(executionService, never()).execute(any(), any(), any(), any());
    }

    @Test
    void expiredConfirmationCannotCreateATask() {
        var confirmation = confirmation(501L, 91L, NOW.minusSeconds(1), null);
        when(repository.findConfirmation(any())).thenReturn(Optional.of(confirmation));
        when(repository.findExecution(eq(23L), eq(3L), eq("create_task"), any())).thenReturn(Optional.empty());

        var error = assertThrows(
            AiTaskActionConflictException.class,
            () -> service.commit(TOKEN, new CommitRequest(validConfirmationToken(), "retry-key-123"))
        );

        assertEquals("confirmation_expired", error.code());
        verify(executionService, never()).execute(any(), any(), any(), any());
    }

    private AiTaskActionRepository.Confirmation confirmation(
        long id,
        long tokenId,
        Instant expiresAt,
        Instant consumedAt
    ) {
        return new AiTaskActionRepository.Confirmation(
            id,
            tokenId,
            23L,
            3L,
            41L,
            "fingerprint",
            "{}",
            new TaskDraft("Revisar caja", null, "high", LocalDate.of(2026, 9, 1), "Usuario conectado"),
            expiresAt,
            consumedAt
        );
    }

    private String validConfirmationToken() {
        return "idx_confirm_abcdefghijklmnopqrstuvwxyz1234567890ABCDEFG";
    }
}
