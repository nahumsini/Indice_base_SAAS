package com.indice.erp.kpis.executive;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ExecutiveKpiRepository {

    private final JdbcTemplate jdbcTemplate;

    public ExecutiveKpiRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public boolean scopeExists(ExecutiveKpiScope scope) {
        if (scope.unitId() != null) {
            var unitCount = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM units
                    WHERE id = ?
                      AND (company_id = ? OR company_id IS NULL)
                      AND LOWER(COALESCE(status, 'active')) IN ('active', 'activo')
                    """,
                    Integer.class,
                    scope.unitId(),
                    scope.companyId());
            if (unitCount == null || unitCount == 0) return false;
        }
        if (scope.businessId() != null) {
            var params = new ArrayList<Object>();
            params.add(scope.businessId());
            params.add(scope.companyId());
            var sql = new StringBuilder("""
                    SELECT COUNT(*)
                    FROM businesses
                    WHERE id = ?
                      AND (company_id = ? OR company_id IS NULL)
                      AND LOWER(COALESCE(status, 'active')) IN ('active', 'activo')
                    """);
            if (scope.unitId() != null) {
                sql.append(" AND unit_id = ?");
                params.add(scope.unitId());
            }
            var businessCount = jdbcTemplate.queryForObject(sql.toString(), Integer.class, params.toArray());
            if (businessCount == null || businessCount == 0) return false;
        }
        return true;
    }

    public List<Map<String, Object>> loadOrganizationRows(ExecutiveKpiScope scope) {
        var params = new ArrayList<Object>();
        params.add(scope.companyId());
        var sql = """
                SELECT unit.id AS unit_id,
                       unit.name AS unit_name,
                       business.id AS business_id,
                       business.name AS business_name
                FROM units unit
                LEFT JOIN businesses business ON business.unit_id = unit.id
                    AND (business.company_id = unit.company_id OR business.company_id IS NULL)
                    AND LOWER(COALESCE(business.status, 'active')) IN ('active', 'activo')
                WHERE (unit.company_id = ? OR unit.company_id IS NULL)
                  AND LOWER(COALESCE(unit.status, 'active')) IN ('active', 'activo')
                """;
        if (scope.unitId() != null) {
            sql += " AND unit.id = ?";
            params.add(scope.unitId());
        }
        if (scope.businessId() != null) {
            sql += " AND business.id = ?";
            params.add(scope.businessId());
        }
        if (!scope.search().isBlank()) {
            sql += " AND LOWER(CONCAT_WS(' ', unit.name, COALESCE(business.name, ''))) LIKE ?";
            params.add("%" + scope.search() + "%");
        }
        sql += " ORDER BY unit.name ASC, business.name ASC";
        return jdbcTemplate.query(sql, this::mapOrgIdentity, params.toArray());
    }

    public List<Map<String, Object>> loadSalesByOrg(ExecutiveKpiScope scope) {
        var filter = scopedFilter(scope, "sale", "sale_date");
        var sql = """
                SELECT sale.unit_id,
                       sale.business_id,
                       COUNT(*) AS sales_count,
                       SUM(COALESCE(sale.total_amount, 0)) AS sales_total,
                       SUM(COALESCE(sale.margin_total, 0)) AS sales_margin
                FROM sales_records sale
                WHERE sale.deleted_at IS NULL
                """ + filter.sql() + """
                GROUP BY sale.unit_id, sale.business_id
                """;
        return jdbcTemplate.query(sql, this::mapSalesRow, filter.params().toArray());
    }

    public List<Map<String, Object>> loadCollectionsByOrg(ExecutiveKpiScope scope) {
        var filter = scopedFilter(scope, "account", null);
        var params = new ArrayList<>(filter.params());
        params.add(scope.from().toString());
        params.add(scope.to().toString());
        var sql = """
                SELECT account.unit_id,
                       account.business_id,
                       SUM(COALESCE(payment.amount, 0)) AS collected_total
                FROM finance_receivable_payments payment
                JOIN finance_receivable_accounts account ON account.id = payment.receivable_id
                    AND account.company_id = payment.company_id
                    AND account.deleted_at IS NULL
                WHERE payment.company_id = ?
                """ + filter.withoutCompanySql() + """
                  AND payment.payment_date BETWEEN ? AND ?
                GROUP BY account.unit_id, account.business_id
                """;
        return jdbcTemplate.query(sql, this::mapCollectionsRow, params.toArray());
    }

    public List<Map<String, Object>> loadExpensesByOrg(ExecutiveKpiScope scope) {
        var filter = scopedFilter(scope, "expense", "expense_date");
        var sql = """
                SELECT expense.unit_id,
                       expense.business_id,
                       COUNT(*) AS expenses_count,
                       SUM(COALESCE(expense.total_amount, 0)) AS expenses_total,
                       SUM(CASE
                             WHEN expense.payment_status <> 'PAID'
                              AND expense.status NOT IN ('CANCELLED', 'REJECTED')
                             THEN COALESCE(expense.balance_amount, 0)
                             ELSE 0
                           END) AS payables_total,
                       SUM(CASE
                             WHEN expense.payment_status <> 'PAID'
                              AND expense.due_date IS NOT NULL
                              AND expense.due_date < CURRENT_DATE
                             THEN COALESCE(expense.balance_amount, 0)
                             ELSE 0
                           END) AS overdue_payables
                FROM finance_expenses expense
                WHERE expense.deleted_at IS NULL
                  AND expense.status NOT IN ('CANCELLED', 'REJECTED')
                """ + filter.sql() + """
                GROUP BY expense.unit_id, expense.business_id
                """;
        return jdbcTemplate.query(sql, this::mapExpensesRow, filter.params().toArray());
    }

    public List<Map<String, Object>> loadReceivablesByOrg(ExecutiveKpiScope scope) {
        var filter = scopedFilter(scope, "account", null);
        var sql = """
                SELECT account.unit_id,
                       account.business_id,
                       SUM(CASE WHEN account.status <> 'CANCELLED' THEN COALESCE(account.balance_amount, 0) ELSE 0 END) AS receivables_total,
                       SUM(CASE WHEN account.status = 'OVERDUE' OR account.due_date < CURRENT_DATE THEN COALESCE(account.balance_amount, 0) ELSE 0 END) AS overdue_receivables
                FROM finance_receivable_accounts account
                WHERE account.deleted_at IS NULL
                """ + filter.sql() + """
                GROUP BY account.unit_id, account.business_id
                """;
        return jdbcTemplate.query(sql, this::mapReceivablesRow, filter.params().toArray());
    }

    public List<Map<String, Object>> loadPettyCashByOrg(ExecutiveKpiScope scope) {
        var filter = scopedFilter(scope, "fund", null);
        var sql = """
                SELECT fund.unit_id,
                       fund.business_id,
                       COUNT(*) AS petty_cash_funds,
                       SUM(COALESCE(fund.current_balance_amount, 0)) AS petty_cash_balance,
                       SUM(CASE WHEN fund.status IN ('LOW_BALANCE', 'NEEDS_RECONCILIATION') THEN 1 ELSE 0 END) AS petty_cash_attention
                FROM finance_petty_cash_funds fund
                WHERE fund.deleted_at IS NULL
                  AND fund.status <> 'CLOSED'
                """ + filter.sql() + """
                GROUP BY fund.unit_id, fund.business_id
                """;
        return jdbcTemplate.query(sql, this::mapPettyCashRow, filter.params().toArray());
    }

    public List<Map<String, Object>> loadOperationsByOrg(ExecutiveKpiScope scope) {
        var filter = scopedFilter(scope, "task", "COALESCE(task.agenda_date, task.due_date)");
        var sql = """
                SELECT task.unit_id,
                       task.business_id,
                       COUNT(*) AS total_tasks,
                       SUM(CASE WHEN task.status IN ('completed', 'audited') THEN 1 ELSE 0 END) AS closed_tasks,
                       SUM(CASE
                             WHEN task.status NOT IN ('completed', 'audited', 'cancelled')
                              AND COALESCE(task.agenda_date, task.due_date) < CURRENT_DATE
                             THEN 1 ELSE 0
                           END) AS overdue_tasks,
                       ROUND(AVG(COALESCE(task.completion_percent, CASE WHEN task.status IN ('completed', 'audited') THEN 100 ELSE 0 END)), 0) AS average_completion
                FROM process_tasks task
                WHERE task.deleted_at IS NULL
                """ + filter.sql() + """
                GROUP BY task.unit_id, task.business_id
                """;
        return jdbcTemplate.query(sql, this::mapOperationsRow, filter.params().toArray());
    }

    public List<Map<String, Object>> loadAttendanceByOrg(ExecutiveKpiScope scope) {
        var filter = scopedFilter(scope, "hr_user", null);
        var params = new ArrayList<>(filter.params());
        params.add(scope.from().toString());
        params.add(scope.to().toString());
        var sql = """
                SELECT hr_user.unit_id,
                       hr_user.business_id,
                       COUNT(*) AS attendance_records,
                       SUM(CASE
                             WHEN LOWER(COALESCE(record.corrected_status, record.system_status, '')) IN ('absent', 'absence', 'falta')
                             THEN 1 ELSE 0
                           END) AS absences
                FROM user_attendance_daily_records record
                JOIN hr_users hr_user ON hr_user.user_company_id = record.user_company_id
                    AND hr_user.company_id = record.company_id
                WHERE record.company_id = ?
                """ + filter.withoutCompanySql() + """
                  AND record.attendance_date BETWEEN ? AND ?
                GROUP BY hr_user.unit_id, hr_user.business_id
                """;
        return jdbcTemplate.query(sql, this::mapAttendanceRow, params.toArray());
    }

    public List<Map<String, Object>> loadSalesBySource(ExecutiveKpiScope scope) {
        var filter = scopedFilter(scope, "sale", "sale_date");
        var sql = """
                SELECT source, COUNT(*) AS count, SUM(total_amount) AS total
                FROM (
                    SELECT COALESCE(credit_sale.source,
                             CASE WHEN sale.sale_number LIKE 'POS%%' THEN 'POS' ELSE 'SALES' END
                           ) AS source,
                           COALESCE(sale.total_amount, 0) AS total_amount
                    FROM sales_records sale
                    LEFT JOIN finance_credit_sales credit_sale ON credit_sale.sales_record_id = sale.id
                        AND credit_sale.company_id = sale.company_id
                        AND credit_sale.deleted_at IS NULL
                    WHERE sale.deleted_at IS NULL
                """ + filter.sql() + """
                ) source_rows
                GROUP BY source
                ORDER BY total DESC
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> Map.of(
                "source", rs.getString("source"),
                "count", intValue(rs, "count"),
                "total", doubleValue(rs, "total")), filter.params().toArray());
    }

    public List<Map<String, Object>> loadExpensesByAccount(ExecutiveKpiScope scope) {
        var filter = scopedFilter(scope, "expense", "expense_date");
        var sql = """
                SELECT COALESCE(account.name, 'Sin cuenta contable') AS account_name,
                       COUNT(*) AS count,
                       SUM(COALESCE(expense.total_amount, 0)) AS total
                FROM finance_expenses expense
                LEFT JOIN finance_accounting_accounts account ON account.id = expense.accounting_account_id
                    AND account.company_id = expense.company_id
                WHERE expense.deleted_at IS NULL
                  AND expense.status NOT IN ('CANCELLED', 'REJECTED')
                """ + filter.sql() + """
                GROUP BY account_name
                ORDER BY total DESC
                LIMIT 8
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> Map.of(
                "accountName", rs.getString("account_name"),
                "count", intValue(rs, "count"),
                "total", doubleValue(rs, "total")), filter.params().toArray());
    }

    public Map<String, Object> loadPettyCashSummary(ExecutiveKpiScope scope) {
        var filter = scopedFilter(scope, "fund", null);
        var sql = """
                SELECT COUNT(*) AS funds,
                       SUM(COALESCE(fund.limit_amount, 0)) AS limit_total,
                       SUM(COALESCE(fund.current_balance_amount, 0)) AS balance_total,
                       SUM(CASE WHEN fund.status IN ('LOW_BALANCE', 'NEEDS_RECONCILIATION') THEN 1 ELSE 0 END) AS attention
                FROM finance_petty_cash_funds fund
                WHERE fund.deleted_at IS NULL
                  AND fund.status <> 'CLOSED'
                """ + filter.sql();
        return jdbcTemplate.queryForObject(sql, (rs, rowNum) -> {
            var row = new LinkedHashMap<String, Object>();
            row.put("funds", intValue(rs, "funds"));
            row.put("limitTotal", doubleValue(rs, "limit_total"));
            row.put("balanceTotal", doubleValue(rs, "balance_total"));
            row.put("attention", intValue(rs, "attention"));
            return row;
        }, filter.params().toArray());
    }

    public List<Map<String, Object>> loadLowProductivity(ExecutiveKpiScope scope) {
        var filter = scopedFilter(scope, "task", "COALESCE(task.agenda_date, task.due_date)");
        var sql = """
                SELECT task.assigned_user_company_id AS collaborator_id,
                       COALESCE(
                         MAX(NULLIF(TRIM(hr_user.full_name), '')),
                         MAX(NULLIF(TRIM(user_record.full_name), '')),
                         MAX(NULLIF(TRIM(user_record.email), '')),
                         MAX(NULLIF(TRIM(task.assigned_name), '')),
                         'Sin responsable'
                       ) AS collaborator_name,
                       MAX(COALESCE(hr_user.unit_id, task.unit_id)) AS unit_id,
                       MAX(COALESCE(unit.name, 'Sin unidad')) AS unit_name,
                       MAX(COALESCE(hr_user.business_id, task.business_id)) AS business_id,
                       MAX(COALESCE(business.name, 'Sin negocio')) AS business_name,
                       COUNT(*) AS total_tasks,
                       SUM(CASE WHEN task.status IN ('completed', 'audited') THEN 1 ELSE 0 END) AS closed_tasks,
                       SUM(CASE
                             WHEN task.status NOT IN ('completed', 'audited', 'cancelled')
                              AND COALESCE(task.agenda_date, task.due_date) < CURRENT_DATE
                             THEN 1 ELSE 0
                             END) AS overdue_tasks,
                       ROUND(AVG(COALESCE(task.completion_percent, CASE WHEN task.status IN ('completed', 'audited') THEN 100 ELSE 0 END)), 0) AS average_completion
                FROM process_tasks task
                LEFT JOIN user_companies assigned_user_company ON assigned_user_company.id = task.assigned_user_company_id
                    AND assigned_user_company.company_id = task.company_id
                LEFT JOIN users user_record ON user_record.id = assigned_user_company.user_id
                LEFT JOIN hr_users hr_user ON hr_user.user_company_id = task.assigned_user_company_id
                    AND hr_user.company_id = task.company_id
                LEFT JOIN units unit ON unit.id = COALESCE(hr_user.unit_id, task.unit_id)
                LEFT JOIN businesses business ON business.id = COALESCE(hr_user.business_id, task.business_id)
                WHERE task.deleted_at IS NULL
                """ + filter.sql() + """
                GROUP BY task.assigned_user_company_id
                HAVING total_tasks > 0
                ORDER BY overdue_tasks DESC, average_completion ASC, total_tasks DESC
                LIMIT 6
                """;
        return jdbcTemplate.query(sql, this::mapLowProductivityRow, filter.params().toArray());
    }

    public List<Map<String, Object>> loadAbsenteeism(ExecutiveKpiScope scope) {
        var filter = scopedFilter(scope, "hr_user", null);
        var params = new ArrayList<>(filter.params());
        params.add(scope.from().toString());
        params.add(scope.to().toString());
        var sql = """
                SELECT record.user_company_id AS collaborator_id,
                       COALESCE(MAX(NULLIF(TRIM(hr_user.full_name), '')), 'Sin responsable') AS collaborator_name,
                       MAX(hr_user.unit_id) AS unit_id,
                       MAX(COALESCE(unit.name, 'Sin unidad')) AS unit_name,
                       MAX(hr_user.business_id) AS business_id,
                       MAX(COALESCE(business.name, 'Sin negocio')) AS business_name,
                       COUNT(*) AS attendance_records,
                       SUM(CASE
                             WHEN LOWER(COALESCE(record.corrected_status, record.system_status, '')) IN ('absent', 'absence', 'falta')
                             THEN 1 ELSE 0
                           END) AS absences,
                       SUM(CASE WHEN COALESCE(record.minutes_late, 0) > 0 THEN 1 ELSE 0 END) AS late_days
                FROM user_attendance_daily_records record
                JOIN hr_users hr_user ON hr_user.user_company_id = record.user_company_id
                    AND hr_user.company_id = record.company_id
                LEFT JOIN units unit ON unit.id = hr_user.unit_id
                LEFT JOIN businesses business ON business.id = hr_user.business_id
                WHERE record.company_id = ?
                """ + filter.withoutCompanySql() + """
                  AND record.attendance_date BETWEEN ? AND ?
                GROUP BY record.user_company_id
                HAVING absences > 0 OR late_days > 0
                ORDER BY absences DESC, late_days DESC, attendance_records DESC
                LIMIT 6
                """;
        return jdbcTemplate.query(sql, this::mapAbsenteeismRow, params.toArray());
    }

    public List<String> loadNativeCurrencies(ExecutiveKpiScope scope) {
        var salesFilter = scopedFilter(scope, "sale", "sale_date");
        var expenseFilter = scopedFilter(scope, "expense", "expense_date");
        var fundFilter = scopedFilter(scope, "fund", null);
        var params = new ArrayList<Object>();
        params.addAll(salesFilter.params());
        params.addAll(expenseFilter.params());
        params.addAll(fundFilter.params());
        params.add(scope.companyId());
        var sql = """
                SELECT DISTINCT currency
                FROM (
                    SELECT CONVERT(sale.currency USING utf8mb4) COLLATE utf8mb4_unicode_ci AS currency
                    FROM sales_records sale
                    WHERE sale.deleted_at IS NULL
                """ + salesFilter.sql() + """
                    UNION ALL
                    SELECT CONVERT(expense.currency_code USING utf8mb4) COLLATE utf8mb4_unicode_ci AS currency
                    FROM finance_expenses expense
                    WHERE expense.deleted_at IS NULL AND expense.status NOT IN ('CANCELLED', 'REJECTED')
                """ + expenseFilter.sql() + """
                    UNION ALL
                    SELECT CONVERT(fund.currency_code USING utf8mb4) COLLATE utf8mb4_unicode_ci AS currency
                    FROM finance_petty_cash_funds fund
                    WHERE fund.deleted_at IS NULL AND fund.status <> 'CLOSED'
                """ + fundFilter.sql() + """
                    UNION ALL
                    SELECT CONVERT(product.currency USING utf8mb4) COLLATE utf8mb4_unicode_ci AS currency
                    FROM sales_inventory_balances balance
                    JOIN sales_products product ON product.id = balance.product_id
                        AND product.company_id = balance.company_id AND product.deleted_at IS NULL
                    WHERE balance.company_id = ? AND balance.deleted_at IS NULL AND balance.uses_inventory = 1
                ) currencies
                WHERE currency IS NOT NULL AND TRIM(currency) <> ''
                ORDER BY currency
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> rs.getString("currency"), params.toArray());
    }

    public static List<Map<String, Object>> mergeOrgRows(
            List<Map<String, Object>> orgRows,
            List<Map<String, Object>> sales,
            List<Map<String, Object>> collections,
            List<Map<String, Object>> expenses,
            List<Map<String, Object>> receivables,
            List<Map<String, Object>> pettyCash,
            List<Map<String, Object>> operations,
            List<Map<String, Object>> attendance) {
        var rows = new LinkedHashMap<String, Map<String, Object>>();
        orgRows.forEach(row -> rows.put(key(row), baseRow(row)));
        List.of(sales, collections, expenses, receivables, pettyCash, operations, attendance)
                .forEach(source -> source.forEach(row -> rows.computeIfAbsent(key(row), ignored -> baseRow(row)).putAll(row)));
        rows.values().forEach(ExecutiveKpiRepository::finishRow);
        return new ArrayList<>(rows.values());
    }

    private static void finishRow(Map<String, Object> row) {
        var sales = number(row.get("salesTotal"));
        var expenses = number(row.get("expensesTotal"));
        var profit = sales - expenses;
        row.put("operatingProfit", round(profit));
        row.put("operatingMargin", sales <= 0 ? 0 : round((profit * 100.0) / sales));
        row.put("attendanceRate", percent(integer(row.get("attendanceRecords")) - integer(row.get("absences")), integer(row.get("attendanceRecords"))));
        row.put("taskCompletionRate", percent(integer(row.get("closedTasks")), integer(row.get("totalTasks"))));
        row.put("status", status(row));
    }

    private static String status(Map<String, Object> row) {
        if (number(row.get("operatingProfit")) < 0 || number(row.get("overdueReceivables")) > 0) return "critical";
        if (integer(row.get("overdueTasks")) > 0 || number(row.get("payablesTotal")) > 0) return "watch";
        return "healthy";
    }

    private Map<String, Object> mapOrgIdentity(ResultSet rs, int rowNum) throws SQLException {
        var row = new LinkedHashMap<String, Object>();
        row.put("unitId", nullableLong(rs, "unit_id"));
        row.put("unitName", fallback(rs.getString("unit_name"), "Sin unidad"));
        row.put("businessId", nullableLong(rs, "business_id"));
        row.put("businessName", fallback(rs.getString("business_name"), "Sin negocio"));
        return row;
    }

    private Map<String, Object> mapSalesRow(ResultSet rs, int rowNum) throws SQLException {
        var row = mapOrgIdentityAliases(rs);
        row.put("salesCount", intValue(rs, "sales_count"));
        row.put("salesTotal", doubleValue(rs, "sales_total"));
        row.put("salesMargin", doubleValue(rs, "sales_margin"));
        return row;
    }

    private Map<String, Object> mapCollectionsRow(ResultSet rs, int rowNum) throws SQLException {
        var row = mapOrgIdentityAliases(rs);
        row.put("collectedTotal", doubleValue(rs, "collected_total"));
        return row;
    }

    private Map<String, Object> mapExpensesRow(ResultSet rs, int rowNum) throws SQLException {
        var row = mapOrgIdentityAliases(rs);
        row.put("expensesCount", intValue(rs, "expenses_count"));
        row.put("expensesTotal", doubleValue(rs, "expenses_total"));
        row.put("payablesTotal", doubleValue(rs, "payables_total"));
        row.put("overduePayables", doubleValue(rs, "overdue_payables"));
        return row;
    }

    private Map<String, Object> mapReceivablesRow(ResultSet rs, int rowNum) throws SQLException {
        var row = mapOrgIdentityAliases(rs);
        row.put("receivablesTotal", doubleValue(rs, "receivables_total"));
        row.put("overdueReceivables", doubleValue(rs, "overdue_receivables"));
        return row;
    }

    private Map<String, Object> mapPettyCashRow(ResultSet rs, int rowNum) throws SQLException {
        var row = mapOrgIdentityAliases(rs);
        row.put("pettyCashFunds", intValue(rs, "petty_cash_funds"));
        row.put("pettyCashBalance", doubleValue(rs, "petty_cash_balance"));
        row.put("pettyCashAttention", intValue(rs, "petty_cash_attention"));
        return row;
    }

    private Map<String, Object> mapOperationsRow(ResultSet rs, int rowNum) throws SQLException {
        var row = mapOrgIdentityAliases(rs);
        row.put("totalTasks", intValue(rs, "total_tasks"));
        row.put("closedTasks", intValue(rs, "closed_tasks"));
        row.put("overdueTasks", intValue(rs, "overdue_tasks"));
        row.put("averageCompletion", intValue(rs, "average_completion"));
        return row;
    }

    private Map<String, Object> mapAttendanceRow(ResultSet rs, int rowNum) throws SQLException {
        var row = mapOrgIdentityAliases(rs);
        row.put("attendanceRecords", intValue(rs, "attendance_records"));
        row.put("absences", intValue(rs, "absences"));
        return row;
    }

    private Map<String, Object> mapLowProductivityRow(ResultSet rs, int rowNum) throws SQLException {
        var totalTasks = intValue(rs, "total_tasks");
        var closedTasks = intValue(rs, "closed_tasks");
        var overdueTasks = intValue(rs, "overdue_tasks");
        var completion = intValue(rs, "average_completion");
        var score = Math.max(0, Math.min(100, (int) Math.round((percent(closedTasks, totalTasks) * 0.55) + (completion * 0.35) - (overdueTasks * 8.0))));
        var row = new LinkedHashMap<String, Object>();
        row.put("collaboratorId", nullableLong(rs, "collaborator_id"));
        row.put("collaboratorName", fallback(rs.getString("collaborator_name"), "Sin responsable"));
        row.put("unitId", nullableLong(rs, "unit_id"));
        row.put("unitName", fallback(rs.getString("unit_name"), "Sin unidad"));
        row.put("businessId", nullableLong(rs, "business_id"));
        row.put("businessName", fallback(rs.getString("business_name"), "Sin negocio"));
        row.put("totalTasks", totalTasks);
        row.put("closedTasks", closedTasks);
        row.put("overdueTasks", overdueTasks);
        row.put("averageCompletion", completion);
        row.put("productivityScore", score);
        row.put("status", score >= 85 ? "healthy" : score >= 65 ? "watch" : "critical");
        return row;
    }

    private Map<String, Object> mapAbsenteeismRow(ResultSet rs, int rowNum) throws SQLException {
        var attendanceRecords = intValue(rs, "attendance_records");
        var absences = intValue(rs, "absences");
        var lateDays = intValue(rs, "late_days");
        var row = new LinkedHashMap<String, Object>();
        row.put("collaboratorId", nullableLong(rs, "collaborator_id"));
        row.put("collaboratorName", fallback(rs.getString("collaborator_name"), "Sin responsable"));
        row.put("unitId", nullableLong(rs, "unit_id"));
        row.put("unitName", fallback(rs.getString("unit_name"), "Sin unidad"));
        row.put("businessId", nullableLong(rs, "business_id"));
        row.put("businessName", fallback(rs.getString("business_name"), "Sin negocio"));
        row.put("attendanceRecords", attendanceRecords);
        row.put("absences", absences);
        row.put("lateDays", lateDays);
        row.put("attendanceRate", percent(attendanceRecords - absences, attendanceRecords));
        row.put("status", absences >= 3 ? "critical" : "watch");
        return row;
    }

    private Map<String, Object> mapOrgIdentityAliases(ResultSet rs) throws SQLException {
        var row = new LinkedHashMap<String, Object>();
        row.put("unitId", nullableLong(rs, "unit_id"));
        row.put("unitName", "Sin unidad");
        row.put("businessId", nullableLong(rs, "business_id"));
        row.put("businessName", "Sin negocio");
        return row;
    }

    private SqlFragment scopedFilter(ExecutiveKpiScope scope, String alias, String dateColumn) {
        var params = new ArrayList<Object>();
        var sql = new StringBuilder(" AND ").append(alias).append(".company_id = ?");
        params.add(scope.companyId());
        if (dateColumn != null) {
            sql.append(" AND ").append(dateColumn.contains("(") ? dateColumn : alias + "." + dateColumn).append(" BETWEEN ? AND ?");
            params.add(scope.from().toString());
            params.add(scope.to().toString());
        }
        if (scope.unitId() != null) {
            sql.append(" AND ").append(alias).append(".unit_id = ?");
            params.add(scope.unitId());
        }
        if (scope.businessId() != null) {
            sql.append(" AND ").append(alias).append(".business_id = ?");
            params.add(scope.businessId());
        }
        return new SqlFragment(sql.append(System.lineSeparator()).toString(), params);
    }

    private static Map<String, Object> baseRow(Map<String, Object> source) {
        var row = new LinkedHashMap<String, Object>();
        row.put("unitId", source.get("unitId"));
        row.put("unitName", source.getOrDefault("unitName", "Sin unidad"));
        row.put("businessId", source.get("businessId"));
        row.put("businessName", source.getOrDefault("businessName", "Sin negocio"));
        row.put("salesCount", 0);
        row.put("salesTotal", 0.0);
        row.put("salesMargin", 0.0);
        row.put("collectedTotal", 0.0);
        row.put("expensesCount", 0);
        row.put("expensesTotal", 0.0);
        row.put("payablesTotal", 0.0);
        row.put("overduePayables", 0.0);
        row.put("receivablesTotal", 0.0);
        row.put("overdueReceivables", 0.0);
        row.put("pettyCashFunds", 0);
        row.put("pettyCashBalance", 0.0);
        row.put("pettyCashAttention", 0);
        row.put("totalTasks", 0);
        row.put("closedTasks", 0);
        row.put("overdueTasks", 0);
        row.put("averageCompletion", 0);
        row.put("attendanceRecords", 0);
        row.put("absences", 0);
        return row;
    }

    private static String key(Map<String, Object> row) {
        return String.valueOf(row.get("unitId")) + "|" + String.valueOf(row.get("businessId"));
    }

    private static Long nullableLong(ResultSet rs, String column) throws SQLException {
        var value = rs.getObject(column);
        return value instanceof Number number ? number.longValue() : null;
    }

    private static int intValue(ResultSet rs, String column) throws SQLException {
        var value = rs.getObject(column);
        return value instanceof Number number ? number.intValue() : 0;
    }

    private static double doubleValue(ResultSet rs, String column) throws SQLException {
        var value = rs.getObject(column);
        return value instanceof Number number ? round(number.doubleValue()) : 0;
    }

    private static String fallback(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private static double number(Object value) {
        return value instanceof Number number ? number.doubleValue() : 0;
    }

    private static int integer(Object value) {
        return value instanceof Number number ? number.intValue() : 0;
    }

    private static double percent(double value, double total) {
        if (total <= 0) return 0;
        return round((value * 100.0) / total);
    }

    private static double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private record SqlFragment(String sql, List<Object> params) {
        String withoutCompanySql() {
            return sql.replaceFirst(" AND [a-zA-Z_]+\\.company_id = \\?", "");
        }
    }
}
