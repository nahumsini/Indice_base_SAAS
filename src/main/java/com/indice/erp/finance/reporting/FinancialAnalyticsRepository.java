package com.indice.erp.finance.reporting;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.stereotype.Repository;

@Repository
class FinancialAnalyticsRepository {

    private final JdbcTemplate jdbcTemplate;

    FinancialAnalyticsRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    Map<String, BigDecimal> closingSectionTotals(
        long companyId,
        LocalDate to,
        Long unitId,
        Long businessId
    ) {
        var values = new LinkedHashMap<String, BigDecimal>();
        String sql = """
            SELECT account.statement_section,
                   COALESCE(SUM(CASE WHEN account.natural_balance = 'CREDIT'
                     THEN line.credit_amount - line.debit_amount
                     ELSE line.debit_amount - line.credit_amount END), 0) amount
            FROM finance_journal_lines line
            JOIN finance_journal_entries entry
              ON entry.id = line.entry_id AND entry.company_id = line.company_id
            JOIN finance_accounting_accounts account
              ON account.id = line.account_id AND account.company_id = line.company_id
            WHERE line.company_id = ? AND entry.status = 'POSTED' AND entry.entry_date <= ?
              AND account.statement_section IS NOT NULL
            """ + dimensionSql(unitId, businessId) + """
            GROUP BY account.statement_section
            """;
        jdbcTemplate.query(sql, (RowCallbackHandler) rs ->
            values.put(rs.getString("statement_section"), money(rs.getBigDecimal("amount"))),
            dimensionArgs(companyId, to, unitId, businessId));
        return values;
    }

    List<MonthlyTotalsData> monthlyPeriodTotals(
        long companyId,
        LocalDate from,
        LocalDate to,
        Long unitId,
        Long businessId
    ) {
        var values = new LinkedHashMap<String, LinkedHashMap<String, BigDecimal>>();
        String sql = """
            SELECT DATE_FORMAT(entry.entry_date, '%Y-%m') period_key,
                   COALESCE(account.system_code, CONCAT('ACCOUNT:', account.id)) total_key,
                   account.account_type,
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
            GROUP BY period_key, total_key, account.account_type
            ORDER BY period_key
            """;
        jdbcTemplate.query(sql, (RowCallbackHandler) rs -> {
            String periodKey = rs.getString("period_key");
            var totals = values.computeIfAbsent(periodKey, ignored -> new LinkedHashMap<>());
            BigDecimal debit = money(rs.getBigDecimal("debits"));
            BigDecimal credit = money(rs.getBigDecimal("credits"));
            String accountType = rs.getString("account_type");
            BigDecimal signed = naturalCredit(accountType) ? credit.subtract(debit) : debit.subtract(credit);
            totals.put(rs.getString("total_key"), money(signed));
            totals.merge("TYPE:" + accountType, money(signed), BigDecimal::add);
        }, dimensionArgs(companyId, from, to, unitId, businessId));
        return values.entrySet().stream()
            .map(entry -> new MonthlyTotalsData(entry.getKey(), Map.copyOf(entry.getValue())))
            .toList();
    }

    List<OrganizationTotalsData> organizationPeriodTotals(
        long companyId,
        LocalDate from,
        LocalDate to,
        Long unitId,
        Long businessId
    ) {
        var names = new LinkedHashMap<Long, String>();
        var values = new LinkedHashMap<Long, LinkedHashMap<String, BigDecimal>>();
        String sql = """
            SELECT unit.id unit_id, unit.name unit_name,
                   COALESCE(account.system_code, CONCAT('ACCOUNT:', account.id)) total_key,
                   account.account_type,
                   COALESCE(SUM(line.debit_amount), 0) debits,
                   COALESCE(SUM(line.credit_amount), 0) credits
            FROM finance_journal_lines line
            JOIN finance_journal_entries entry
              ON entry.id = line.entry_id AND entry.company_id = line.company_id
            JOIN finance_accounting_accounts account
              ON account.id = line.account_id AND account.company_id = line.company_id
            JOIN units unit ON unit.id = line.unit_id AND unit.company_id = line.company_id
            WHERE line.company_id = ? AND entry.status = 'POSTED'
              AND entry.entry_date BETWEEN ? AND ?
            """ + dimensionSql(unitId, businessId) + """
            GROUP BY unit.id, unit.name, total_key, account.account_type
            ORDER BY unit.name, unit.id
            """;
        jdbcTemplate.query(sql, (RowCallbackHandler) rs -> {
            long id = rs.getLong("unit_id");
            names.put(id, rs.getString("unit_name"));
            var totals = values.computeIfAbsent(id, ignored -> new LinkedHashMap<>());
            BigDecimal debit = money(rs.getBigDecimal("debits"));
            BigDecimal credit = money(rs.getBigDecimal("credits"));
            String accountType = rs.getString("account_type");
            BigDecimal signed = naturalCredit(accountType) ? credit.subtract(debit) : debit.subtract(credit);
            totals.put(rs.getString("total_key"), money(signed));
            totals.merge("TYPE:" + accountType, money(signed), BigDecimal::add);
        }, dimensionArgs(companyId, from, to, unitId, businessId));
        return values.entrySet().stream()
            .map(entry -> new OrganizationTotalsData(entry.getKey(), names.get(entry.getKey()), Map.copyOf(entry.getValue())))
            .toList();
    }

