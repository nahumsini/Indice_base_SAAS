package com.indice.erp.pos.cashregister;

import com.indice.erp.pos.shift.ShiftRepository;
import com.indice.erp.pos.settlement.SettlementPolicyService;
import com.indice.erp.pos.terminal.TerminalPaymentGuard;
import org.springframework.stereotype.Component;

@Component
record CashRegisterDependencies(CashRegisterRepository repository, ShiftRepository shifts, CashRegisterMapper mapper,
        CashRegisterValidator validator, SettlementPolicyService settlements, TerminalPaymentGuard terminalPayments) {
}
