package com.indice.erp.finance.reporting;

import com.indice.erp.finance.reporting.AccountingPostingModels.PostingCandidate;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

@Repository
class FinancialLedgerRepository {

    private final JdbcTemplate jdbcTemplate;

    FinancialLedgerRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    Optional<AccountingSettings> findSettings(long companyId) {
        return jdbcTemplate.query("""
            SELECT reporting_framework, framework_effective_date, functional_currency,
                   presentation_currency, fiscal_year_start_month
            FROM finance_accounting_settings
            WHERE company_id = ?
            """, (rs, rowNum) -> new AccountingSettings(
                rs.getString("reporting_framework"),
                rs.getObject("framework_effective_date", LocalDate.class),
                rs.getString("functional_currency"),
                rs.getString("presentation_currency"),
                rs.getInt("fiscal_year_start_month")
            ), companyId).stream().findFirst();
    }

    void ensureSettings(long companyId, long userId) {
        jdbcTemplate.update("""
            INSERT INTO finance_accounting_settings
              (company_id, reporting_framework, framework_effective_date, functional_currency,
               presentation_currency, created_by_user_id, updated_by_user_id)
            SELECT company.id, 'IFRS_SMES_2015', '2017-01-01',
                   UPPER(COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(settings.settings_json,
                     '$.config_center.empresa_template.currency')), ''), 'MXN')),
                   UPPER(COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(settings.settings_json,
                     '$.config_center.empresa_template.currency')), ''), 'MXN')),
                   ?, ?
            FROM companies company
            LEFT JOIN company_settings settings ON settings.company_id = company.id
            WHERE company.id = ?
            ON DUPLICATE KEY UPDATE company_id = VALUES(company_id)
            """, userId, userId, companyId);
    }

    void ensureStandardAccounts(long companyId, long userId) {
        for (var account : STANDARD_ACCOUNTS) {
            jdbcTemplate.update("""
                INSERT IGNORE INTO finance_accounting_accounts
                  (company_id, code, system_code, name, group_key, description, account_type,
                   natural_balance, is_postable, statement_section, statement_line_code,
                   sort_order, status, created_by_user_id, updated_by_user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?, ?, ?, 'ACTIVE', ?, ?)
                """, companyId, account.code(), account.systemCode(), account.name(), account.groupKey(),
                account.description(), account.accountType(), account.naturalBalance(),
                account.statementSection(), account.statementLineCode(), account.sortOrder(), userId, userId);
        }
    }

