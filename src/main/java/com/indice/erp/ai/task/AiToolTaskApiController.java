package com.indice.erp.ai.task;

import com.indice.erp.ai.access.AiAccessTokenService;
import com.indice.erp.ai.access.AiToolAuthorizationService;
import com.indice.erp.ai.task.AiTaskActionContracts.CommitRequest;
import com.indice.erp.ai.task.AiTaskActionContracts.PreviewRequest;
import java.util.Map;
import java.util.NoSuchElementException;
import com.indice.erp.processTasks.tasks.ProcessTaskAssistantService.TaskChangedException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/ai/tools/tasks")
public class AiToolTaskApiController {

    private static final String BEARER_CHALLENGE = "Bearer realm=\"indice-ai\", error=\"invalid_token\"";

    private final AiAccessTokenService tokenService;
    private final AiToolAuthorizationService authorizationService;
    private final AiTaskActionService actionService;

    public AiToolTaskApiController(
        AiAccessTokenService tokenService,
        AiToolAuthorizationService authorizationService,
        AiTaskActionService actionService
    ) {
        this.tokenService = tokenService;
        this.authorizationService = authorizationService;
        this.actionService = actionService;
    }

    @PostMapping("/preview")
    public ResponseEntity<?> preview(
        @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
        @RequestBody(required = false) PreviewRequest request
    ) {
        var access = access(authorization);
        if (access.error() != null) {
            return access.error();
        }
        try {
            return ResponseEntity.ok(actionService.preview(access.token(), request));
        } catch (SecurityException exception) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error("ai_tool_permission_required", exception.getMessage()));
        } catch (NoSuchElementException exception) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("not_found", "Task or assignee not found in the authorized scope."));
        } catch (TaskChangedException exception) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(error("task_changed", exception.getMessage()));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(error("invalid_request", exception.getMessage()));
        }
    }

    @PostMapping("/commit")
    public ResponseEntity<?> commit(
        @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
        @RequestBody(required = false) CommitRequest request
    ) {
        var access = access(authorization);
        if (access.error() != null) {
            return access.error();
        }
        try {
            var response = actionService.commit(access.token(), request);
            return ResponseEntity.status(response.replayed() ? HttpStatus.OK : HttpStatus.CREATED).body(response);
        } catch (AiTaskActionConflictException exception) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(error(exception.code(), exception.getMessage()));
        } catch (SecurityException exception) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error("ai_tool_permission_required", exception.getMessage()));
        } catch (NoSuchElementException exception) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("not_found", "Task or assignee not found in the authorized scope."));
        } catch (TaskChangedException exception) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(error("task_changed", exception.getMessage()));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(error("invalid_request", exception.getMessage()));
        }
    }

    @PostMapping("/update/preview")
    public ResponseEntity<?> previewUpdate(
        @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
        @RequestBody(required = false) AiTaskActionContracts.UpdateRequest request
    ) {
        return update(authorization, token -> actionService.previewUpdate(token, request));
    }

    @PostMapping("/update/commit")
    public ResponseEntity<?> commitUpdate(
        @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
        @RequestBody(required = false) CommitRequest request
    ) {
        return update(authorization, token -> actionService.commitUpdate(token, request));
    }

    private ResponseEntity<?> update(String authorization, java.util.function.Function<com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken, Object> operation) {
        var access = access(authorization, AiAccessTokenService.TASKS_UPDATE);
        if (access.error() != null) return access.error();
        try {
            return ResponseEntity.ok(operation.apply(access.token()));
        } catch (AiTaskActionConflictException exception) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(error(exception.code(), exception.getMessage()));
        } catch (TaskChangedException exception) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(error("task_changed", exception.getMessage()));
        } catch (SecurityException exception) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error("ai_tool_permission_required", exception.getMessage()));
        } catch (NoSuchElementException exception) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("not_found", "Task or assignee not found in the authorized scope."));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(error("invalid_request", exception.getMessage()));
        }
    }

    private Access access(String authorization) {
        return access(authorization, AiAccessTokenService.TASKS_CREATE);
    }

    private Access access(String authorization, String scope) {
        var token = tokenService.authenticate(authorization, scope);
        if (token.isEmpty()) {
            return new Access(null, ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .header(HttpHeaders.WWW_AUTHENTICATE, BEARER_CHALLENGE)
                .body(error("invalid_token", "Invalid or expired access token.")));
        }
        if (!authorizationService.canCreateTask(token.get().user())) {
            return new Access(null, ResponseEntity.status(HttpStatus.FORBIDDEN).body(error(
                "ai_tool_permission_required",
                "The current Indice permissions do not allow this tool."
            )));
        }
        return new Access(token.get(), null);
    }

    private Map<String, String> error(String code, String message) {
        return Map.of("code", code, "message", message);
    }

    private record Access(
        com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken token,
        ResponseEntity<?> error
    ) {
    }
}
