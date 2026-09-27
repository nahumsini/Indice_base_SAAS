package com.indice.erp.pos.cashregister;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.cashregister.dto.CashRegisterCreateRequest;
import com.indice.erp.pos.cashregister.dto.CashRegisterUpdateRequest;
import com.indice.erp.pos.cashregister.dto.CashRegisterResponse;
import com.indice.erp.pos.settlement.SettlementRuleResponse;
import com.indice.erp.finance.treasury.TreasuryAccount;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class CashRegisterService {
    private final CashRegisterQueries queries;
    private final CashRegisterOwnership ownership;
    private final CashRegisterCodes codes;
    private final CashRegisterCreation creation;
    private final CashRegisterProvisioning provisioning;
    private final CashRegisterUpdate updating;
    private final CashRegisterDeletion deletion;
    private final CashRegisterSettlementAccess settlements;
    public CashRegisterService(CashRegisterQueries queries, CashRegisterOwnership ownership, CashRegisterCodes codes,
            CashRegisterCreation creation, CashRegisterProvisioning provisioning, CashRegisterUpdate updating,
            CashRegisterDeletion deletion, CashRegisterSettlementAccess settlements) {
        this.queries = queries;
        this.ownership = ownership;
        this.codes = codes;
        this.creation = creation;
        this.provisioning = provisioning;
        this.updating = updating;
        this.deletion = deletion;
        this.settlements = settlements;
    }
    public Map<String, Object> list(PosContext context) { return queries.list(context); }
    public CashRegisterResponse get(PosContext context, long id) { return queries.get(context, id); }
    public List<CashRegisterResponse> activeRegisters(PosContext context) { return queries.active(context); }
    public CashRegisterResponse create(PosContext c, CashRegisterCreateRequest r) { return creation.create(c, r); }
    public Map<String, Object> nextCode(PosContext context, long warehouse) { return codes.next(context, warehouse); }
    public CashRegisterResponse ensureForWarehouse(PosContext c, long warehouse) { return provisioning.ensure(c, warehouse); }
    public CashRegisterResponse update(PosContext c, long id, CashRegisterUpdateRequest r) { return updating.update(c, id, r); }
    public Map<String, Object> delete(PosContext context, long id) { return deletion.delete(context, id); }
    public CashRegisterRecord requireRegister(PosContext context, long id) { return ownership.require(context, id); }
    public CashRegisterRecord requireOperationalRegister(PosContext context, long id) { return ownership.operational(context, id); }
    public List<TreasuryAccount> settlementAccounts(PosContext c, long id, String currency) { return settlements.accounts(c, id, currency); }
    public List<TreasuryAccount> settlementAccountsForWarehouse(PosContext c, long id, String currency) { return settlements.warehouseAccounts(c, id, currency); }
    public List<SettlementRuleResponse> settlementPolicy(PosContext c, long id, String currency) { return settlements.policy(c, id, currency); }
}
