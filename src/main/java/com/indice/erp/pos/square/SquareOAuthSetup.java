package com.indice.erp.pos.square;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import org.springframework.stereotype.Component;

@Component
class SquareOAuthSetup {
    private final SquareSetupDependencies d;
    private final SquareConnectionPersistence connections;
    SquareOAuthSetup(SquareSetupDependencies dependencies, SquareConnectionPersistence connections) {
        this.d = dependencies;
        this.connections = connections;
    }
    SquareTerminalDtos.OAuthStartResponse start(PosContext context) {
        d.secrets().requireEnabled();
        var state = SquareHashing.randomHex(32);
        d.connections().createOAuthState(context, SquareHashing.sha256(state), d.properties().getEnvironment(),
            d.clock().instant().plusSeconds(d.properties().getOauthStateTtlSeconds()));
        var scopes = "DEVICE_CREDENTIAL_MANAGEMENT,MERCHANT_PROFILE_READ,PAYMENTS_READ,PAYMENTS_WRITE";
        var url = d.properties().apiBaseUrl() + "/oauth2/authorize?client_id=" + enc(d.secrets().applicationId())
            + "&scope=" + enc(scopes) + "&session=false&state=" + enc(state) + "&redirect_uri=" + enc(d.properties().getRedirectUrl());
        return new SquareTerminalDtos.OAuthStartResponse(url);
    }
    SquareTerminalDtos.OAuthCallbackResponse complete(String code, String state) {
        d.secrets().requireEnabled();
        if (code == null || code.isBlank() || state == null || state.isBlank())
            throw PosApiException.badRequest("Square OAuth code and state are required.");
        var stored = d.connections().consumeOAuthState(SquareHashing.sha256(state), d.clock().instant());
        if (stored == null) throw PosApiException.badRequest("Square OAuth state is invalid or expired.");
        return complete(code, stored);
    }
    SquareTerminalDtos.OAuthCallbackResponse complete(String code, SquareConnectionRepository.OAuthState stored) {
        var token = d.gateway().exchangeCode(code.trim());
        connections.save(stored, new SquareRecords.Connection(0, stored.companyId(), token.merchantId(),
            d.codec().protect(token.accessToken()), token.refreshToken() == null ? null : d.codec().protect(token.refreshToken()),
            token.expiresAt(), 0));
        d.audit().record(new PosContext(stored.userId(), stored.companyId(), "Square OAuth", "system", true, PosScope.corporateOffice()),
            "SQUARE_CONNECTED", "OK", "Square OAuth connection completed.");
        return new SquareTerminalDtos.OAuthCallbackResponse(true, token.merchantId());
    }
    private String enc(String value) {
        return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
    }
}
