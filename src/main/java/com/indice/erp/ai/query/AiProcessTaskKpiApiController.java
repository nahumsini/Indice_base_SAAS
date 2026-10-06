package com.indice.erp.ai.query;

import com.indice.erp.ai.access.AiAccessTokenService;
import com.indice.erp.ai.access.AiToolUsageAuditService;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
public class AiProcessTaskKpiApiController {
    private final AiAccessTokenService tokens;
    private final AiProcessTaskKpiService service;
    private final AiToolUsageAuditService audit;
    public AiProcessTaskKpiApiController(AiAccessTokenService tokens, AiProcessTaskKpiService service, AiToolUsageAuditService audit) {
        this.tokens = tokens; this.service = service; this.audit = audit;
    }
    @PostMapping("/api/v1/ai/tools/kpis/get_process_task_kpis")
    public ResponseEntity<?> read(@RequestHeader(value=HttpHeaders.AUTHORIZATION, required=false) String authorization,
            @RequestBody AiProcessTaskKpiService.Request request) {
        var token = tokens.authenticate(authorization, AiAccessTokenService.TASKS_KPIS_READ);
        if (token.isEmpty()) return ResponseEntity.status(401).header(HttpHeaders.WWW_AUTHENTICATE,
                "Bearer realm=\"indice-ai\", error=\"invalid_token\"").body(Map.of("code", "invalid_token"));
        try {
            var result = service.read(token.get(), request);
            audit.recordRead(token.get(), AiProcessTaskKpiService.TOOL, "SUCCESS", 200);
            return ResponseEntity.ok(result);
        } catch (SecurityException error) {
            audit.recordRead(token.get(), AiProcessTaskKpiService.TOOL, "FAILURE", 403);
            return ResponseEntity.status(403).body(Map.of("code", "ai_tool_permission_required", "message", error.getMessage()));
        } catch (IllegalArgumentException error) {
            audit.recordRead(token.get(), AiProcessTaskKpiService.TOOL, "FAILURE", 400);
            return ResponseEntity.badRequest().body(Map.of("code", "invalid_request", "message", error.getMessage()));
        }
    }
}
