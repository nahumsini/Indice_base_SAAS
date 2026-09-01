package com.indice.erp.ai.oauth;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import jakarta.servlet.http.HttpSession;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/ai/oauth")
public class AiOAuthApiController {

    private final AiOAuthService oauthService;
    private final SessionAuthService sessionAuthService;
    private final SessionCsrfService csrfService;

    public AiOAuthApiController(
        AiOAuthService oauthService,
        SessionAuthService sessionAuthService,
        SessionCsrfService csrfService
    ) {
        this.oauthService = oauthService;
        this.sessionAuthService = sessionAuthService;
        this.csrfService = csrfService;
    }

    @PostMapping(value = "/register", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> register(@RequestBody(required = false) DynamicRegistrationRequest request) {
        try {
            var safe = request == null ? null : new AiOAuthService.DynamicRegistration(
                request.clientName(), request.redirectUris(), request.grantTypes(),
                request.responseTypes(), request.tokenEndpointAuthMethod()
            );
            var client = oauthService.register(safe);
            var response = new LinkedHashMap<String, Object>();
            response.put("client_id", client.clientId());
            response.put("client_id_issued_at", client.createdAt().getEpochSecond());
            response.put("client_name", client.clientName());
            response.put("redirect_uris", client.redirectUris());
            response.put("grant_types", List.of("authorization_code", "refresh_token"));
            response.put("response_types", List.of("code"));
            response.put("token_endpoint_auth_method", "none");
            return ResponseEntity.status(HttpStatus.CREATED).cacheControl(CacheControl.noStore()).body(response);
        } catch (AiOAuthException exception) {
            return oauthError(HttpStatus.BAD_REQUEST, exception);
        }
    }

    @GetMapping("/consent")
    public ResponseEntity<?> consent(
        HttpSession session,
        @RequestParam(name = "response_type", required = false) String responseType,
        @RequestParam(name = "client_id", required = false) String clientId,
        @RequestParam(name = "redirect_uri", required = false) String redirectUri,
        @RequestParam(name = "scope", required = false) String scope,
        @RequestParam(name = "state", required = false) String state,
        @RequestParam(name = "code_challenge", required = false) String codeChallenge,
        @RequestParam(name = "code_challenge_method", required = false) String codeChallengeMethod,
        @RequestParam(name = "resource", required = false) String resource
    ) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty() || sessionAuthService.isPublicDemoSession(session)) return unauthorized();
        try {
            return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(oauthService.consentContext(
                user.get(),
                authorizationRequest(responseType, clientId, redirectUri, scope, state, codeChallenge, codeChallengeMethod, resource)
            ));
        } catch (AiOAuthException exception) {
            return oauthError(HttpStatus.BAD_REQUEST, exception);
        }
    }

    @PostMapping(value = "/consent", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> decide(
        HttpSession session,
        @RequestHeader(value = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody(required = false) ConsentDecisionRequest request
    ) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty() || sessionAuthService.isPublicDemoSession(session)) return unauthorized();
        try {
            csrfService.requireCsrf(session, csrfToken);
            if (request == null) throw new AiOAuthException("invalid_request", "Consent request is required.");
            return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(oauthService.authorize(
                user.get(),
                authorizationRequest(
                    request.responseType(), request.clientId(), request.redirectUri(), request.scope(), request.state(),
                    request.codeChallenge(), request.codeChallengeMethod(), request.resource()
                ),
                request.approved()
            ));
        } catch (AiOAuthException exception) {
            return oauthError(HttpStatus.BAD_REQUEST, exception);
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .cacheControl(CacheControl.noStore())
                .body(Map.of("error", "access_denied", "error_description", "The session could not approve this connection."));
        }
    }

    @PostMapping(value = "/token", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public ResponseEntity<?> token(@RequestParam Map<String, String> form) {
        try {
            var result = oauthService.exchange(new AiOAuthService.TokenRequest(
                form.get("grant_type"), form.get("code"), form.get("redirect_uri"), form.get("client_id"),
                form.get("code_verifier"), form.get("resource"), form.get("refresh_token"), form.get("scope")
            ));
            var response = new LinkedHashMap<String, Object>();
            response.put("access_token", result.accessToken());
            response.put("token_type", "Bearer");
            response.put("expires_in", result.expiresIn());
            response.put("scope", result.scope());
            response.put("refresh_token", result.refreshToken());
            return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .header(HttpHeaders.PRAGMA, "no-cache")
                .body(response);
        } catch (AiOAuthException exception) {
            return oauthError(HttpStatus.BAD_REQUEST, exception);
        } catch (IllegalStateException exception) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .cacheControl(CacheControl.noStore())
                .body(Map.of(
                    "error", "temporarily_unavailable",
                    "error_description", "Review active AI connections in Indice and try again."
                ));
        }
    }

    private AiOAuthService.AuthorizationRequest authorizationRequest(
        String responseType,
        String clientId,
        String redirectUri,
        String scope,
        String state,
        String codeChallenge,
        String codeChallengeMethod,
        String resource
    ) {
        return new AiOAuthService.AuthorizationRequest(
            responseType, clientId, redirectUri, scope, state, codeChallenge, codeChallengeMethod, resource
        );
    }

    private ResponseEntity<Map<String, String>> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .cacheControl(CacheControl.noStore())
            .body(Map.of("message", "Unauthorized"));
    }

    private ResponseEntity<Map<String, String>> oauthError(HttpStatus status, AiOAuthException exception) {
        return ResponseEntity.status(status)
            .cacheControl(CacheControl.noStore())
            .body(Map.of("error", exception.code(), "error_description", exception.getMessage()));
    }

    public record DynamicRegistrationRequest(
        @JsonProperty("client_name") String clientName,
        @JsonProperty("redirect_uris") List<String> redirectUris,
        @JsonProperty("grant_types") List<String> grantTypes,
        @JsonProperty("response_types") List<String> responseTypes,
        @JsonProperty("token_endpoint_auth_method") String tokenEndpointAuthMethod
    ) { }

    public record ConsentDecisionRequest(
        boolean approved,
        @JsonProperty("response_type") String responseType,
        @JsonProperty("client_id") String clientId,
        @JsonProperty("redirect_uri") String redirectUri,
        String scope,
        String state,
        @JsonProperty("code_challenge") String codeChallenge,
        @JsonProperty("code_challenge_method") String codeChallengeMethod,
        String resource
    ) { }
}
