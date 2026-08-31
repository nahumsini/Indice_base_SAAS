package com.indice.erp.ai.task;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.indice.erp.ai.access.AiAccessTokenRepository;
import com.indice.erp.ai.access.AiAccessTokenService;
import com.indice.erp.ai.access.AiToolAuthorizationService;
import com.indice.erp.ai.task.AiTaskActionContracts.CommitRequest;
import com.indice.erp.ai.task.AiTaskActionContracts.CommitResponse;
import com.indice.erp.ai.task.AiTaskActionContracts.PreviewRequest;
import com.indice.erp.ai.task.AiTaskActionContracts.PreviewResponse;
import com.indice.erp.ai.task.AiTaskActionContracts.TaskDraft;
import com.indice.erp.ai.task.AiTaskActionContracts.TaskResult;
import com.indice.erp.auth.AuthSessionUser;
import java.time.Instant;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class AiToolTaskApiControllerTest {

    private static final String AUTHORIZATION = "Bearer idx_ai_abcdefghijklmnopqrstuvwxyz1234567890";
    private static final AuthSessionUser USER = new AuthSessionUser(3L, 23L, 41L, "Owner", "admin");
    private static final AiAccessTokenRepository.StoredToken TOKEN =
        new AiAccessTokenRepository.StoredToken(91L, USER, Set.of(AiAccessTokenService.TASKS_CREATE));

    @Mock private AiAccessTokenService tokenService;
    @Mock private AiToolAuthorizationService authorizationService;
    @Mock private AiTaskActionService actionService;

    private AiToolTaskApiController controller;

    @BeforeEach
    void setUp() {
        controller = new AiToolTaskApiController(tokenService, authorizationService, actionService);
    }

    @Test
    void rejectsMissingDelegatedScope() {
        when(tokenService.authenticate(AUTHORIZATION, AiAccessTokenService.TASKS_CREATE))
            .thenReturn(Optional.empty());

        var response = controller.preview(AUTHORIZATION, new PreviewRequest("Task", null, null, null));

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
    }

    @Test
    void currentIndicePermissionCanBlockAnExistingToken() {
        allowToken();
        when(authorizationService.canCreateTask(USER)).thenReturn(false);

        var response = controller.preview(AUTHORIZATION, new PreviewRequest("Task", null, null, null));

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    @Test
    void createsOnceAndReturnsOkForAnIdempotentReplay() {
        allowAccess();
        var request = new CommitRequest("idx_confirm_abcdefghijklmnopqrstuvwxyz1234567890", "retry-key-123");
        var task = new TaskResult(701L, "T-701", "Task", "pending", null);
        when(actionService.commit(TOKEN, request))
            .thenReturn(new CommitResponse(false, "first", task))
            .thenReturn(new CommitResponse(true, "first", task));

        assertEquals(HttpStatus.CREATED, controller.commit(AUTHORIZATION, request).getStatusCode());
        assertEquals(HttpStatus.OK, controller.commit(AUTHORIZATION, request).getStatusCode());
    }

    @Test
    void returnsConflictWhenConfirmationExpired() {
        allowAccess();
        var request = new CommitRequest("idx_confirm_abcdefghijklmnopqrstuvwxyz1234567890", "retry-key-123");
        when(actionService.commit(eq(TOKEN), eq(request))).thenThrow(
            new AiTaskActionConflictException("confirmation_expired", "Prepare the task again.")
        );

        var response = controller.commit(AUTHORIZATION, request);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
    }

    @Test
    void returnsTheExactPreviewWithoutCreating() {
        allowAccess();
        var request = new PreviewRequest("Task", null, "medium", null);
        var preview = new PreviewResponse(
            "idx_confirm_abcdefghijklmnopqrstuvwxyz1234567890",
            Instant.parse("2026-08-31T12:05:00Z"),
            true,
            new TaskDraft("Task", null, "medium", null, "Usuario conectado")
        );
        when(actionService.preview(TOKEN, request)).thenReturn(preview);

        var response = controller.preview(AUTHORIZATION, request);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(preview, response.getBody());
    }

    private void allowAccess() {
        allowToken();
        when(authorizationService.canCreateTask(USER)).thenReturn(true);
    }

    private void allowToken() {
        when(tokenService.authenticate(AUTHORIZATION, AiAccessTokenService.TASKS_CREATE))
            .thenReturn(Optional.of(TOKEN));
    }
}
