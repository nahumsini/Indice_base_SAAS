package com.indice.erp.ai.oauth;

import com.indice.erp.ai.access.AiAccessTokenService;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeSet;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

@CrossOrigin(origins = "https://chatgpt.com", methods = RequestMethod.GET, allowCredentials = "false")
@RestController
public class AiOAuthMetadataController {

    private final AiOAuthProperties properties;
    private final AiAccessTokenService accessTokenService;

    public AiOAuthMetadataController(AiOAuthProperties properties, AiAccessTokenService accessTokenService) {
        this.properties = properties;
        this.accessTokenService = accessTokenService;
    }

    @GetMapping(
        value = {
            "/.well-known/oauth-protected-resource",
            "/.well-known/oauth-protected-resource/api/v1/ai/mcp"
        },
        produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<?> protectedResource() {
        return ResponseEntity.ok()
            .cacheControl(CacheControl.noStore())
            .body(Map.of(
                "resource", properties.getResourceUrl(),
                "authorization_servers", List.of(properties.getIssuerUrl()),
                "scopes_supported", new TreeSet<>(accessTokenService.supportedScopes()),
                "resource_documentation", properties.getIssuerUrl() + "/support"
            ));
    }

    @GetMapping(value = "/.well-known/oauth-authorization-server", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> authorizationServer() {
        var metadata = new LinkedHashMap<String, Object>();
        metadata.put("issuer", properties.getIssuerUrl());
        metadata.put("authorization_endpoint", properties.authorizationEndpoint());
        metadata.put("token_endpoint", properties.tokenEndpoint());
        metadata.put("registration_endpoint", properties.registrationEndpoint());
        metadata.put("grant_types_supported", List.of("authorization_code", "refresh_token"));
        metadata.put("response_types_supported", List.of("code"));
        metadata.put("token_endpoint_auth_methods_supported", List.of("none"));
        metadata.put("code_challenge_methods_supported", List.of("S256"));
        metadata.put("scopes_supported", new ArrayList<>(new TreeSet<>(accessTokenService.supportedScopes())));
        metadata.put("resource_parameter_supported", true);
        return ResponseEntity.ok()
            .cacheControl(CacheControl.noStore())
            .body(metadata);
    }
}
