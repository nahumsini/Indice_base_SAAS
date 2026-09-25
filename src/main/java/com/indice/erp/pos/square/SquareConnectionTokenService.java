package com.indice.erp.pos.square;

import com.indice.erp.pos.PosContext;
import java.util.function.Function;
import org.springframework.stereotype.Component;

@Component
class SquareConnectionTokenService {
    private final SquareConnectionRefreshService refresh;
    private final SquareTokenCodec codec;
    SquareConnectionTokenService(SquareConnectionRefreshService refresh, SquareTokenCodec codec) {
        this.refresh = refresh; this.codec = codec;
    }
    <T> T withToken(PosContext context, Function<String, T> call) {
        return call(context.companyId(), context.userId(), call);
    }
    <T> T withCompanyToken(long companyId, Function<String, T> call) {
        return call(companyId, null, call);
    }
    private <T> T call(long company, Long actor, Function<String, T> operation) {
        var connection = refresh.fresh(company, actor);
        try {
            return operation.apply(codec.reveal(connection.accessToken()));
        } catch (SquareGatewayException failure) {
            if (!failure.unauthorized()) throw failure;
            connection = refresh.refresh(connection, actor);
            return operation.apply(codec.reveal(connection.accessToken()));
        }
    }
}
