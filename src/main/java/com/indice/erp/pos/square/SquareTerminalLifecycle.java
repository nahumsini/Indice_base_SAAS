package com.indice.erp.pos.square;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.terminal.TerminalPaymentGuard;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class SquareTerminalLifecycle {
    private final SquareSetupDependencies d;
    private final TerminalPaymentGuard guard;
    private final SquareTerminalMutationReader mutations;
    SquareTerminalLifecycle(SquareSetupDependencies dependencies, TerminalPaymentGuard guard, SquareTerminalMutationReader mutations) {
        this.d = dependencies;
        this.guard = guard;
        this.mutations = mutations;
    }
    @Transactional
    public SquareTerminalDtos.TerminalResponse disable(PosContext context, long terminalId) {
        var terminal = d.terminals().findById(context, terminalId)
            .orElseThrow(() -> PosApiException.notFound("Square terminal was not found."));
        if (terminal.assignedRegisterId() != null) {
            guard.lockRegister(context, terminal.assignedRegisterId());
        }
        var current = mutations.require(context, terminalId);
        if (!java.util.Objects.equals(current.assignedRegisterId(), terminal.assignedRegisterId()))
            throw PosApiException.conflict("Square terminal binding changed; retry the operation.");
        if (current.assignedRegisterId() != null) guard.assertNoPending(context, current.assignedRegisterId());
        if (!d.terminals().disable(context, terminal.id())) throw PosApiException.conflict("Square terminal could not be disabled.");
        d.verification().unavailable(context.companyId(), terminal.id());
        d.audit().recordTerminal(context, terminalId, "TERMINAL_DISABLED", "OK", "Square Terminal disabled.");
        return SquareRegisterTerminalBinding.response(d.terminals().findById(context, terminalId).orElseThrow());
    }
}
