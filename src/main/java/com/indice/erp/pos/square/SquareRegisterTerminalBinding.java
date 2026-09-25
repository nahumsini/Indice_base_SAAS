package com.indice.erp.pos.square;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.terminal.TerminalPaymentGuard;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class SquareRegisterTerminalBinding {
    private final SquareSetupDependencies d;
    private final TerminalPaymentGuard guard;
    private final SquareTerminalMutationReader mutations;
    SquareRegisterTerminalBinding(SquareSetupDependencies dependencies, TerminalPaymentGuard guard, SquareTerminalMutationReader mutations) {
        this.d = dependencies;
        this.guard = guard;
        this.mutations = mutations;
    }
    @Transactional
    public SquareTerminalDtos.TerminalResponse assign(PosContext context, long registerId, long terminalId) {
        guard.lockRegister(context, registerId);
        d.registers().requireOperationalRegister(context, registerId);
        guard.assertAssignmentAllowed(context, registerId, "SQUARE", terminalId);
        var terminal = mutations.require(context, terminalId);
        if (!"PAIRED".equalsIgnoreCase(terminal.status()) || terminal.deviceId() == null || terminal.deviceId().isBlank())
            throw PosApiException.badRequest("Square terminal must be paired before assignment.");
        d.terminals().assign(context, registerId, terminalId);
        d.audit().recordTerminal(context, terminalId, "TERMINAL_ASSIGNED", "OK", "Square Terminal assigned to POS register " + registerId + ".");
        return response(d.terminals().findById(context, terminalId).orElseThrow());
    }
    @Transactional
    public void unassign(PosContext context, long registerId) {
        guard.lockRegister(context, registerId);
        d.registers().requireOperationalRegister(context, registerId);
        guard.assertNoPending(context, registerId);
        d.terminals().unassign(context, registerId);
        d.audit().record(context, "TERMINAL_UNASSIGNED", "OK", "Square Terminal unassigned from POS register " + registerId + ".");
    }
    static SquareTerminalDtos.TerminalResponse response(SquareRecords.Terminal terminal) {
        return new SquareTerminalDtos.TerminalResponse(terminal.id(), terminal.name(), terminal.deviceId(),
            terminal.squareLocationId(), terminal.status(), terminal.assignedRegisterId());
    }
}
