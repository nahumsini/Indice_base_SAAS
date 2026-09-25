package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@lombok.RequiredArgsConstructor
public class MpPaymentClosureIntents {
    private final JdbcTemplate jdbc;
    private final MpIntentReader reader;
    public Optional<MpIntent> find(PosContext context, String key, long registerId) {
        var intent = reader.byKey(context, key).filter(value -> value.cashRegisterId() == registerId);
        if (intent.isPresent()) return intent;
        var existing = jdbc.queryForList("SELECT id FROM pos_mercado_pago_payment_intents "
            + "WHERE company_id=? AND idempotency_key=? FOR UPDATE", Long.class, context.companyId(), key);
        if (!existing.isEmpty()) {
            throw PosApiException.conflict("The existing terminal payment requires authorized recovery.");
        }
        return Optional.empty();
    }
}
