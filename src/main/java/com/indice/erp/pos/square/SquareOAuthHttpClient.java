package com.indice.erp.pos.square;

import java.util.Map;
import org.springframework.stereotype.Component;

@Component
class SquareOAuthHttpClient {
    private final SquareTerminalSecretProvider secrets;
    private final SquareRestClient client;
    SquareOAuthHttpClient(SquareTerminalSecretProvider secrets, SquareRestClient client) {
        this.secrets = secrets; this.client = client;
    }
    SquareTerminalGateway.OAuthToken exchange(String code) {
        return token(client.post("/oauth2/token", null, Map.of(
            "client_id", secrets.applicationId(), "client_secret", secrets.applicationSecret(),
            "code", code, "grant_type", "authorization_code")));
    }
    SquareTerminalGateway.OAuthToken refresh(String refreshToken) {
        return token(client.post("/oauth2/token", null, Map.of(
            "client_id", secrets.applicationId(), "client_secret", secrets.applicationSecret(),
            "refresh_token", refreshToken, "grant_type", "refresh_token")));
    }
    private SquareTerminalGateway.OAuthToken token(com.fasterxml.jackson.databind.JsonNode root) {
        return new SquareTerminalGateway.OAuthToken(SquareProviderIdentifiers.text(root.path("merchant_id"),128),
            SquareJsonValues.text(root, "access_token"), SquareJsonValues.text(root, "refresh_token"),
            SquareJsonValues.instant(SquareJsonValues.text(root, "expires_at")));
    }
}
