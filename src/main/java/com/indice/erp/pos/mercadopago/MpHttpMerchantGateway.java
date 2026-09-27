package com.indice.erp.pos.mercadopago;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class MpHttpMerchantGateway implements MpMerchantGateway {
    private final MpHttpClient client;
    private final MpTerminalDiscovery discovery;
    private final MpSecrets secrets;
    private final MpProperties properties;
    private final ObjectMapper mapper;

    public MpProviderDtos.Tokens exchange(String code, String verifier) {
        return token(new MpOAuthRequest(secrets.applicationId(), secrets.applicationSecret(), "authorization_code",
            code, verifier, properties.getRedirectUrl(), null, !properties.isProduction()));
    }
    public MpProviderDtos.Tokens refresh(String refreshToken) {
        return token(new MpOAuthRequest(secrets.applicationId(), secrets.applicationSecret(), "refresh_token",
            null, null, null, refreshToken, !properties.isProduction()));
    }
    public MpProviderDtos.Profile profile(String token) {
        try { return mapper.treeToValue(client.request("GET", "/users/me", token, null, null), MpProviderDtos.Profile.class); }
        catch (MpGatewayException exception) { throw exception; }
        catch (Exception exception) { throw new MpGatewayException(0, true); }
    }
    public List<MpProviderDtos.Terminal> terminals(String token) { return discovery.list(token); }
    public MpProviderDtos.Terminal configure(String token, String id) { return discovery.configure(token, id); }
    private MpProviderDtos.Tokens token(MpOAuthRequest request) {
        try {
            return mapper.treeToValue(client.request("POST", "/oauth/token", null,
                mapper.writeValueAsString(request), null), MpProviderDtos.Tokens.class);
        } catch (MpGatewayException exception) { throw exception; }
        catch (Exception exception) { throw new MpGatewayException(0, true); }
    }
}