    DrilldownResult drilldown(
        long companyId,
        LocalDate from,
        LocalDate to,
        Long unitId,
        Long businessId,
        DrilldownFilter filter,
        int page,
        int pageSize,
        String sortBy,
        String sortDirection
    ) {
        var query = drilldownQuery(companyId, from, to, unitId, businessId, filter);
        SummaryData summary = jdbcTemplate.queryForObject("""
            SELECT COALESCE(SUM(line.debit_amount), 0) debit,
                   COALESCE(SUM(line.credit_amount), 0) credit,
                   COALESCE(SUM(CASE WHEN account.natural_balance = 'CREDIT'
                     THEN line.credit_amount - line.debit_amount
                     ELSE line.debit_amount - line.credit_amount END), 0) net_amount,
                   COUNT(DISTINCT entry.id) journal_count,
                   COUNT(DISTINCT account.id) account_count,
                   COUNT(*) row_count
            """ + query.fromAndWhere(), (rs, rowNum) -> new SummaryData(
                money(rs.getBigDecimal("debit")), money(rs.getBigDecimal("credit")),
                money(rs.getBigDecimal("net_amount")), rs.getInt("journal_count"),
                rs.getInt("account_count"), rs.getLong("row_count")), query.args().toArray());

        String orderColumn = switch (sortBy) {
            case "entryNumber" -> "entry.entry_number";
            case "accountCode" -> "account.code";
            case "debit" -> "line.debit_amount";
            case "credit" -> "line.credit_amount";
            default -> "entry.entry_date";
        };
        String direction = "asc".equalsIgnoreCase(sortDirection) ? "ASC" : "DESC";
        var args = new ArrayList<>(query.args());
        args.add(pageSize);
        args.add(page * pageSize);
        List<DrilldownData> rows = jdbcTemplate.query("""
            SELECT line.id line_id, entry.id entry_id, entry.entry_number, entry.entry_date,
                   entry.description entry_description, entry.source_module, entry.source_type,
                   entry.source_id, account.id account_id, account.code account_code,
                   account.name account_name, account.natural_balance,
                   line.debit_amount, line.credit_amount, line.unit_id, unit.name unit_name,
                   line.business_id, business.name business_name, line.source_document_reference
            """ + query.fromAndWhere() + " ORDER BY " + orderColumn + " " + direction
                + ", entry.id DESC, line.line_number ASC LIMIT ? OFFSET ?",
            (rs, rowNum) -> {
                BigDecimal debit = money(rs.getBigDecimal("debit_amount"));
                BigDecimal credit = money(rs.getBigDecimal("credit_amount"));
                BigDecimal net = "CREDIT".equals(rs.getString("natural_balance"))
                    ? credit.subtract(debit) : debit.subtract(credit);
                return new DrilldownData(
                    rs.getLong("line_id"), rs.getLong("entry_id"), rs.getString("entry_number"),
                    rs.getObject("entry_date", LocalDate.class), rs.getString("entry_description"),
                    rs.getString("source_module"), rs.getString("source_type"), rs.getString("source_id"),
                    rs.getLong("account_id"), rs.getString("account_code"), rs.getString("account_name"),
                    debit, credit, money(net), nullableLong(rs.getObject("unit_id")), rs.getString("unit_name"),
                    nullableLong(rs.getObject("business_id")), rs.getString("business_name"),
                    rs.getString("source_document_reference"));
            }, args.toArray());
        return new DrilldownResult(summary, rows);
    }

