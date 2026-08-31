package com.indice.erp.ai.business;

import com.indice.erp.ai.access.AiAccessTokenService;
import com.indice.erp.ai.access.AiToolAuthorizationService;
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

    public AiToolBusinessApiController(
        AiAccessTokenService tokenService,
        AiToolAuthorizationService authorizationService,
        AiBusinessSnapshotService snapshotService
    ) {
        this.tokenService = tokenService;
        this.authorizationService = authorizationService;
        this.snapshotService = snapshotService;
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
        var user = token.get().user();
        if (!authorizationService.canReadBusinessSnapshot(user)) {
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
            return ResponseEntity.ok(snapshotService.get(user.companyId(), user.userId(), params));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(Map.of("message", exception.getMessage()));
        }
    }

    private void putIfPresent(Map<String, String> params, String key, String value) {
        if (value != null && !value.isBlank()) {
            params.put(key, value);
        }
    }
}
