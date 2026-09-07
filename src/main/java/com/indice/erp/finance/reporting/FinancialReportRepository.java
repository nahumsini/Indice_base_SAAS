package com.indice.erp.finance.reporting;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import com.indice.erp.finance.reporting.FinancialReportingContracts.BusinessOption;
import com.indice.erp.finance.reporting.FinancialReportingContracts.OrganizationScope;
import com.indice.erp.finance.reporting.FinancialReportingContracts.UnitOption;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.stereotype.Repository;

@Repository
class FinancialReportRepository {

    private final JdbcTemplate jdbcTemplate;

    FinancialReportRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    Map<String, BigDecimal> periodTotals(
        long companyId,
        LocalDate from,
        LocalDate to,
        Long unitId,
        Long businessId
    ) {
        var values = new LinkedHashMap<String, BigDecimal>();
        String sql = """
            SELECT COALESCE(account.system_code, CONCAT('ACCOUNT:', account.id)) total_key,
                   account.account_type,
                   account.natural_balance,
                   COALESCE(SUM(line.debit_amount), 0) debits,
                   COALESCE(SUM(line.credit_amount), 0) credits
            FROM finance_journal_lines line
            JOIN finance_journal_entries entry
              ON entry.id = line.entry_id AND entry.company_id = line.company_id
            JOIN finance_accounting_accounts account
              ON account.id = line.account_id AND account.company_id = line.company_id
            WHERE line.company_id = ? AND entry.status = 'POSTED'
              AND entry.entry_date BETWEEN ? AND ?
            """ + dimensionSql(unitId, businessId) + """
            GROUP BY total_key, account.account_type, account.natural_balance
            """;
        var args = dimensionArgs(companyId, from, to, unitId, businessId);
        jdbcTemplate.query(sql, rs -> {
            BigDecimal debit = money(rs.getBigDecimal("debits"));
            BigDecimal credit = money(rs.getBigDecimal("credits"));
            String type = rs.getString("account_type");
            boolean creditNature = "CREDIT".equals(rs.getString("natural_balance"));
            BigDecimal natural = creditNature ? credit.subtract(debit) : debit.subtract(credit);
            BigDecimal typeSigned = naturalCredit(type) ? credit.subtract(debit) : debit.subtract(credit);
            values.put(rs.getString("total_key"), money(natural));
            values.merge("TYPE:" + type, money(typeSigned), BigDecimal::add);
        }, args);
        return values;
    }

    Map<String, BigDecimal> closingTotals(
        long companyId,
        LocalDate to,
        Long unitId,
        Long businessId
    ) {
        var values = new LinkedHashMap<String, BigDecimal>();
        String sql = """
            SELECT COALESCE(account.system_code, CONCAT('ACCOUNT:', account.id)) total_key,
                   account.account_type,
                   account.natural_balance,
                   COALESCE(SUM(line.debit_amount), 0) debits,
                   COALESCE(SUM(line.credit_amount), 0) credits
            FROM finance_journal_lines line
            JOIN finance_journal_entries entry
              ON entry.id = line.entry_id AND entry.company_id = line.company_id
            JOIN finance_accounting_accounts account
              ON account.id = line.account_id AND account.company_id = line.company_id
            WHERE line.company_id = ? AND entry.status = 'POSTED' AND entry.entry_date <= ?
            """ + dimensionSql(unitId, businessId) + """
            GROUP BY total_key, account.account_type, account.natural_balance
            """;
        var args = dimensionArgs(companyId, to, unitId, businessId);
        jdbcTemplate.query(sql, rs -> {
            BigDecimal debit = money(rs.getBigDecimal("debits"));
            BigDecimal credit = money(rs.getBigDecimal("credits"));
            boolean creditNature = "CREDIT".equals(rs.getString("natural_balance"));
            BigDecimal natural = creditNature ? credit.subtract(debit) : debit.subtract(credit);
            String type = rs.getString("account_type");
            BigDecimal typeSigned = naturalCredit(type) ? credit.subtract(debit) : debit.subtract(credit);
            values.put(rs.getString("total_key"), money(natural));
            values.merge("TYPE:" + type, money(typeSigned), BigDecimal::add);
        }, args);
        return values;
    }

