package com.indice.erp.finance.expenses;

import com.indice.erp.finance.shared.FinanceContext;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Company-owned retry evidence; expense visibility is still checked by ExpenseRepository. */
@Repository
class ExpenseImportRepository {
    private final JdbcTemplate jdbc;
    ExpenseImportRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    Optional<Batch> findForUpdate(FinanceContext context, String key) {
        return jdbc.query("""
            SELECT request_hash, created_by_user_id, expense_ids_json FROM finance_expense_import_batches
            WHERE company_id = ? AND request_key = ? FOR UPDATE
            """, (rs, index) -> new Batch(rs.getString(1), rs.getLong(2), rs.getString(3)),
            context.companyId(), key).stream().findFirst();
    }

    void insert(FinanceContext context, String key, String hash, String expenseIdsJson) {
        jdbc.update("""
            INSERT INTO finance_expense_import_batches
                (company_id, request_key, request_hash, created_by_user_id, expense_ids_json)
            VALUES (?, ?, ?, ?, ?)
            """, context.companyId(), key, hash, context.userId(), expenseIdsJson);
    }

    record Batch(String hash, long actor, String ids) {}
}
