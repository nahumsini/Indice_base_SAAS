package com.indice.erp.pos.cashregister;

import com.indice.erp.pos.PosContext;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class CashRegisterDeletion {
    private final CashRegisterDependencies d;
    private final CashRegisterOwnership ownership;
    CashRegisterDeletion(CashRegisterDependencies dependencies, CashRegisterOwnership ownership) {
        this.d = dependencies;
        this.ownership = ownership;
    }
    @Transactional
    public Map<String, Object> delete(PosContext context, long id) {
        d.terminalPayments().lockRegister(context, id);
        d.terminalPayments().assertNoPending(context, id);
        ownership.require(context, id);
        d.validator().requireDeletable(d.shifts().hasBlockingShiftForRegister(context, id));
        if (!d.repository().softDelete(context, id)) throw new NoSuchElementException("Cash register not found.");
        return Map.of("success", true);
    }
}
