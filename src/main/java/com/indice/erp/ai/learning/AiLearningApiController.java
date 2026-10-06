package com.indice.erp.ai.learning;

import com.indice.erp.ai.access.AiAccessTokenService;
import com.indice.erp.ai.access.AiToolUsageAuditService;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/ai/tools/learning")
public class AiLearningApiController {
    private final AiAccessTokenService tokens;
    private final AiLearningService learning;
    private final AiToolUsageAuditService audit;
    public AiLearningApiController(AiAccessTokenService tokens, AiLearningService learning, AiToolUsageAuditService audit) {
        this.tokens = tokens; this.learning = learning; this.audit = audit;
    }
    @PostMapping("/guide")
    public ResponseEntity<?> guide(@RequestHeader(value=HttpHeaders.AUTHORIZATION, required=false) String authorization,
            @RequestBody(required=false) AiLearningContracts.Request request) {
        var token = tokens.authenticate(authorization, AiAccessTokenService.LEARNING_READ);
        if (token.isEmpty()) return ResponseEntity.status(401).header(HttpHeaders.WWW_AUTHENTICATE, "Bearer realm=\"indice-ai\", error=\"invalid_token\"")
            .body(Map.of("code", "invalid_token", "message", "Invalid or insufficiently scoped access token."));
        try {
            var result = learning.guide(token.get(), request);
            audit.recordRead(token.get(), "get_system_guide", "SUCCESS", 200);
            return ResponseEntity.ok(result);
        } catch (SecurityException exception) {
            audit.recordRead(token.get(), "get_system_guide", "FAILURE", 403);
            return ResponseEntity.status(403).body(Map.of("code", "ai_tool_permission_required", "message", "An active authorized module is required for training."));
        } catch (NoSuchElementException exception) {
            audit.recordRead(token.get(), "get_system_guide", "FAILURE", 404);
            return ResponseEntity.status(404).body(Map.of("code", "not_found", "message", "No reviewed guide available in the authorized scope."));
        } catch (IllegalArgumentException exception) {
            audit.recordRead(token.get(), "get_system_guide", "FAILURE", 400);
            return ResponseEntity.badRequest().body(Map.of("code", "invalid_request", "message", exception.getMessage()));
        }
    }
}