    List<TrialBalanceData> trialBalance(
        long companyId,
        LocalDate from,
        LocalDate to,
        Long unitId,
        Long businessId
    ) {
        String sql = """
            SELECT account.id, account.code, account.name, account.account_type, account.natural_balance,
                   COALESCE(SUM(CASE WHEN entry.entry_date BETWEEN ? AND ? THEN line.debit_amount ELSE 0 END), 0) debits,
                   COALESCE(SUM(CASE WHEN entry.entry_date BETWEEN ? AND ? THEN line.credit_amount ELSE 0 END), 0) credits,
                   COALESCE(SUM(CASE WHEN entry.entry_date <= ? THEN line.debit_amount ELSE 0 END), 0) closing_debits,
                   COALESCE(SUM(CASE WHEN entry.entry_date <= ? THEN line.credit_amount ELSE 0 END), 0) closing_credits,
                   COUNT(DISTINCT CASE WHEN entry.entry_date BETWEEN ? AND ? THEN entry.id END) journal_count
            FROM finance_accounting_accounts account
            LEFT JOIN finance_journal_lines line
              ON line.account_id = account.id AND line.company_id = account.company_id
            LEFT JOIN finance_journal_entries entry
              ON entry.id = line.entry_id AND entry.company_id = line.company_id AND entry.status = 'POSTED'
            WHERE account.company_id = ? AND account.deleted_at IS NULL
            """ + dimensionSql(unitId, businessId) + """
            GROUP BY account.id, account.code, account.name, account.account_type, account.natural_balance, account.sort_order
            HAVING debits <> 0 OR credits <> 0 OR closing_debits <> 0 OR closing_credits <> 0
            ORDER BY account.sort_order, account.code
            """;
        var args = new java.util.ArrayList<Object>();
        args.add(from);
        args.add(to);
        args.add(from);
        args.add(to);
        args.add(to);
        args.add(to);
        args.add(from);
        args.add(to);
        args.add(companyId);
        appendDimensions(args, unitId, businessId);
        return jdbcTemplate.query(sql, (rs, rowNum) -> {
            BigDecimal closingDebit = money(rs.getBigDecimal("closing_debits"));
            BigDecimal closingCredit = money(rs.getBigDecimal("closing_credits"));
            boolean creditNature = "CREDIT".equals(rs.getString("natural_balance"));
            return new TrialBalanceData(
                rs.getLong("id"), rs.getString("code"), rs.getString("name"),
                rs.getString("account_type"), money(rs.getBigDecimal("debits")),
                money(rs.getBigDecimal("credits")),
                money(creditNature ? closingCredit.subtract(closingDebit) : closingDebit.subtract(closingCredit)),
                rs.getInt("journal_count")
            );
        }, args.toArray());
    }

