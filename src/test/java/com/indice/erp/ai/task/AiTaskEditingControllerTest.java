package com.indice.erp.ai.task;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.indice.erp.ai.access.*;
import com.indice.erp.ai.task.AiTaskActionContracts.*;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.processTasks.tasks.ProcessTaskAssistantService.TaskChangedException;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class AiTaskEditingControllerTest {
    static final String AUTH = "Bearer synthetic";
    static final AuthSessionUser USER = new AuthSessionUser(3L, 23L, 41L, "Test", "admin");
    static final AiAccessTokenRepository.StoredToken TOKEN = new AiAccessTokenRepository.StoredToken(91L, USER, Set.of("tasks.update"));
    static final UpdateRequest EDIT = new UpdateRequest(7, null, null, "high", null, null, null, null, null);
    static final CommitRequest COMMIT = new CommitRequest("idx_confirm_synthetic", "synthetic-retry");
    @Mock AiAccessTokenService tokens;
    @Mock AiToolAuthorizationService permissions;
    @Mock AiTaskActionService actions;
    AiToolTaskApiController controller;
    @BeforeEach void setup() { controller = new AiToolTaskApiController(tokens, permissions, actions); }
    void authorized() {
        when(tokens.authenticate(AUTH, AiAccessTokenService.TASKS_UPDATE)).thenReturn(Optional.of(TOKEN));
        when(permissions.canCreateTask(USER)).thenReturn(true);
    }
    @Test void absentExpiredRevokedOrInsufficientTokenCannotPrepareOrCommit() {
        when(tokens.authenticate(AUTH, AiAccessTokenService.TASKS_UPDATE)).thenReturn(Optional.empty());
        assertThat(controller.previewUpdate(AUTH, EDIT).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(controller.commitUpdate(AUTH, COMMIT).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        verifyNoInteractions(actions, permissions);
    }
    @Test void liveModulePermissionIsRequiredAtBothSteps() {
        when(tokens.authenticate(AUTH, AiAccessTokenService.TASKS_UPDATE)).thenReturn(Optional.of(TOKEN));
        assertThat(controller.previewUpdate(AUTH, EDIT).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(controller.commitUpdate(AUTH, COMMIT).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        verifyNoInteractions(actions);
    }
    @Test void staleTaskHasStableConflictResponse() {
        authorized();
        when(actions.commitUpdate(TOKEN, COMMIT)).thenThrow(new TaskChangedException());
        var response = controller.commitUpdate(AUTH, COMMIT);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody().toString()).contains("task_changed");
    }
    @Test void foreignOrInvisibleTaskDoesNotRevealObjectDetails() {
        authorized();
        when(actions.previewUpdate(TOKEN, EDIT)).thenThrow(new java.util.NoSuchElementException("Private task name"));
        var response = controller.previewUpdate(AUTH, EDIT);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody().toString()).doesNotContain("Private task name");
    }
    @Test void delegationNeedsSeparateConsentEvenWithEditPermission() {
        authorized();
        when(actions.previewUpdate(TOKEN, EDIT)).thenThrow(new SecurityException("tasks.delegate required"));
        assertThat(controller.previewUpdate(AUTH, EDIT).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }
}
