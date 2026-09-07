package com.indice.erp.ai.business;

import com.indice.erp.ai.access.AiAccessTokenService;
import com.indice.erp.ai.access.AiToolAuthorizationService;
import com.indice.erp.ai.access.AiToolUsageAuditService;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/ai/tools/business")
public class AiToolBusinessApiController {

    private static final String BEARER_CHALLENGE = "Bearer realm=\"indice-ai\", error=\"invalid_token\"";

    private final AiAccessTokenService tokenService;
    private final AiToolAuthorizationService authorizationService;
    private final AiBusinessSnapshotService snapshotService;
    private final AiToolUsageAuditService auditService;
    private final com.indice.erp.kpis.KpiRequestAccessService kpiAccess;

    public AiToolBusinessApiController(
        AiAccessTokenService tokenService,
        AiToolAuthorizationService authorizationService,
        AiBusinessSnapshotService snapshotService,
        AiToolUsageAuditService auditService,
        com.indice.erp.kpis.KpiRequestAccessService kpiAccess
    ) {
        this.tokenService = tokenService;
        this.authorizationService = authorizationService;
        this.snapshotService = snapshotService;
        this.auditService = auditService;
        this.kpiAccess = kpiAccess;
    }

    @GetMapping("/snapshot")
    public ResponseEntity<?> snapshot(
        @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
        @RequestParam(required = false) String period,
        @RequestParam(required = false) String from,
        @RequestParam(required = false) String to,
        @RequestParam(required = false) String preferredCurrency
    ) {
        var token = tokenService.authenticate(authorization, AiAccessTokenService.BUSINESS_SNAPSHOT_READ);
        if (token.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .header(HttpHeaders.WWW_AUTHENTICATE, BEARER_CHALLENGE)
                .body(Map.of("message", "Invalid or expired access token."));
        }
        var storedToken = token.get();
        var user = storedToken.user();
        if (!authorizationService.canReadBusinessSnapshot(user)) {
            auditService.recordRead(storedToken, "get_business_snapshot", "FAILURE", HttpStatus.FORBIDDEN.value());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                "message", "The current Indice permissions do not allow this tool.",
                "code", "ai_tool_permission_required"
            ));
        }

        try {
            var params = new LinkedHashMap<String, String>();
            putIfPresent(params, "period", period);
            putIfPresent(params, "from", from);
            putIfPresent(params, "to", to);
            putIfPresent(params, "preferredCurrency", preferredCurrency);
            var response = snapshotService.get(user.companyId(), user.userId(), kpiAccess.central(user, "kpis", null, null).apply(params));
            auditService.recordRead(storedToken, "get_business_snapshot", "SUCCESS", HttpStatus.OK.value());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException exception) {
            auditService.recordRead(storedToken, "get_business_snapshot", "FAILURE", HttpStatus.BAD_REQUEST.value());
            return ResponseEntity.badRequest().body(Map.of("message", exception.getMessage()));
        }
    }

    private void putIfPresent(Map<String, String> params, String key, String value) {
        if (value != null && !value.isBlank()) {
            params.put(key, value);
        }
    }
}
