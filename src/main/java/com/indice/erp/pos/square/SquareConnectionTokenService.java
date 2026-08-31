package com.indice.erp.pos.square;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import java.time.Clock;
import java.time.Instant;
import java.util.function.Function;
import org.springframework.stereotype.Service;

@Service
public class SquareConnectionTokenService {

    private final SquareTerminalProperties properties;
    private final SquareTokenCodec tokenCodec;
    private final SquareTerminalGateway gateway;
    private final SquareConnectionRepository connections;
    private final Clock clock;

    public SquareConnectionTokenService(SquareTerminalProperties properties, SquareTokenCodec tokenCodec,
            SquareTerminalGateway gateway, SquareConnectionRepository connections, Clock clock) {
        this.properties = properties;
        this.tokenCodec = tokenCodec;
        this.gateway = gateway;
        this.connections = connections;
        this.clock = clock;
    }

    <T> T withToken(PosContext context, Function<String, T> call) {
        var connection = freshConnection(context);
        try {
            return call.apply(tokenCodec.reveal(connection.accessToken()));
        } catch (SquareGatewayException ex) {
            if (!ex.unauthorized()) throw ex;
            connection = refreshConnection(connection, context.userId());
            return call.apply(tokenCodec.reveal(connection.accessToken()));
        }
    }

    <T> T withCompanyToken(long companyId, Function<String, T> call) {
        var connection = freshConnection(companyId);
        try {
            return call.apply(tokenCodec.reveal(connection.accessToken()));
        } catch (SquareGatewayException ex) {
            if (!ex.unauthorized()) throw ex;
            connection = refreshConnection(connection, null);
            return call.apply(tokenCodec.reveal(connection.accessToken()));
        }
    }

    private SquareRecords.Connection freshConnection(PosContext context) {
        return freshConnection(connections.findConnection(context, properties.getEnvironment())
            .orElseThrow(() -> PosApiException.badRequest("Connect Square before using Square Terminal.")),
            context.userId());
    }

    private SquareRecords.Connection freshConnection(long companyId) {
        return freshConnection(connections.findConnection(companyId, properties.getEnvironment())
            .orElseThrow(() -> PosApiException.badRequest("Connect Square before using Square Terminal.")), null);
    }

    private SquareRecords.Connection freshConnection(SquareRecords.Connection connection, Long actorUserId) {
        var expires = connection.tokenExpiresAt();
        if (expires == null || expires.isAfter(clock.instant().plusSeconds(120))) {
            return connection;
        }
        return refreshConnection(connection, actorUserId);
    }

    private SquareRecords.Connection refreshConnection(SquareRecords.Connection connection, Long actorUserId) {
        var refreshToken = blank(connection.refreshToken()) == null ? null : tokenCodec.reveal(connection.refreshToken());
        if (blank(refreshToken) == null) {
            connections.markError(connection.id(), actorUserId);
            throw PosApiException.serviceUnavailable("Square connection expired. Reconnect Square.");
        }
        try {
            var token = gateway.refreshToken(refreshToken);
            var refreshed = new SquareRecords.Connection(connection.id(), connection.companyId(),
                blank(token.merchantId()) == null ? connection.merchantId() : token.merchantId(),
                tokenCodec.protect(token.accessToken()),
                token.refreshToken() == null ? connection.refreshToken() : tokenCodec.protect(token.refreshToken()),
                token.expiresAt() == null ? Instant.now(clock) : token.expiresAt());
            connections.updateTokens(connection.id(), refreshed, actorUserId);
            return refreshed;
        } catch (RuntimeException ex) {
            connections.markError(connection.id(), actorUserId);
            throw ex;
        }
    }

    private String blank(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
