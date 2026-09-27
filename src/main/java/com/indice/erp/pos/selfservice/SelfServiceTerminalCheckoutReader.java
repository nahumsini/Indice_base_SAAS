package com.indice.erp.pos.selfservice;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosSqlSupport;
import com.indice.erp.pos.cashregister.CashRegisterRecord;
import com.indice.erp.pos.selfservice.SelfServiceKioskDtos.PreticketResponse;
import java.util.ArrayList;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class SelfServiceTerminalCheckoutReader {
    private final JdbcTemplate jdbc;
    private final SelfServiceKioskRepository repository;
    public SelfServiceTerminalCheckoutReader(JdbcTemplate jdbc, SelfServiceKioskRepository repository) {
        this.jdbc = jdbc;
        this.repository = repository;
    }
    public PreticketResponse requireClaim(PosContext context, long id, CashRegisterRecord register) {
        var params = new ArrayList<Object>(java.util.Arrays.asList(context.companyId(), id, register.id(), context.userId(),
            register.unitId(), register.businessId(), register.warehouseId()));
        PosSqlSupport.appendScopeParams(params, context.scope());
        var rows = jdbc.queryForList("""
            SELECT preticket.id FROM pos_self_service_pretickets preticket
            WHERE preticket.company_id=? AND preticket.id=? AND preticket.cash_register_id=?
              AND preticket.claimed_by_user_id=? AND preticket.unit_id=? AND preticket.business_id=?
              AND preticket.warehouse_id=? AND preticket.status='CLAIMED' AND preticket.expires_at>CURRENT_TIMESTAMP
              AND """ + PosSqlSupport.scopePredicate("preticket", context.scope()), Long.class, params.toArray());
        if (rows.isEmpty()) throw PosApiException.conflict("Preticket is not claimed by this user and cash register.");
        return repository.findPreticket(context.companyId(), id).orElseThrow(() -> PosApiException.conflict("Preticket is unavailable."));
    }
}
