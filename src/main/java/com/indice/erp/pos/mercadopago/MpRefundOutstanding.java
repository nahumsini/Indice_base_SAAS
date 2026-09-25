package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@lombok.RequiredArgsConstructor
public class MpRefundOutstanding {
    private final JdbcTemplate jdbc;

    public void assertNone(MpIntent intent) {
        var pending = jdbc.queryForList("SELECT id FROM pos_mercado_pago_refund_requests "
            + "WHERE company_id=? AND intent_id=? "
            + "AND status IN ('WAITING','SUBMITTING','PENDING','UNCERTAIN',"
            + "'RECONCILIATION_REQUIRED','DEAD_LETTER') FOR UPDATE",
            Long.class, intent.companyId(), intent.id());
        if (!pending.isEmpty()) {
            throw PosApiException.conflict("Recover the unresolved refund before submitting another refund.");
        }
    }
}
