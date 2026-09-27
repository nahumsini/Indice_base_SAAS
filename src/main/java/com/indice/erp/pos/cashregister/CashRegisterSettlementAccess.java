package com.indice.erp.pos.cashregister;

import com.indice.erp.finance.treasury.TreasuryAccount;
import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.settlement.SettlementRuleRequest;
import com.indice.erp.pos.settlement.SettlementRuleResponse;
import java.util.List;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
class CashRegisterSettlementAccess {
    private final CashRegisterDependencies d;
    private final CashRegisterOwnership ownership;
    CashRegisterSettlementAccess(CashRegisterDependencies dependencies, CashRegisterOwnership ownership) {
        this.d = dependencies;
        this.ownership = ownership;
    }
    public List<TreasuryAccount> accounts(PosContext context, long register, String currency) {
        return d.settlements().eligibleAccounts(context, ownership.require(context, register), currency);
    }
    public List<TreasuryAccount> warehouseAccounts(PosContext context, long warehouseId, String currency) {
        var warehouse = d.repository().findWarehouse(context, warehouseId).orElseThrow(() -> new NoSuchElementException("Warehouse not found."));
        d.validator().requireWarehouseScope(warehouse);
        return d.settlements().eligibleAccountsForScope(context, warehouse.unitId(), warehouse.businessId(), currency);
    }
    public List<SettlementRuleResponse> policy(PosContext context, long register, String currency) {
        return d.settlements().ensureCompatibilityPolicy(context, ownership.require(context, register), currency);
    }
    void save(PosContext context, CashRegisterRecord register, String currency, List<SettlementRuleRequest> rules) {
        if (currency == null || currency.isBlank()) {
            if (rules != null && !rules.isEmpty())
                throw PosApiException.badRequest("settlementCurrencyCode is required when settlementRules are provided.");
            return;
        }
        d.settlements().savePolicy(context, register, currency, rules);
    }
}
