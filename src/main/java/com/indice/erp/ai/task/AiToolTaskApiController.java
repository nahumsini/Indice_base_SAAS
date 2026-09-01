package com.indice.erp.ai.task;

import com.indice.erp.ai.access.AiAccessTokenService;
import com.indice.erp.ai.access.AiToolAuthorizationService;
import com.indice.erp.ai.task.AiTaskActionContracts.CommitRequest;
import com.indice.erp.ai.task.AiTaskActionContracts.PreviewRequest;
import java.util.Map;
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
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(error("invalid_request", exception.getMessage()));
        }
    }

    private Access access(String authorization) {
        var token = tokenService.authenticate(authorization, AiAccessTokenService.TASKS_CREATE);
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
