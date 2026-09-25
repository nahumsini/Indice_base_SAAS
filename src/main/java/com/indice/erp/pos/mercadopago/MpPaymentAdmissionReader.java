package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosSqlSupport;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
@lombok.RequiredArgsConstructor
public class MpPaymentAdmissionReader {
    private final JdbcTemplate jdbc;
    private final RowMapper<MpPaymentAdmission> mapper = (row, index) -> new MpPaymentAdmission(
        row.getString("idempotency_key"), row.getLong("cash_register_id"), row.getLong("created_by_user_id"),
        row.getString("payload_hash"), row.getString("status"), row.getString("message"),
        row.getObject("status_code", Integer.class));
    public MpPaymentAdmission lock(long companyId, String key) {
        return jdbc.query("SELECT * FROM pos_mercado_pago_payment_admissions "
            + "WHERE company_id=? AND idempotency_key=? FOR UPDATE", mapper, companyId, key)
            .stream().findFirst().orElseThrow();
    }
    public Optional<MpPaymentAdmission> rejected(PosContext context, String key, long registerId) {
        var args = new ArrayList<Object>(List.of(context.companyId(), key, registerId, context.userId()));
        PosSqlSupport.appendScopeParams(args, context.scope());
        return jdbc.query("SELECT a.* FROM pos_mercado_pago_payment_admissions a "
            + "WHERE a.company_id=? AND a.idempotency_key=? AND a.cash_register_id=? "
            + "AND a.created_by_user_id=? AND a.status='REJECTED' AND "
            + PosSqlSupport.scopePredicate("a", context.scope()), mapper, args.toArray())
            .stream().findFirst();
    }
}
