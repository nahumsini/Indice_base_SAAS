package com.indice.erp.pos.mercadopago;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import java.util.List;
import java.util.function.Supplier;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;

class MpFinancialEvidenceLockTest {
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final PlatformTransactionManager manager = mock(PlatformTransactionManager.class);
    private final Supplier<String> work = mock(Supplier.class);
    private final MpFinancialEvidenceLock locks = new MpFinancialEvidenceLock(jdbc, manager);
    @Test void locksOriginalCompanyRegisterThenShiftBeforeEvidenceWorkAndCommit() {
        var transaction = new SimpleTransactionStatus();
        when(manager.getTransaction(any())).thenReturn(transaction);
        when(jdbc.queryForList(contains("FROM pos_cash_registers"), eq(Long.class), eq(42L), eq(9L))).thenReturn(List.of(9L));
        when(jdbc.queryForList(contains("FROM pos_shifts"), eq(Long.class), eq(42L), eq(11L), eq(9L))).thenReturn(List.of(11L));
        when(work.get()).thenReturn("verified");
        assertEquals("verified", locks.apply(MpPaymentTestFixtures.intent(), work));
        var ordered = inOrder(jdbc, work, manager);
        ordered.verify(manager).getTransaction(any());
        ordered.verify(jdbc).queryForList(contains("company_id=? AND id=? FOR UPDATE"), eq(Long.class), eq(42L), eq(9L));
        ordered.verify(jdbc).queryForList(contains("company_id=? AND id=? AND cash_register_id=? FOR UPDATE"),
            eq(Long.class), eq(42L), eq(11L), eq(9L));
        ordered.verify(work).get();
        ordered.verify(manager).commit(transaction);
    }
    @ParameterizedTest @CsvSource({"false,true", "true,false"})
    void missingCompanyRegisterOrOriginalShiftRollsBackBeforeAnyEvidence(boolean register, boolean shift) {
        var transaction = new SimpleTransactionStatus();
        when(manager.getTransaction(any())).thenReturn(transaction);
        when(jdbc.queryForList(contains("FROM pos_cash_registers"), eq(Long.class), eq(42L), eq(9L)))
            .thenReturn(register ? List.of(9L) : List.of());
        when(jdbc.queryForList(contains("FROM pos_shifts"), eq(Long.class), eq(42L), eq(11L), eq(9L)))
            .thenReturn(shift ? List.of(11L) : List.of());
        assertThrows(IllegalStateException.class, () -> locks.apply(MpPaymentTestFixtures.intent(), work));
        verifyNoInteractions(work);
        verify(manager).rollback(transaction);
    }
}