    Map<String, BigDecimal> cashChanges(
        long companyId,
        LocalDate from,
        LocalDate to,
        Long unitId,
        Long businessId
    ) {
        var values = new LinkedHashMap<String, BigDecimal>();
        String sql = """
            SELECT CASE
                     WHEN entry.journal_type = 'OPENING' THEN 'OPENING'
                     WHEN entry.source_type IN ('SALE', 'SALE_REVERSAL', 'RECEIVABLE_PAYMENT') THEN 'CUSTOMER_COLLECTIONS'
                     WHEN entry.source_type = 'PAYROLL_PAYMENT' OR EXISTS (
                       SELECT 1 FROM finance_expense_payments payment JOIN payroll_run_lines payroll_line
                         ON payroll_line.company_id = payment.company_id AND payroll_line.payable_expense_id = payment.expense_id
                       WHERE entry.source_type = 'EXPENSE_PAYMENT' AND payment.company_id = entry.company_id AND payment.id = entry.source_id
                     ) THEN 'PAYROLL_PAYMENT'
                     WHEN EXISTS (
                       SELECT 1 FROM finance_journal_lines counterpart
                       JOIN finance_accounting_accounts purpose ON purpose.id = counterpart.account_id AND purpose.company_id = counterpart.company_id
                       WHERE counterpart.company_id = entry.company_id AND counterpart.entry_id = entry.id
                         AND purpose.system_code IN ('LOANS_PAYABLE', 'CONTRIBUTED_CAPITAL')
                     ) THEN 'FINANCING'
                     WHEN EXISTS (
                       SELECT 1 FROM finance_expense_payments payment
                       JOIN finance_expenses expense ON expense.company_id = payment.company_id AND expense.id = payment.expense_id
                       JOIN finance_accounting_accounts purpose ON purpose.company_id = expense.company_id AND purpose.id = expense.accounting_account_id
                       WHERE entry.source_type = 'EXPENSE_PAYMENT' AND payment.company_id = entry.company_id
                         AND payment.id = entry.source_id AND purpose.statement_section = 'NON_CURRENT_ASSETS'
                     ) OR EXISTS (
                       SELECT 1 FROM finance_journal_lines counterpart
                       JOIN finance_accounting_accounts purpose ON purpose.id = counterpart.account_id AND purpose.company_id = counterpart.company_id
                       WHERE counterpart.company_id = entry.company_id AND counterpart.entry_id = entry.id
                         AND purpose.statement_section = 'NON_CURRENT_ASSETS'
                     ) THEN 'INVESTING'
                     WHEN entry.source_type = 'EXPENSE_PAYMENT' THEN 'EXPENSE_PAYMENT'
                     ELSE 'OTHER_OPERATING'
                   END cash_category,
                   COALESCE(SUM(line.debit_amount - line.credit_amount), 0) cash_change
            FROM finance_journal_lines line
            JOIN finance_journal_entries entry
              ON entry.id = line.entry_id AND entry.company_id = line.company_id
            JOIN finance_accounting_accounts account
              ON account.id = line.account_id AND account.company_id = line.company_id
            WHERE line.company_id = ? AND entry.status = 'POSTED'
              AND account.system_code = 'CASH' AND entry.entry_date BETWEEN ? AND ?
            """ + dimensionSql(unitId, businessId) + """
            GROUP BY cash_category
            """;
        jdbcTemplate.query(sql, (RowCallbackHandler) rs ->
                values.put(rs.getString("cash_category"), money(rs.getBigDecimal("cash_change"))),
            dimensionArgs(companyId, from, to, unitId, businessId));
        return values;
    }

    int countPostedEntries(long companyId, LocalDate from, LocalDate to, Long unitId, Long businessId) {
        String sql = """
            SELECT COUNT(DISTINCT entry.id)
            FROM finance_journal_entries entry
            JOIN finance_journal_lines line
              ON line.entry_id = entry.id AND line.company_id = entry.company_id
            WHERE entry.company_id = ? AND entry.status = 'POSTED' AND entry.entry_date BETWEEN ? AND ?
            """ + dimensionSql(unitId, businessId);
        Integer value = jdbcTemplate.queryForObject(sql, Integer.class,
            dimensionArgs(companyId, from, to, unitId, businessId));
        return value == null ? 0 : value;
    }

    int countUnbalancedEntries(long companyId, LocalDate from, LocalDate to) {
        Integer value = jdbcTemplate.queryForObject("""
            SELECT COUNT(*) FROM (
              SELECT entry.id
              FROM finance_journal_entries entry
              JOIN finance_journal_lines line
                ON line.entry_id = entry.id AND line.company_id = entry.company_id
              WHERE entry.company_id = ? AND entry.status = 'POSTED'
                AND entry.entry_date BETWEEN ? AND ?
              GROUP BY entry.id
              HAVING ABS(SUM(line.debit_amount) - SUM(line.credit_amount)) > 0.0001
            ) imbalance
            """, Integer.class, companyId, from, to);
        return value == null ? 0 : value;
    }

    int countPostedSource(long companyId, String module, LocalDate from, LocalDate to) {
        Integer value = jdbcTemplate.queryForObject("""
            SELECT COUNT(*)
            FROM finance_journal_entries
            WHERE company_id = ? AND source_module = ? AND status = 'POSTED'
              AND entry_date BETWEEN ? AND ?
            """, Integer.class, companyId, module, from, to);
        return value == null ? 0 : value;
    }

