package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class MpOAuthAuthorizeUrl {
    private final MpProperties properties;
    private final MpSecrets secrets;

    String build(String state, String verifier) {
        URI redirect;
        try { redirect = URI.create(properties.getRedirectUrl()); }
        catch (RuntimeException exception) { throw PosApiException.serviceUnavailable("OAuth redirect is invalid."); }
        if (!"https".equals(redirect.getScheme()) || redirect.getHost() == null || redirect.getUserInfo() != null
            || redirect.getFragment() != null || redirect.getQuery() != null) {
            throw PosApiException.serviceUnavailable("OAuth redirect is invalid.");
        }
        return "https://auth.mercadopago.com/authorization?response_type=code&platform_id=mp"
            + "&client_id=" + enc(secrets.applicationId()) + "&redirect_uri=" + enc(redirect.toString())
            + "&state=" + enc(state) + "&code_challenge=" + enc(MpSecurity.challenge(verifier)) + "&code_challenge_method=S256";
    }
    private String enc(String value) { return URLEncoder.encode(value, StandardCharsets.UTF_8); }
}
