package com.indice.erp.finance.reporting;

import com.indice.erp.finance.reporting.AccountingPostingModels.PostingCandidate;
import com.indice.erp.finance.reporting.FinancialLedgerRepository.AccountingSettings;
import com.indice.erp.finance.reporting.AccountingPostingModels.PostingLine;
import com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver;
import java.time.LocalDate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** Reverses posted evidence only when its owner has recorded an explicit cancellation event. */
@Service
class AccountingSourceReversalService {
    private final JdbcTemplate jdbc;
    private final FinancialLedgerRepository ledger;
    private final FinanceBusinessTimeZoneResolver timezones;
    private final AccountingCurrencyConversion currencies;

    AccountingSourceReversalService(JdbcTemplate jdbc, FinancialLedgerRepository ledger, FinanceBusinessTimeZoneResolver timezones, AccountingCurrencyConversion currencies) {
        this.jdbc = jdbc;
        this.ledger = ledger;
        this.timezones = timezones;
        this.currencies = currencies;
    }

    int postSalesReversals(long companyId, long userId, AccountingSettings settings, LocalDate from, LocalDate to) {
        var zone = timezones.resolve(companyId);
        var reversals = eligibleReversals(companyId, from, to);
        int posted = 0;
        for (var reversal : reversals) {
            long originalId = ((Number) reversal.get("entry_id")).longValue();
            var lines = jdbc.query("""
                SELECT line.*, account.system_code FROM finance_journal_lines line JOIN finance_accounting_accounts account
                  ON account.company_id = line.company_id AND account.id = line.account_id
                WHERE line.company_id = ? AND line.entry_id = ? ORDER BY line.line_number
                """, (rs, row) -> new PostingLine(rs.getString("system_code"), rs.getLong("account_id"), rs.getObject("unit_id", Long.class),
                    rs.getObject("business_id", Long.class), "Reversión: " + rs.getString("description"),
                    rs.getBigDecimal("credit_amount"), rs.getBigDecimal("debit_amount"), rs.getString("source_document_reference"),
                    rs.getBigDecimal("transaction_amount"), rs.getString("transaction_currency"), rs.getBigDecimal("exchange_rate")), companyId, originalId);
            var instant = databaseInstant(reversal.get("occurred_at"));
            String module = String.valueOf(reversal.get("source_module")), type = String.valueOf(reversal.get("source_type"));
            String eventKey = module + ":" + type + ":" + reversal.get("movement_id");
            if (ledger.findEntry(companyId, eventKey).isPresent()) continue;
            var candidate = new PostingCandidate(module, type, String.valueOf(reversal.get("source_id")),
                eventKey, String.valueOf(reversal.get("source_fingerprint")), "REVERSAL", instant.atZone(zone).toLocalDate(),
                "Reversión de operación " + reversal.get("source_id"), String.valueOf(reversal.get("currency_code")), lines,
                (java.math.BigDecimal) reversal.get("exchange_rate"), (String) reversal.get("exchange_rate_evidence_json"));
            try { candidate = currencies.revalueReversalCash(candidate, settings.functionalCurrency()); }
            catch (AccountingCurrencyConversion.MissingRate | AccountingCurrencyConversion.MissingRecognition missingEvidence) { continue; }
            if (ledger.post(companyId, userId, settings, candidate) == FinancialLedgerRepository.PostResult.POSTED) {
                jdbc.update("UPDATE finance_journal_entries SET reversal_of_entry_id = ? WHERE company_id = ? AND source_event_key = ? AND reversal_of_entry_id IS NULL",
                    originalId, companyId, eventKey);
                posted++;
            }
        }
        return posted;
    }
    java.util.List<AccountingPostingModels.DiscoveryIssue> pending(long company, LocalDate from, LocalDate to, Long unit, Long business) {
        var result = new java.util.ArrayList<AccountingPostingModels.DiscoveryIssue>();
        for (var source : eligibleReversals(company, from, to)) {
            String module = String.valueOf(source.get("source_module")), type = String.valueOf(source.get("source_type"));
            if (ledger.findEntry(company, module + ":" + type + ":" + source.get("movement_id")).isPresent()) continue;
            if (unit != null || business != null) {
                var args = new java.util.ArrayList<Object>(); args.add(company); args.add(source.get("entry_id"));
                String sql = "SELECT COUNT(*) FROM finance_journal_lines WHERE company_id = ? AND entry_id = ?";
                if (unit != null) { sql += " AND unit_id = ?"; args.add(unit); }
                if (business != null) { sql += " AND business_id = ?"; args.add(business); }
                if (jdbc.queryForObject(sql, Integer.class, args.toArray()) == 0) continue;
            }
            result.add(new AccountingPostingModels.DiscoveryIssue("UNPOSTED_SOURCE_REVERSAL", "BLOCKING", module,
                "inventory".equals(module) ? "INVENTORY_RECEIPT" : "SALE", String.valueOf(source.get("source_id")),
                "La devolución o cancelación registrada aún no tiene su reversión contable.",
                "Sincroniza y verifica la evidencia de cambio de la fecha de devolución antes de cerrar."));
        }
        return result;
    }

