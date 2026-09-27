package com.indice.erp.pos.square;

import com.indice.erp.pos.PosApiException;
import java.time.Clock;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
class SquareConnectionRefreshService {
    private final SquareTerminalProperties properties;
    private final SquareRefreshConnectionReader reader;
    private final SquareRefreshLeaseStore leases;
    private final SquareConnectionRefreshAttempt attempt;
    private final Clock clock;
    SquareConnectionRefreshService(SquareTerminalProperties properties, SquareRefreshConnectionReader reader,
            SquareRefreshLeaseStore leases, SquareConnectionRefreshAttempt attempt, Clock clock) {
        this.properties=properties; this.reader=reader; this.leases=leases; this.attempt=attempt; this.clock=clock;
    }
    SquareRecords.Connection fresh(long company, Long actor) {
        var connection = reader.find(company, properties.getEnvironment()).orElseThrow(() ->
            PosApiException.badRequest("Connect Square before using Square Terminal."));
        var expires = connection.tokenExpiresAt();
        return expires == null || expires.isAfter(clock.instant().plusSeconds(120))
            ? connection : refresh(connection, actor);
    }
    SquareRecords.Connection refresh(SquareRecords.Connection connection, Long actor) {
        var owner = UUID.randomUUID().toString();
        if (leases.claim(connection.id(), connection.tokenVersion(), owner,
                clock.instant().plusSeconds(90))) return attempt.run(connection, actor, owner);
        return await(connection);
    }
    private SquareRecords.Connection await(SquareRecords.Connection original) {
        for (int count = 0; count < 20; count++) {
            var current = reader.find(original.id()).orElseThrow(() ->
                PosApiException.serviceUnavailable("Square connection requires attention."));
            if (current.tokenVersion() > original.tokenVersion()) return current;
            java.util.concurrent.locks.LockSupport.parkNanos(java.time.Duration.ofMillis(50).toNanos());
            if (Thread.currentThread().isInterrupted()) break;
        }
        throw PosApiException.serviceUnavailable("Square token refresh is already in progress. Retry the request.");
    }
}
