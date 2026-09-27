package com.indice.erp.pos.square;

import com.indice.erp.pos.PosApiException;
import java.time.Clock;
import java.time.Instant;
import org.springframework.stereotype.Component;

@Component
class SquareConnectionRefreshAttempt {
    private final SquareTerminalGateway gateway;
    private final SquareTokenCodec codec;
    private final SquareRefreshLeaseStore leases;
    private final Clock clock;
    SquareConnectionRefreshAttempt(SquareTerminalGateway gateway, SquareTokenCodec codec,
            SquareRefreshLeaseStore leases, Clock clock) {
        this.gateway=gateway; this.codec=codec; this.leases=leases; this.clock=clock;
    }
    SquareRecords.Connection run(SquareRecords.Connection connection, Long actor, String owner) {
        var protectedRefresh = clean(connection.refreshToken());
        if (protectedRefresh == null) return expired(connection, actor, owner);
        try {
            var token = gateway.refreshToken(codec.reveal(protectedRefresh));
            if (clean(token.merchantId()) != null && !connection.merchantId().equals(token.merchantId())) {
                leases.fail(connection.id(), connection.tokenVersion(), owner, actor);
                throw PosApiException.conflict("Square refresh returned a different merchant identity.");
            }
            var refreshed = new SquareRecords.Connection(connection.id(), connection.companyId(),
                connection.merchantId(), codec.protect(token.accessToken()),
                token.refreshToken() == null ? connection.refreshToken() : codec.protect(token.refreshToken()),
                token.expiresAt() == null ? Instant.now(clock) : token.expiresAt(), connection.tokenVersion() + 1);
            if (!leases.complete(connection.id(), connection.tokenVersion(), owner, refreshed, actor))
                throw PosApiException.serviceUnavailable("Square token refresh changed concurrently. Retry the request.");
            return refreshed;
        } catch (RuntimeException failure) {
            if (failure instanceof SquareGatewayException gatewayFailure && gatewayFailure.unauthorized())
                leases.fail(connection.id(), connection.tokenVersion(), owner, actor);
            else leases.release(connection.id(), owner);
            throw failure;
        }
    }
    private SquareRecords.Connection expired(SquareRecords.Connection value, Long actor, String owner) {
        leases.fail(value.id(), value.tokenVersion(), owner, actor);
        throw PosApiException.serviceUnavailable("Square connection expired. Reconnect Square.");
    }
    private String clean(String value) { return value == null || value.isBlank() ? null : value; }
}
