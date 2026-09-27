package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosSqlSupport;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@lombok.RequiredArgsConstructor
public class MpIntentReader {
    private final JdbcTemplate jdbc;
    private final MpIntentMapper mapper;
    public Optional<MpIntent> find(PosContext context, long id) {
        return query(context, "i.id = ?", List.of(id), 1).stream().findFirst();
    }

    public Optional<MpIntent> byKey(PosContext context, String key) {
        return query(context, "i.idempotency_key = ?", List.of(key), 1).stream().findFirst();
    }

    public List<MpIntent> pending(PosContext context, Long register, Long shift, int limit) {
        var args = new ArrayList<Object>();
        var filter = "i.pos_ticket_id IS NULL AND i.status IN "
            + "('WAITING','UNCERTAIN','APPROVED','PARTIALLY_REFUNDED','RECONCILIATION_REQUIRED')";
        if (register != null) { filter += " AND i.cash_register_id = ?"; args.add(register); }
        if (shift != null) { filter += " AND i.shift_id = ?"; args.add(shift); }
        return query(context, filter, args, limit);
    }

    private List<MpIntent> query(PosContext context, String filter, List<?> values, int limit) {
        var args = new ArrayList<Object>();
        args.add(context.companyId());
        args.addAll(values);
        var ownership = context.canManageOtherUsers() ? "" : " AND i.created_by_user_id = ?";
        if (!context.canManageOtherUsers()) args.add(context.userId());
        PosSqlSupport.appendScopeParams(args, context.scope());
        args.add(Math.max(1, Math.min(limit, 50)));
        return jdbc.query("SELECT i.* FROM pos_mercado_pago_payment_intents i "
            + "JOIN pos_cash_registers r ON r.id=i.cash_register_id AND r.company_id=i.company_id "
            + "JOIN pos_shifts s ON s.id=i.shift_id AND s.company_id=i.company_id "
            + "WHERE i.company_id=? AND " + filter + ownership + " AND "
            + PosSqlSupport.scopePredicate("s", context.scope())
            + " ORDER BY i.id DESC LIMIT ?", mapper, args.toArray());
    }
}
