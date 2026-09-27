package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import java.time.Clock;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MpOAuthService {
    private final MpProperties properties;
    private final MpSecrets secrets;
    private final MpTokenCodec codec;
    private final MpOAuthStore states;
    private final MpMerchantGateway gateway;
    private final MpConnectionWriter writer;
    private final MpOAuthAuthorizeUrl urls;
    private final Clock clock;

    public MpSetupDtos.OAuthStart start(PosContext context) {
        secrets.requireConfigured();
        String state = MpSecurity.random(), verifier = MpSecurity.random();
        String url = urls.build(state, verifier);
        states.create(context, MpSecurity.hash(state), properties.environment(),
            codec.protect(context.companyId(), properties.environment() + ":oauth:" + MpSecurity.hash(state), verifier),
            clock.instant().plusSeconds(Math.clamp(properties.getOauthStateTtlSeconds(), 60, 600)));
        return new MpSetupDtos.OAuthStart(url);
    }
    public void complete(PosContext context, MpSetupDtos.OAuthComplete request) {
        secrets.requireConfigured();
        var stored = states.consume(context, MpSecurity.hash(request.state()), clock.instant());
        if (!properties.environment().equals(stored.environment())) throw PosApiException.conflict("Merchant environment changed.");
        String verifier = codec.reveal(context.companyId(), stored.environment() + ":oauth:" + MpSecurity.hash(request.state()), stored.verifierCiphertext());
        var tokens = gateway.exchange(request.code(), verifier);
        MpMerchantProof.tokens(tokens, properties.isProduction(), null);
        MpMerchantProof.mexico(gateway.profile(tokens.accessToken()), tokens.userId());
        writer.save(context, stored.environment(), tokens);
    }
}