    private static DrilldownQuery drilldownQuery(
        long companyId,
        LocalDate from,
        LocalDate to,
        Long unitId,
        Long businessId,
        DrilldownFilter filter
    ) {
        StringBuilder sql = new StringBuilder("""
            FROM finance_journal_lines line
            JOIN finance_journal_entries entry
              ON entry.id = line.entry_id AND entry.company_id = line.company_id
            JOIN finance_accounting_accounts account
              ON account.id = line.account_id AND account.company_id = line.company_id
            LEFT JOIN units unit ON unit.id = line.unit_id AND unit.company_id = line.company_id
            LEFT JOIN businesses business ON business.id = line.business_id AND business.company_id = line.company_id
            WHERE line.company_id = ? AND entry.status = 'POSTED' AND entry.entry_date BETWEEN ? AND ?
            """);
        var args = new ArrayList<Object>(List.of(companyId, from, to));
        if (unitId != null) {
            sql.append(" AND line.unit_id = ?");
            args.add(unitId);
        }
        if (businessId != null) {
            sql.append(" AND line.business_id = ?");
            args.add(businessId);
        }
        if (filter.accountId() != null) {
            sql.append(" AND account.id = ?");
            args.add(filter.accountId());
        } else {
            var clauses = new ArrayList<String>();
            if (!filter.systemCodes().isEmpty()) {
                clauses.add("account.system_code IN (" + placeholders(filter.systemCodes().size()) + ")");
                args.addAll(filter.systemCodes());
            }
            if (!filter.accountTypes().isEmpty()) {
                clauses.add("account.account_type IN (" + placeholders(filter.accountTypes().size()) + ")");
                args.addAll(filter.accountTypes());
            }
            sql.append(" AND (").append(String.join(" OR ", clauses)).append(")");
        }
        return new DrilldownQuery(sql.toString(), args);
    }

    private static String placeholders(int count) {
        return String.join(",", java.util.Collections.nCopies(count, "?"));
    }

    private static String dimensionSql(Long unitId, Long businessId) {
        return (unitId == null ? "" : " AND line.unit_id = ?")
            + (businessId == null ? "" : " AND line.business_id = ?");
    }

    private static Object[] dimensionArgs(Object first, Object second, Long unitId, Long businessId) {
        var args = new ArrayList<>();
        args.add(first);
        args.add(second);
        appendDimensions(args, unitId, businessId);
        return args.toArray();
    }

    private static Object[] dimensionArgs(Object first, Object second, Object third, Long unitId, Long businessId) {
        var args = new ArrayList<>();
        args.add(first);
        args.add(second);
        args.add(third);
        appendDimensions(args, unitId, businessId);
        return args.toArray();
    }

    private static void appendDimensions(List<Object> args, Long unitId, Long businessId) {
        if (unitId != null) args.add(unitId);
        if (businessId != null) args.add(businessId);
    }

    private static boolean naturalCredit(String accountType) {
        return "LIABILITY".equals(accountType) || "EQUITY".equals(accountType)
            || "REVENUE".equals(accountType) || "OCI".equals(accountType);
    }

    private static Long nullableLong(Object value) {
        return value == null ? null : ((Number) value).longValue();
    }

    private static BigDecimal money(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(4, RoundingMode.HALF_UP);
    }

    record MonthlyTotalsData(String periodKey, Map<String, BigDecimal> totals) {
    }

    record OrganizationTotalsData(long unitId, String unitName, Map<String, BigDecimal> totals) {
    }

    record DrilldownFilter(Long accountId, List<String> systemCodes, List<String> accountTypes, String label) {
    }

    record DrilldownQuery(String fromAndWhere, List<Object> args) {
    }

    record SummaryData(
        BigDecimal debit,
        BigDecimal credit,
        BigDecimal netAmount,
        int journalCount,
        int accountCount,
        long rowCount
    ) {
    }

    record DrilldownData(
        long lineId,
        long journalEntryId,
        String entryNumber,
        LocalDate entryDate,
        String entryDescription,
        String sourceModule,
        String sourceType,
        String sourceId,
        long accountId,
        String accountCode,
        String accountName,
        BigDecimal debit,
        BigDecimal credit,
        BigDecimal netAmount,
        Long unitId,
        String unitName,
        Long businessId,
        String businessName,
        String sourceDocumentReference
    ) {
    }

    record DrilldownResult(SummaryData summary, List<DrilldownData> rows) {
    }
}
