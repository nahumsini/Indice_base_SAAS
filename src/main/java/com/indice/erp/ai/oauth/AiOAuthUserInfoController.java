package com.indice.erp.ai.oauth;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.indice.erp.ai.access.AiAccessTokenService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import java.util.Map;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AiOAuthUserInfoController {

    private static final String BEARER_CHALLENGE = "Bearer realm=\"indice-ai\"";

    private final AiAccessTokenService tokenService;
    private final AiOAuthUserInfoRepository repository;
    private final AiOAuthProperties properties;

    public AiOAuthUserInfoController(
        AiAccessTokenService tokenService,
        AiOAuthUserInfoRepository repository,
        AiOAuthProperties properties
    ) {
        this.tokenService = tokenService;
        this.repository = repository;
        this.properties = properties;
    }

    @GetMapping(value = "/api/v1/ai/oauth/userinfo", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> userInfo(
        @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization
    ) {
        var token = tokenService.authenticateReadOnly(authorization);
        if (token.isEmpty()) {
            return oauthError(HttpStatus.UNAUTHORIZED, "invalid_token", null);
        }
        if (!token.get().scopes().contains(AiAccessTokenService.OPENID)
            || !token.get().scopes().contains(AiAccessTokenService.EMAIL)) {
            return oauthError(HttpStatus.FORBIDDEN, "insufficient_scope", AiAccessTokenService.EMAIL);
        }
        return repository.find(token.get().user())
            .<ResponseEntity<?>>map(info -> ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .header(HttpHeaders.PRAGMA, "no-cache")
                .body(new UserInfoResponse(
                    subject(token.get().user().userId()),
                    info.email(),
                    info.emailVerified()
                )))
            .orElseGet(() -> oauthError(HttpStatus.UNAUTHORIZED, "invalid_token", null));
    }

    private ResponseEntity<Map<String, String>> oauthError(HttpStatus status, String error, String scope) {
        var challenge = BEARER_CHALLENGE + ", error=\"" + error + "\""
            + (scope == null ? "" : ", scope=\"" + scope + "\"");
        return ResponseEntity.status(status)
            .cacheControl(CacheControl.noStore())
            .header(HttpHeaders.PRAGMA, "no-cache")
            .header(HttpHeaders.WWW_AUTHENTICATE, challenge)
            .body(Map.of("error", error));
    }

    private String subject(Long userId) {
        try {
            var value = properties.getIssuerUrl() + ":user:" + userId;
            var digest = MessageDigest.getInstance("SHA-256")
                .digest(value.getBytes(StandardCharsets.UTF_8));
            return "idx_" + Base64.getUrlEncoder().withoutPadding().encodeToString(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available.", exception);
        }
    }

    public record UserInfoResponse(
        String sub,
        String email,
        @JsonProperty("email_verified") boolean emailVerified
    ) { }
}
