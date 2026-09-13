package com.indice.erp.ai.access;

import java.util.Map;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/ai/access")
public class AiAccessVerificationApiController {

    private static final String BEARER_CHALLENGE = "Bearer realm=\"indice-ai\", error=\"invalid_token\"";

    private final AiAccessTokenService tokenService;
    private final AiToolCapabilityService capabilityService;

    public AiAccessVerificationApiController(
        AiAccessTokenService tokenService,
        AiToolCapabilityService capabilityService
    ) {
        this.tokenService = tokenService;
        this.capabilityService = capabilityService;
    }

    @GetMapping("/verify")
    public ResponseEntity<?> verify(
        @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization
    ) {
        if (tokenService.authenticate(authorization).isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .header(HttpHeaders.WWW_AUTHENTICATE, BEARER_CHALLENGE)
                .body(Map.of("message", "Invalid or expired access token."));
        }
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/capabilities")
    public ResponseEntity<?> capabilities(
        @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization
    ) {
        var token = tokenService.authenticate(authorization);
        if (token.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .header(HttpHeaders.WWW_AUTHENTICATE, BEARER_CHALLENGE)
                .cacheControl(CacheControl.noStore())
                .body(Map.of("message", "Invalid or expired access token."));
        }
        return ResponseEntity.ok()
            .cacheControl(CacheControl.noStore())
            .body(new AiToolCapabilitiesResponse("v1", capabilityService.allowedTools(token.get())));
    }
}