    long startSyncRun(long companyId, long userId, LocalDate from, LocalDate to) {
        var keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement("""
                INSERT INTO finance_accounting_sync_runs
                  (company_id, requested_from, requested_to, status, initiated_by_user_id)
                VALUES (?, ?, ?, 'RUNNING', ?)
                """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, companyId);
            statement.setDate(2, Date.valueOf(from));
            statement.setDate(3, Date.valueOf(to));
            statement.setLong(4, userId);
            return statement;
        }, keyHolder);
        return requiredKey(keyHolder);
    }

    void completeSyncRun(
        long companyId,
        long syncRunId,
        String status,
        int discovered,
        int posted,
        int skipped,
        int blocked,
        String issuesJson
    ) {
        int updated = jdbcTemplate.update("""
            UPDATE finance_accounting_sync_runs
            SET status = ?, discovered_count = ?, posted_count = ?, skipped_count = ?,
                blocked_count = ?, issues_json = CAST(? AS JSON), completed_at = CURRENT_TIMESTAMP
            WHERE company_id = ? AND id = ? AND status = 'RUNNING'
            """, status, discovered, posted, skipped, blocked, issuesJson, companyId, syncRunId);
        if (updated != 1) {
            throw new IllegalStateException("Accounting sync run could not be completed.");
        }
    }

    Optional<ExistingEntry> findEntry(long companyId, String sourceEventKey) {
        return jdbcTemplate.query("""
            SELECT id, source_fingerprint, status
            FROM finance_journal_entries
            WHERE company_id = ? AND source_event_key = ?
            """, (rs, rowNum) -> new ExistingEntry(
                rs.getLong("id"), rs.getString("source_fingerprint"), rs.getString("status")
            ), companyId, sourceEventKey).stream().findFirst();
    }

    List<AccountingPostingModels.DiscoveryIssue> missingPostedSources(
            long companyId, LocalDate from, LocalDate to, AccountingPostingModels.Discovery discovery) {
        var discoveredKeys = new java.util.HashSet<String>();
        discovery.candidates().forEach(candidate -> discoveredKeys.add(candidate.sourceEventKey()));
        discovery.issues().forEach(issue -> discoveredKeys.add(
            issue.sourceModule() + ":" + issue.sourceType() + ":" + issue.sourceId()));
        return jdbcTemplate.query("""
            SELECT entry.source_event_key, entry.source_module, entry.source_type, entry.source_id
            FROM finance_journal_entries entry
            WHERE entry.company_id = ? AND entry.status = 'POSTED'
              AND entry.entry_date BETWEEN ? AND ?
              AND entry.source_type IN ('SALE', 'CREDIT_SALE', 'EXPENSE', 'EXPENSE_PAYMENT', 'RECEIVABLE_PAYMENT', 'INVENTORY_RECEIPT',
                                        'PAYROLL_ACCRUAL', 'PAYROLL_PAYMENT')
              AND NOT EXISTS (
                SELECT 1 FROM finance_journal_entries reversal
                WHERE reversal.company_id = entry.company_id AND reversal.reversal_of_entry_id = entry.id
                  AND reversal.status = 'POSTED'
              )
            """, (rs, index) -> discoveredKeys.contains(rs.getString("source_event_key")) ? null
                : new AccountingPostingModels.DiscoveryIssue("SOURCE_NO_LONGER_ELIGIBLE", "BLOCKING",
                    rs.getString("source_module"), rs.getString("source_type"), rs.getString("source_id"),
                    "Una operación contabilizada fue cancelada, retirada o cambió de período.",
                    "Registra una reversión vinculada antes de usar el informe o cerrar el período."),
                companyId, from, to).stream().filter(java.util.Objects::nonNull).toList();
    }

    PostResult post(long companyId, long userId, AccountingSettings settings, PostingCandidate candidate) {
        BigDecimal debits = candidate.lines().stream()
            .map(AccountingPostingModels.PostingLine::debit)
            .reduce(BigDecimal.ZERO, BigDecimal::add)
            .setScale(4, RoundingMode.HALF_UP);
        BigDecimal credits = candidate.lines().stream()
            .map(AccountingPostingModels.PostingLine::credit)
            .reduce(BigDecimal.ZERO, BigDecimal::add)
            .setScale(4, RoundingMode.HALF_UP);
        if (debits.signum() <= 0 || debits.compareTo(credits) != 0) {
            throw new IllegalArgumentException("Journal candidate is not balanced: " + candidate.sourceEventKey());
        }

        long periodId = ensureOpenPeriod(companyId, settings, candidate.entryDate());
        var entryKey = new GeneratedKeyHolder();
        String entryNumber = "GL-" + candidate.entryDate().toString().replace("-", "") + "-"
            + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
        try {
            jdbcTemplate.update(connection -> {
                PreparedStatement statement = connection.prepareStatement("""
                    INSERT INTO finance_journal_entries
                      (company_id, period_id, entry_number, entry_date, journal_type, status,
                       description, source_module, source_type, source_id, source_event_key,
                       source_fingerprint, currency_code, exchange_rate, exchange_rate_evidence_json,
                       created_by_user_id, posted_by_user_id, posted_at)
                    VALUES (?, ?, ?, ?, ?, 'POSTED', ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?, ?, CURRENT_TIMESTAMP)
                    """, Statement.RETURN_GENERATED_KEYS);
                int index = 1;
                statement.setLong(index++, companyId);
                statement.setLong(index++, periodId);
                statement.setString(index++, entryNumber);
                statement.setDate(index++, Date.valueOf(candidate.entryDate()));
                statement.setString(index++, candidate.journalType());
                statement.setString(index++, candidate.description());
                statement.setString(index++, candidate.sourceModule());
                statement.setString(index++, candidate.sourceType());
                statement.setString(index++, candidate.sourceId());
                statement.setString(index++, candidate.sourceEventKey());
                statement.setString(index++, candidate.sourceFingerprint());
                statement.setString(index++, candidate.currency());
                statement.setBigDecimal(index++, candidate.exchangeRate());
                statement.setString(index++, candidate.exchangeRateEvidenceJson());
                statement.setLong(index++, userId);
                statement.setLong(index, userId);
                return statement;
            }, entryKey);
        } catch (DuplicateKeyException duplicate) {
            return PostResult.ALREADY_POSTED;
        }

        long entryId = requiredKey(entryKey);
        int lineNumber = 0;
        for (var line : candidate.lines()) {
            long accountId = resolveAccount(companyId, line.explicitAccountId(), line.systemAccountCode());
            validateDimension(companyId, "units", line.unitId());
            validateDimension(companyId, "businesses", line.businessId());
            BigDecimal amount = line.debit().signum() > 0 ? line.debit() : line.credit();
            jdbcTemplate.update("""
                INSERT INTO finance_journal_lines
                  (company_id, entry_id, account_id, line_number, unit_id, business_id,
                   description, debit_amount, credit_amount, transaction_amount,
                   transaction_currency, functional_amount, functional_currency, exchange_rate,
                   source_document_reference)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, companyId, entryId, accountId, ++lineNumber, line.unitId(), line.businessId(),
                line.description(), line.debit(), line.credit(), line.transactionAmount(),
                line.transactionCurrency() == null ? candidate.currency() : line.transactionCurrency(), amount,
                settings.functionalCurrency(), line.exchangeRate(), line.documentReference());
        }
        return PostResult.POSTED;
    }

    void closePeriod(long companyId, long userId, String periodKey) {
        int updated = jdbcTemplate.update("""
            UPDATE finance_accounting_periods
            SET status = 'CLOSED', closed_by_user_id = ?, closed_at = CURRENT_TIMESTAMP,
                reopened_by_user_id = NULL, reopened_at = NULL, reopen_reason = NULL,
                version = version + 1
            WHERE company_id = ? AND period_key = ? AND status IN ('OPEN', 'REVIEW')
            """, userId, companyId, periodKey);
        if (updated != 1) {
            throw new IllegalStateException("Accounting period is unavailable or already closed.");
        }
    }

    void lockOpenPeriodForClose(long companyId, String periodKey) {
        String status = jdbcTemplate.query("""
            SELECT status
            FROM finance_accounting_periods
            WHERE company_id = ? AND period_key = ?
            FOR UPDATE
            """, (rs, rowNum) -> rs.getString("status"), companyId, periodKey).stream().findFirst()
            .orElseThrow(() -> new IllegalStateException("Accounting period is unavailable."));
        if (!"OPEN".equals(status) && !"REVIEW".equals(status)) {
            throw new IllegalStateException("Only an open accounting period can be closed.");
        }
    }

    void reopenPeriod(long companyId, long userId, String periodKey, String reason) {
        int updated = jdbcTemplate.update("""
            UPDATE finance_accounting_periods
            SET status = 'OPEN', reopened_by_user_id = ?, reopened_at = CURRENT_TIMESTAMP,
                reopen_reason = ?, version = version + 1
            WHERE company_id = ? AND period_key = ? AND status = 'CLOSED'
            """, userId, reason, companyId, periodKey);
        if (updated != 1) {
            throw new IllegalStateException("Only a closed accounting period can be reopened.");
        }
    }

    private long ensureOpenPeriod(long companyId, AccountingSettings settings, LocalDate date) {
        YearMonth month = YearMonth.from(date);
        String periodKey = month.toString();
        jdbcTemplate.update("""
            INSERT INTO finance_accounting_periods
              (company_id, period_key, period_start, period_end, status,
               framework_snapshot, functional_currency_snapshot)
            VALUES (?, ?, ?, ?, 'OPEN', ?, ?)
            ON DUPLICATE KEY UPDATE period_key = VALUES(period_key)
            """, companyId, periodKey, month.atDay(1), month.atEndOfMonth(),
            settings.reportingFramework(), settings.functionalCurrency());
        return jdbcTemplate.query("""
            SELECT id
            FROM finance_accounting_periods
            WHERE company_id = ? AND period_key = ? AND status <> 'CLOSED'
            FOR UPDATE
            """, (rs, rowNum) -> rs.getLong("id"), companyId, periodKey).stream().findFirst()
            .orElseThrow(() -> new IllegalStateException("Accounting period " + periodKey + " is closed."));
    }

    private long resolveAccount(long companyId, Long explicitId, String systemCode) {
        if (explicitId != null) {
            return jdbcTemplate.query("""
                SELECT id FROM finance_accounting_accounts
                WHERE company_id = ? AND id = ? AND deleted_at IS NULL
                  AND status = 'ACTIVE' AND is_postable = TRUE
                """, (rs, rowNum) -> rs.getLong("id"), companyId, explicitId).stream().findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Accounting account is unavailable."));
        }
        return jdbcTemplate.query("""
            SELECT id FROM finance_accounting_accounts
            WHERE company_id = ? AND system_code = ? AND deleted_at IS NULL
              AND status = 'ACTIVE' AND is_postable = TRUE
            """, (rs, rowNum) -> rs.getLong("id"), companyId, systemCode).stream().findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Missing system account: " + systemCode));
    }

    private void validateDimension(long companyId, String table, Long id) {
        if (id == null) {
            return;
        }
        String sql = "SELECT COUNT(*) FROM " + table + " WHERE company_id = ? AND id = ?";
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, companyId, id);
        if (count == null || count != 1) {
            throw new IllegalArgumentException("Accounting dimension is outside the authenticated company.");
        }
    }

    private static long requiredKey(GeneratedKeyHolder keyHolder) {
        Number key = keyHolder.getKey();
        if (key == null) {
            throw new IllegalStateException("Database did not return a generated key.");
        }
        return key.longValue();
    }

    enum PostResult {
        POSTED,
        ALREADY_POSTED
    }

    record ExistingEntry(long id, String fingerprint, String status) {
    }

    record AccountingSettings(
        String reportingFramework,
        LocalDate frameworkEffectiveDate,
        String functionalCurrency,
        String presentationCurrency,
        int fiscalYearStartMonth
    ) {
    }

    private record StandardAccount(
        String code,
        String systemCode,
        String name,
        String groupKey,
        String description,
        String accountType,
        String naturalBalance,
        String statementSection,
        String statementLineCode,
        int sortOrder
    ) {
    }

    private static final List<StandardAccount> STANDARD_ACCOUNTS = List.of(
        account("1000", "CASH", "Efectivo y equivalentes", "ASSET", "DEBIT", "CURRENT_ASSETS", "CASH_AND_EQUIVALENTS", 100),
        account("1100", "ACCOUNTS_RECEIVABLE", "Cuentas por cobrar", "ASSET", "DEBIT", "CURRENT_ASSETS", "TRADE_RECEIVABLES", 110),
        account("1200", "INVENTORY", "Inventarios", "ASSET", "DEBIT", "CURRENT_ASSETS", "INVENTORIES", 120),
        account("1300", "PREPAID_EXPENSES", "Pagos anticipados", "ASSET", "DEBIT", "CURRENT_ASSETS", "PREPAYMENTS", 130),
        account("1500", "PROPERTY_PLANT_EQUIPMENT", "Propiedad, planta y equipo", "ASSET", "DEBIT", "NON_CURRENT_ASSETS", "PROPERTY_PLANT_EQUIPMENT", 150),
        account("1590", "ACCUMULATED_DEPRECIATION", "Depreciación acumulada", "ASSET", "CREDIT", "NON_CURRENT_ASSETS", "ACCUMULATED_DEPRECIATION", 159),
        account("2000", "ACCOUNTS_PAYABLE", "Cuentas por pagar", "LIABILITY", "CREDIT", "CURRENT_LIABILITIES", "TRADE_PAYABLES", 200),
        account("2100", "PAYROLL_PAYABLE", "Nómina por pagar", "LIABILITY", "CREDIT", "CURRENT_LIABILITIES", "PAYROLL_PAYABLE", 210),
        account("2110", "PAYROLL_WITHHOLDINGS", "Retenciones y cargas de nómina", "LIABILITY", "CREDIT", "CURRENT_LIABILITIES", "PAYROLL_WITHHOLDINGS", 211),
        account("1400", "PURCHASE_TAX_PENDING", "Impuestos de compras pendientes de clasificación", "ASSET", "DEBIT", "CURRENT_ASSETS", "PURCHASE_TAX_PENDING", 140),
        account("2200", "TAXES_PAYABLE", "Impuestos por pagar", "LIABILITY", "CREDIT", "CURRENT_LIABILITIES", "TAXES_PAYABLE", 220),
        account("2300", "LOANS_PAYABLE", "Deuda financiera", "LIABILITY", "CREDIT", "NON_CURRENT_LIABILITIES", "BORROWINGS", 230),
        account("3000", "CONTRIBUTED_CAPITAL", "Capital aportado", "EQUITY", "CREDIT", "EQUITY", "CONTRIBUTED_CAPITAL", 300),
        account("3100", "RETAINED_EARNINGS", "Resultados acumulados", "EQUITY", "CREDIT", "EQUITY", "RETAINED_EARNINGS", 310),
        account("4000", "REVENUE", "Ingresos por actividades ordinarias", "REVENUE", "CREDIT", "OPERATING", "REVENUE", 400),
        account("4100", "OTHER_INCOME", "Otros ingresos", "REVENUE", "CREDIT", "OTHER", "OTHER_INCOME", 410),
        account("5000", "COST_OF_SALES", "Costo de ventas", "EXPENSE", "DEBIT", "OPERATING", "COST_OF_SALES", 500),
        account("6000", "OPERATING_EXPENSES", "Gastos operativos", "EXPENSE", "DEBIT", "OPERATING", "OPERATING_EXPENSES", 600),
        account("6100", "PAYROLL_EXPENSE", "Sueldos y salarios", "EXPENSE", "DEBIT", "OPERATING", "PAYROLL_EXPENSE", 610),
        account("6200", "EMPLOYER_CONTRIBUTIONS_EXPENSE", "Cargas patronales", "EXPENSE", "DEBIT", "OPERATING", "EMPLOYER_CONTRIBUTIONS", 620),
        account("6300", "DEPRECIATION_EXPENSE", "Depreciación del periodo", "EXPENSE", "DEBIT", "OPERATING", "DEPRECIATION", 630),
        account("7000", "FINANCE_EXPENSE", "Costos financieros", "EXPENSE", "DEBIT", "FINANCING", "FINANCE_EXPENSE", 700),
        account("7100", "REALIZED_EXCHANGE_LOSS", "Pérdida cambiaria realizada", "EXPENSE", "DEBIT", "FINANCING", "FINANCE_EXPENSE", 710),
        account("4200", "REALIZED_EXCHANGE_GAIN", "Ganancia cambiaria realizada", "REVENUE", "CREDIT", "OTHER", "OTHER_INCOME", 420),
        account("8000", "INCOME_TAX_EXPENSE", "Impuesto a las ganancias", "EXPENSE", "DEBIT", "TAX", "INCOME_TAX_EXPENSE", 800),
        account("9000", "OCI_FOREIGN_EXCHANGE", "Conversión en otro resultado integral", "OCI", "CREDIT", "OCI", "FOREIGN_EXCHANGE_OCI", 900)
    );

    private static StandardAccount account(
        String code,
        String systemCode,
        String name,
        String accountType,
        String naturalBalance,
        String section,
        String line,
        int order
    ) {
        String group = systemCode.startsWith("PAYROLL") || systemCode.contains("CONTRIBUTIONS") ? "PAYROLL" : "OTHER";
        return new StandardAccount(code, systemCode, name, group,
            "Cuenta de sistema del motor de estados financieros.", accountType, naturalBalance, section, line, order);
    }
}
