package com.indice.erp.ai.oauth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AiOpenAiDomainVerificationController {

    private final String challengeToken;

    public AiOpenAiDomainVerificationController(
        @Value("${app.ai.publication.domain-challenge-token:}") String challengeToken
    ) {
        this.challengeToken = challengeToken == null ? "" : challengeToken.trim();
    }

    @GetMapping(
        value = "/.well-known/openai-apps-challenge",
        produces = MediaType.TEXT_PLAIN_VALUE
    )
    public ResponseEntity<String> challenge() {
        if (challengeToken.isBlank()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok()
            .cacheControl(CacheControl.noStore())
            .contentType(MediaType.TEXT_PLAIN)
            .body(challengeToken);
    }
}
