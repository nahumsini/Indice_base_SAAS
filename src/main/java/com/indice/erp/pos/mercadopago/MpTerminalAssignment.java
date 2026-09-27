package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.cashregister.CashRegisterService;
import com.indice.erp.pos.terminal.TerminalPaymentGuard;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MpTerminalAssignment {
    private final TerminalPaymentGuard guard;
    private final CashRegisterService registers;
    private final MpTerminalStore terminals;
    private final MpTerminalWriter writer;
    private final MpMerchantTokens tokens;
    private final MpPaymentAudit audit;
    private final MpSecrets secrets;

    @Transactional
    public MpSetupDtos.Terminal assign(PosContext context, long register, long id) {
        tokens.connection(context.companyId());
        guard.lockRegister(context, register);
        registers.requireOperationalRegister(context, register);
        guard.assertAssignmentAllowed(context, register, "MERCADO_PAGO", id);
        var terminal = terminals.require(context, id, true);
        if (!MpTerminalEligibility.configured(terminal)) {
            throw PosApiException.conflict("Configure Point integrated mode before assignment.");
        }
        if (terminal.cashRegisterId() != null && terminal.cashRegisterId() != register) {
            throw PosApiException.conflict("Unassign the terminal from its current register first.");
        }
        writer.assign(context.companyId(), register, id);
        audit.record(context.companyId(), context.userId(), null, "TERMINAL_ASSIGNED", "READY");
        return terminals.require(context, id, false).response();
    }
    @Transactional
    public void unassign(PosContext context, long register) {
        secrets.requireEnabled();
        guard.lockRegister(context, register);
        registers.requireOperationalRegister(context, register);
        guard.assertNoPending(context, register);
        writer.unassign(context.companyId(), register);
        audit.record(context.companyId(), context.userId(), null, "TERMINAL_UNASSIGNED", "OK");
    }
}
