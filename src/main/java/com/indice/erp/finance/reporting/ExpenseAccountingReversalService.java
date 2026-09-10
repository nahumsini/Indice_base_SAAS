package com.indice.erp.finance.reporting;

import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.reporting.AccountingPostingModels.PostingCandidate;
import com.indice.erp.finance.reporting.AccountingPostingModels.PostingLine;
import com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver;
import java.time.LocalDate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Ledger-owned exact correction, retaining original currency/rate and every posted journal. */
@Service
public class ExpenseAccountingReversalService {
    private final JdbcTemplate jdbc;
    private final FinancialLedgerRepository ledger;
    private final FinanceBusinessTimeZoneResolver timeZones;

    public ExpenseAccountingReversalService(JdbcTemplate jdbc, FinancialLedgerRepository ledger,
            FinanceBusinessTimeZoneResolver timeZones) {
        this.jdbc = jdbc; this.ledger = ledger; this.timeZones = timeZones;
    }

    @Transactional
    public void reverseExpense(long companyId, long expenseId, long userId, String reason) {
        ledger.lockCompanySources(companyId);
        var entries = jdbc.queryForList("""
            SELECT entry.* FROM finance_journal_entries entry
            WHERE entry.company_id = ? AND entry.source_module = 'expenses' AND entry.status = 'POSTED'
              AND ((entry.source_type = 'EXPENSE' AND entry.source_id = ?)
                OR (entry.source_type = 'EXPENSE_PAYMENT' AND EXISTS
                    (SELECT 1 FROM finance_expense_payments payment WHERE payment.company_id = ? AND payment.expense_id = ?
                        AND payment.id = CAST(entry.source_id AS UNSIGNED))))
              AND NOT EXISTS(SELECT 1 FROM finance_journal_entries reversal
                  WHERE reversal.company_id = entry.company_id AND reversal.reversal_of_entry_id = entry.id AND reversal.status = 'POSTED')
            ORDER BY entry.id FOR UPDATE
            """, companyId, String.valueOf(expenseId), companyId, expenseId);
        if (entries.isEmpty()) return;
        var settings = ledger.findSettings(companyId)
            .orElseThrow(() -> FinanceApiException.conflict("Accounting settings are required to reverse this expense."));
        var date = LocalDate.now(timeZones.resolve(companyId));
        for (var entry : entries) {
            long id = ((Number) entry.get("id")).longValue();
            var lines = jdbc.query("""
                SELECT * FROM finance_journal_lines WHERE company_id = ? AND entry_id = ? ORDER BY line_number
                """, (rs, row) -> {
                    if (!settings.functionalCurrency().equals(rs.getString("functional_currency")))
                        throw FinanceApiException.conflict("The original journal uses a different functional currency. An accounting adjustment is required.");
                    return new PostingLine(null, rs.getLong("account_id"), rs.getObject("unit_id", Long.class),
                        rs.getObject("business_id", Long.class), reversalDescription(rs.getString("description")),
                        rs.getBigDecimal("credit_amount"), rs.getBigDecimal("debit_amount"),
                        rs.getString("source_document_reference"), rs.getBigDecimal("transaction_amount"),
                        rs.getString("transaction_currency"), rs.getBigDecimal("exchange_rate"));
                }, companyId, id);
            var key = "expenses:EXPENSE_DELETION:" + id;
            var candidate = new PostingCandidate("expenses", "EXPENSE_DELETION", String.valueOf(expenseId), key,
                String.valueOf(entry.get("source_fingerprint")), "REVERSAL", date, reason,
                String.valueOf(entry.get("currency_code")), lines, (java.math.BigDecimal) entry.get("exchange_rate"),
                (String) entry.get("exchange_rate_evidence_json"));
            ledger.post(companyId, userId, settings, candidate);
            jdbc.update("UPDATE finance_journal_entries SET reversal_of_entry_id = ? WHERE company_id = ? AND source_event_key = ? AND reversal_of_entry_id IS NULL",
                id, companyId, key);
        }
    }
    private String reversalDescription(String description) {
        var value = "Reversal: " + description;
        return value.substring(0, Math.min(value.length(), 500));
    }
}