    Optional<String> periodStatus(long companyId, String periodKey) {
        return jdbcTemplate.query("""
            SELECT status FROM finance_accounting_periods WHERE company_id = ? AND period_key = ?
            """, (rs, rowNum) -> rs.getString("status"), companyId, periodKey).stream().findFirst();
    }

    int scopeCount(String table, long companyId, long id, Long unitId) {
        if (!"units".equals(table) && !"businesses".equals(table)) {
            throw new IllegalArgumentException("Unsupported accounting scope table.");
        }
        String sql = "SELECT COUNT(*) FROM " + table + " WHERE company_id = ? AND id = ?";
        Object[] args;
        if ("businesses".equals(table) && unitId != null) {
            sql += " AND unit_id = ?";
            args = new Object[] { companyId, id, unitId };
        } else {
            args = new Object[] { companyId, id };
        }
        Integer value = jdbcTemplate.queryForObject(sql, Integer.class, args);
        return value == null ? 0 : value;
    }

    OrganizationScope organizationScope(long companyId) {
        var businesses = new LinkedHashMap<Long, java.util.ArrayList<BusinessOption>>();
        jdbcTemplate.query("""
            SELECT id, unit_id, name FROM businesses
            WHERE company_id = ? AND (status = 'active' OR status IS NULL OR status = '')
            ORDER BY name, id
            """, (RowCallbackHandler) rs -> businesses
                .computeIfAbsent(rs.getLong("unit_id"), ignored -> new java.util.ArrayList<>())
                .add(new BusinessOption(rs.getLong("id"), rs.getString("name"))), companyId);
        var units = jdbcTemplate.query("""
            SELECT id, name FROM units
            WHERE company_id = ? AND (status = 'active' OR status IS NULL OR status = '')
            ORDER BY name, id
            """, (rs, rowNum) -> new UnitOption(rs.getLong("id"), rs.getString("name"),
                List.copyOf(businesses.getOrDefault(rs.getLong("id"), new java.util.ArrayList<>()))), companyId);
        return new OrganizationScope(units);
    }

    OrganizationScope organizationScope(long companyId, Long unitId, Long businessId) {
        var all = organizationScope(companyId);
        if (unitId == null && businessId == null) return all;
        return new OrganizationScope(all.units().stream().filter(unit -> unitId == null || unitId.equals(unit.id()))
            .map(unit -> new UnitOption(unit.id(), unit.name(), unit.businesses().stream()
                .filter(business -> businessId == null || businessId.equals(business.id())).toList()))
            .filter(unit -> businessId == null || !unit.businesses().isEmpty()).toList());
    }

    private static String dimensionSql(Long unitId, Long businessId) {
        StringBuilder sql = new StringBuilder();
        if (unitId != null) {
            sql.append(" AND line.unit_id = ?");
        }
        if (businessId != null) {
            sql.append(" AND line.business_id = ?");
        }
        return sql.toString();
    }

    private static Object[] dimensionArgs(Object first, Object second, Long unitId, Long businessId) {
        var args = new java.util.ArrayList<>();
        args.add(first);
        args.add(second);
        appendDimensions(args, unitId, businessId);
        return args.toArray();
    }

    private static Object[] dimensionArgs(Object first, Object second, Object third, Long unitId, Long businessId) {
        var args = new java.util.ArrayList<>();
        args.add(first);
        args.add(second);
        args.add(third);
        appendDimensions(args, unitId, businessId);
        return args.toArray();
    }

    private static void appendDimensions(List<Object> args, Long unitId, Long businessId) {
        if (unitId != null) {
            args.add(unitId);
        }
        if (businessId != null) {
            args.add(businessId);
        }
    }

    private static boolean naturalCredit(String accountType) {
        return "LIABILITY".equals(accountType) || "EQUITY".equals(accountType)
            || "REVENUE".equals(accountType) || "OCI".equals(accountType);
    }

    private static BigDecimal money(BigDecimal value) {
        return value == null ? BigDecimal.ZERO.setScale(4) : value.setScale(4, java.math.RoundingMode.HALF_UP);
    }

    record TrialBalanceData(
        long accountId,
        String accountCode,
        String accountName,
        String accountType,
        BigDecimal debit,
        BigDecimal credit,
        BigDecimal balance,
        int journalCount
    ) {
    }
}
