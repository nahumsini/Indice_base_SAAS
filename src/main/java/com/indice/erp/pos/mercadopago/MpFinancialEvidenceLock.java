package com.indice.erp.pos.mercadopago;

import java.util.function.Supplier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class MpFinancialEvidenceLock {
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;

    public MpFinancialEvidenceLock(JdbcTemplate jdbc, PlatformTransactionManager manager) {
        this.jdbc = jdbc;
        this.transactions = new TransactionTemplate(manager);
    }

    public <T> T apply(MpIntent persistedIntent, Supplier<T> work) {
        return transactions.execute(transaction -> {
            var registers = jdbc.queryForList("SELECT id FROM pos_cash_registers "
                + "WHERE company_id=? AND id=? FOR UPDATE", Long.class,
                persistedIntent.companyId(), persistedIntent.cashRegisterId());
            var shifts = jdbc.queryForList("SELECT id FROM pos_shifts "
                + "WHERE company_id=? AND id=? AND cash_register_id=? FOR UPDATE", Long.class,
                persistedIntent.companyId(), persistedIntent.shiftId(), persistedIntent.cashRegisterId());
            if (registers.isEmpty() || shifts.isEmpty()) {
                throw new IllegalStateException("Original payment financial ownership is unavailable.");
            }
            return work.get();
        });
    }
}
