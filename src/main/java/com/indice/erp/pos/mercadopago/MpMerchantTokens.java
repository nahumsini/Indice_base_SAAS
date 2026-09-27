package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import java.time.Clock;
import java.util.function.Function;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MpMerchantTokens {
    private final MpSecrets secrets;
    private final MpProperties properties;
    private final MpConnectionStore store;
    private final MpCredentialRefresh refresh;
    private final MpTokenCodec codec;
    private final MpMerchantGateway gateway;
    private final Clock clock;

    public MpConnection connection(long companyId) { return connection(companyId, false); }
    MpConnection chargeConnection(long companyId) { return connection(companyId, true); }
    private MpConnection connection(long companyId, boolean lock) {
        secrets.requireConfigured();
        var found = lock ? store.find(companyId, properties.environment(), true)
            : store.find(companyId, properties.environment());
        var connection = found
            .orElseThrow(() -> PosApiException.conflict("Connect this company's merchant account first."));
        if (!"CONNECTED".equals(connection.state()) || connection.liveMode() != properties.isProduction()
            || !"MX".equals(connection.countryCode()) || !"MLM".equals(connection.siteId())) {
            throw PosApiException.conflict("Merchant connection requires reconnection.");
        }
        return connection;
    }
    public <T> T withToken(PosContext context, Function<String, T> action) {
        return withCompanyToken(context.companyId(), action);
    }
    public <T> T withCompanyToken(long companyId, Function<String, T> action) {
        var connection = connection(companyId);
        if (connection.expiresAt() == null || !connection.expiresAt().isAfter(clock.instant().plusSeconds(120))) {
            refresh.refresh(connection);
            connection = connection(companyId);
        }
        String token = codec.reveal(companyId, connection.purpose("access"), connection.accessTokenCiphertext());
        MpMerchantProof.mexico(gateway.profile(token), connection.sellerId());
        return action.apply(token);
    }
}
