package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import java.time.Clock;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
class MpCredentialRefresh {
    private final MpConnectionLease leases;
    private final MpMerchantGateway gateway;
    private final MpTokenCodec codec;
    private final Clock clock;

    void refresh(MpConnection connection) {
        String lease = UUID.randomUUID().toString();
        if (!leases.claim(connection, lease, clock.instant().plusSeconds(90))) {
            if (connection.refreshLeaseId() != null && connection.refreshLeaseUntil() != null
                && connection.refreshLeaseUntil().isBefore(clock.instant())) leases.reconnect(connection, connection.refreshLeaseId());
            throw PosApiException.serviceUnavailable("Merchant credentials are refreshing or require reconnection.");
        }
        try {
            String refresh = codec.reveal(connection.companyId(), connection.purpose("refresh"), connection.refreshTokenCiphertext());
            var tokens = gateway.refresh(refresh);
            MpMerchantProof.tokens(tokens, connection.liveMode(), connection.sellerId());
            MpMerchantProof.mexico(gateway.profile(tokens.accessToken()), connection.sellerId());
            if (!leases.rotated(connection, lease,
                codec.protect(connection.companyId(), connection.purpose("access"), tokens.accessToken()),
                codec.protect(connection.companyId(), connection.purpose("refresh"), tokens.refreshToken()),
                clock.instant().plusSeconds(tokens.expiresIn()), tokens.scope())) {
                throw PosApiException.conflict("Merchant authorization changed during refresh.");
            }
        } catch (RuntimeException exception) {
            leases.reconnect(connection, lease);
            throw PosApiException.serviceUnavailable("Merchant credentials require reconnection.");
        }
    }
}
