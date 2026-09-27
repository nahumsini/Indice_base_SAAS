package com.indice.erp.pos.terminal;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class TerminalPaymentGuardTest {
    private final PendingTerminalPayments pending = mock(PendingTerminalPayments.class);
    private final TerminalPaymentGuard guard = new TerminalPaymentGuard(mock(TerminalRegisterLock.class), pending,
        mock(TerminalBindingRepository.class), mock(PlatformTransactionManager.class));
    private final PosContext context = new PosContext(10L, 1L, "Cashier", "admin", true, PosScope.corporateOffice());
    @AfterEach
    void resetTransactionFlag() {
        TransactionSynchronizationManager.setActualTransactionActive(false);
    }
    @Test
    void ownApprovedAttemptCannotBypassAnotherProvidersUnresolvedCharge() {
        TransactionSynchronizationManager.setActualTransactionActive(true);
        when(pending.find(context, 20L)).thenReturn(List.of(new PendingTerminalPayments.Attempt("SQUARE", 1L),
            new PendingTerminalPayments.Attempt("MERCADO_PAGO", 2L)));
        assertThatThrownBy(() -> guard.assertNoPendingExcept(context, 20L, "SQUARE", 1L))
            .isInstanceOf(PosApiException.class);
    }
    @Test
    void verifiedFinalizationAllowsOnlyItsExactAttempt() {
        TransactionSynchronizationManager.setActualTransactionActive(true);
        when(pending.find(context, 20L)).thenReturn(List.of(new PendingTerminalPayments.Attempt("MERCADO_PAGO", 2L)));
        assertThatCode(() -> guard.assertNoPendingExcept(context, 20L, "MERCADO_PAGO", 2L)).doesNotThrowAnyException();
        assertThatThrownBy(() -> guard.assertNoPending(context, 20L)).isInstanceOf(PosApiException.class);
    }
    @Test
    void mutationGuardFailsWithoutTransaction() {
        assertThatThrownBy(() -> guard.assertNoPending(context, 20L)).isInstanceOf(IllegalStateException.class);
        verifyNoInteractions(pending);
    }
}