    private java.util.List<java.util.Map<String, Object>> eligibleReversals(long companyId, LocalDate from, LocalDate to) {
        var zone = timezones.resolve(companyId);
        var reversals = new java.util.ArrayList<>(jdbc.queryForList("""
            SELECT movement.id movement_id, movement.source_id, movement.occurred_at, 'sales' source_module, 'SALE_REVERSAL' source_type,
                   entry.id entry_id, entry.currency_code, entry.exchange_rate, entry.exchange_rate_evidence_json,
                   entry.source_fingerprint
            FROM finance_payment_account_movements movement
            JOIN finance_journal_entries entry ON entry.company_id = movement.company_id
              AND entry.source_module = 'sales' AND entry.source_type = 'SALE' AND CAST(entry.source_id AS UNSIGNED) = CAST(movement.source_id AS UNSIGNED)
              AND entry.status = 'POSTED'
            WHERE movement.company_id = ? AND movement.source_type = 'SALE_COLLECTION_REVERSAL'
              AND movement.occurred_at >= ? AND movement.occurred_at < ?
            ORDER BY movement.occurred_at, movement.id
            """, companyId, java.sql.Timestamp.from(from.atStartOfDay(zone).toInstant()),
                java.sql.Timestamp.from(to.plusDays(1).atStartOfDay(zone).toInstant())));
        reversals.addAll(jdbc.queryForList("""
            SELECT receipt.id movement_id, receipt.id source_id, receipt.reversed_at occurred_at,
                   'inventory' source_module, 'INVENTORY_RECEIPT_REVERSAL' source_type,
                   entry.id entry_id, entry.currency_code, entry.exchange_rate, entry.exchange_rate_evidence_json, entry.source_fingerprint
            FROM pos_inventory_receipts receipt JOIN finance_journal_entries entry ON entry.company_id = receipt.company_id
              AND entry.source_module = 'inventory' AND entry.source_type = 'INVENTORY_RECEIPT'
              AND CAST(entry.source_id AS UNSIGNED) = receipt.id AND entry.status = 'POSTED'
            WHERE receipt.company_id = ? AND receipt.status = 'REVERSED' AND receipt.reversed_at >= ? AND receipt.reversed_at < ?
            ORDER BY receipt.reversed_at, receipt.id
            """, companyId, java.sql.Timestamp.from(from.atStartOfDay(zone).toInstant()), java.sql.Timestamp.from(to.plusDays(1).atStartOfDay(zone).toInstant())));
        return reversals;
    }
    private static java.time.Instant databaseInstant(Object value) {
        return value instanceof java.sql.Timestamp timestamp ? timestamp.toInstant()
            : ((java.time.LocalDateTime) value).toInstant(java.time.ZoneOffset.UTC);
    }

}
