package com.indice.erp.pos.terminal;
import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import java.util.function.Supplier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class TerminalPaymentGuard {
    private final TerminalRegisterLock locks;
    private final PendingTerminalPayments pending;
    private final TerminalBindingRepository bindings;
    private final TransactionTemplate transactions;
    public TerminalPaymentGuard(TerminalRegisterLock locks, PendingTerminalPayments pending,
            TerminalBindingRepository bindings, PlatformTransactionManager manager) {
        this.locks = locks;
        this.pending = pending;
        this.bindings = bindings;
        this.transactions = new TransactionTemplate(manager);
    }
    public void lockRegister(PosContext context, long registerId) {
        locks.lock(context, registerId);
    }
    public void assertNoPending(PosContext context, long registerId) {
        assertNoPendingExcept(context, registerId, null, null);
    }
    public void assertNoPendingExcept(PosContext context, long registerId, String provider, Long intentId) {
        TerminalRegisterLock.requireTransaction();
        if (pending.find(context, registerId).stream().anyMatch(attempt ->
                !java.util.Objects.equals(provider, attempt.providerCode()) || !java.util.Objects.equals(intentId, attempt.intentId()))) {
            throw PosApiException.conflict("Recover the unresolved terminal payment before continuing.");
        }
    }
    public void assertAssignmentAllowed(PosContext context, long registerId, String provider, Long terminalId) {
        locks.lockTerminal(context, provider, terminalId);
        assertNoPending(context, registerId);
        var binding = bindings.findLocked(context, registerId);
        if (binding.providerCode() != null && (!provider.equals(binding.providerCode())
                || !java.util.Objects.equals(terminalId, binding.terminalId()))) {
            throw PosApiException.conflict("Unassign the existing terminal before replacing its binding.");
        }
        if (bindings.assignedRegisters(context, provider, terminalId).stream().anyMatch(id -> id != registerId))
            throw PosApiException.conflict("Unassign the terminal from its current register before moving it.");
    }
    public <T> T withRegisterLock(PosContext context, long registerId, Supplier<T> work) {
        return transactions.execute(status -> { lockRegister(context, registerId); return work.get(); });
    }
}
