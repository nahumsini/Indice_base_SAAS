package com.indice.erp.workspace;

import com.fasterxml.jackson.databind.JsonNode;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.tenant.TenantContextResolver;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/workspace-state")
public class UserWorkspaceStateApiController {

    private final TenantContextResolver tenantContextResolver;
    private final SessionCsrfService sessionCsrfService;
    private final UserWorkspaceStateService workspaceStateService;

    public UserWorkspaceStateApiController(
        TenantContextResolver tenantContextResolver,
        SessionCsrfService sessionCsrfService,
        UserWorkspaceStateService workspaceStateService
    ) {
        this.tenantContextResolver = tenantContextResolver;
        this.sessionCsrfService = sessionCsrfService;
        this.workspaceStateService = workspaceStateService;
    }

    @GetMapping("/{moduleKey}/{tabKey}")
    public ResponseEntity<?> get(HttpSession session, @PathVariable String moduleKey, @PathVariable String tabKey,
        @RequestHeader(value="X-Learning-Actor",required=false) String expectedLearningActor) {
        var context = tenantContextResolver.resolve(session);
        if (context.isEmpty()) {
            return unauthorized();
        }
        try {
            var actor = context.get();
            if(learningActorChanged(moduleKey,tabKey,expectedLearningActor,actor.company_id(),actor.user_id()))return learningActorConflict();
            return ResponseEntity.ok(workspaceStateService.get(actor.company_id(), actor.user_id(), moduleKey, tabKey));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PutMapping("/{moduleKey}/{tabKey}")
    public ResponseEntity<?> save(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @PathVariable String moduleKey,
        @PathVariable String tabKey,
        @RequestHeader(value="X-Learning-Actor",required=false) String expectedLearningActor,
        @RequestBody WorkspaceStateRequest request
    ) {
        var context = tenantContextResolver.resolve(session);
        if (context.isEmpty()) {
            return unauthorized();
        }
        try {
            sessionCsrfService.requireCsrf(session, csrfToken);
            var actor = context.get();
            if(learningActorChanged(moduleKey,tabKey,expectedLearningActor,actor.company_id(),actor.user_id()))return learningActorConflict();
            return ResponseEntity.ok(workspaceStateService.save(
                actor.company_id(), actor.user_id(), moduleKey, tabKey,
                request == null ? null : request.state(),
                request == null ? null : request.schemaVersion()
            ));
        } catch (IllegalArgumentException ex) {
            return invalidWrite(moduleKey,tabKey,ex);
        }
    }

    private boolean learningActorChanged(String module,String tab,String expected,long company,long user) {
        return "system".equals(module)&&tab.startsWith("learning-view-")&&!(company+":"+user).equals(expected);
    }
    private ResponseEntity<?> learningActorConflict() {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("code","learning_actor_changed"));
    }

    @DeleteMapping("/{moduleKey}/{tabKey}")
    public ResponseEntity<?> delete(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @PathVariable String moduleKey,
        @PathVariable String tabKey,
        @RequestHeader(value="X-Learning-Actor",required=false) String expectedLearningActor
    ) {
        var context = tenantContextResolver.resolve(session);
        if (context.isEmpty()) {
            return unauthorized();
        }
        try {
            sessionCsrfService.requireCsrf(session, csrfToken);
            var actor = context.get();
            if(learningActorChanged(moduleKey,tabKey,expectedLearningActor,actor.company_id(),actor.user_id()))return learningActorConflict();
            workspaceStateService.delete(actor.company_id(), actor.user_id(), moduleKey, tabKey);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (IllegalArgumentException ex) {
            return invalidWrite(moduleKey,tabKey,ex);
        }
    }

    private ResponseEntity<?> invalidWrite(String module,String tab,IllegalArgumentException failure) {
        var status="system".equals(module)&&tab.startsWith("learning-view-")&&"Invalid CSRF token.".equals(failure.getMessage())
            ? HttpStatus.FORBIDDEN : HttpStatus.BAD_REQUEST;
        return ResponseEntity.status(status).body(Map.of("message",failure.getMessage()));
    }

    private static ResponseEntity<Map<String, String>> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
    }

    public record WorkspaceStateRequest(JsonNode state, Integer schemaVersion) {}
}
