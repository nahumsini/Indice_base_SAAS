package com.indice.erp.kpis.executive;

import com.indice.erp.kpis.currency.KpiMoneyAmount;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ExecutiveKpiDomainRepository {

    private static final String ACTUAL_EXPENSE_STATUSES = "('APPROVED', 'PARTIALLY_PAID', 'PAID', 'CLOSED')";
    private static final String PAYABLE_EXPENSE_STATUSES = "('APPROVED', 'PARTIALLY_PAID')";
    private static final String VALID_SALE_PREDICATE =
            "LOWER(COALESCE(sale.commercial_status, '')) NOT IN ('cancelled', 'canceled', 'rejected', 'voided')";

    private final JdbcTemplate jdbcTemplate;

    public ExecutiveKpiDomainRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public ProcessSnapshot loadProcesses(ExecutiveKpiScope scope) {
        var filter = numericScope(scope, "task", null);
        var params = withBoundsAndSnapshot(scope, filter.params());
        return jdbcTemplate.queryForObject("""
                WITH bounds AS (SELECT CAST(? AS DATE) AS from_date, CAST(? AS DATE) AS to_date,
                                       CAST(? AS DATE) AS snapshot_date)
                SELECT SUM(CASE
                             WHEN COALESCE(task.agenda_date, task.due_date) BETWEEN bounds.from_date AND bounds.to_date
                              AND DATE(task.created_at) <= bounds.to_date
                              AND (task.cancelled_at IS NULL OR DATE(task.cancelled_at) > bounds.to_date)
                             THEN 1 ELSE 0
                           END) AS total_tasks,
                       SUM(CASE
                             WHEN COALESCE(task.agenda_date, task.due_date) BETWEEN bounds.from_date AND bounds.to_date
                              AND DATE(task.created_at) <= bounds.to_date
                              AND (task.cancelled_at IS NULL OR DATE(task.cancelled_at) > bounds.to_date)
                              AND (DATE(task.completed_at) <= bounds.to_date
                                   OR (LOWER(task.status) = 'completed' AND task.completed_at IS NULL))
                             THEN 1 ELSE 0
                           END) AS closed_tasks,
                       SUM(CASE
                             WHEN COALESCE(task.agenda_date, task.due_date) < bounds.to_date
                              AND DATE(task.created_at) <= bounds.to_date
                              AND (task.completed_at IS NULL OR DATE(task.completed_at) > bounds.to_date)
                              AND (task.cancelled_at IS NULL OR DATE(task.cancelled_at) > bounds.to_date)
                             THEN 1 ELSE 0
                           END) AS overdue_tasks,
                       SUM(CASE
                             WHEN (DATE(task.completed_at) <= bounds.to_date
                                   OR (LOWER(task.status) = 'completed' AND task.completed_at IS NULL))
                              AND (COALESCE(task.audited, 0) = 0 OR task.audited_at IS NULL
                                   OR DATE(task.audited_at) > bounds.to_date)
                              AND (task.cancelled_at IS NULL OR DATE(task.cancelled_at) > bounds.to_date)
                             THEN 1 ELSE 0
                           END) AS pending_audit_tasks,
                       SUM(CASE
                             WHEN task.assigned_user_company_id IS NULL
                              AND LOWER(task.status) IN ('pending', 'in_progress', 'paused')
                             THEN 1 ELSE 0
                           END) AS unassigned_tasks,
                       ROUND(AVG(CASE
                             WHEN COALESCE(task.agenda_date, task.due_date) BETWEEN bounds.from_date AND bounds.to_date
                              AND (task.cancelled_at IS NULL OR DATE(task.cancelled_at) > bounds.to_date)
                             THEN CASE
                               WHEN DATE(task.completed_at) <= bounds.to_date THEN 100
                               ELSE LEAST(100, GREATEST(0, COALESCE(task.completion_percent, 0)))
                             END
                             ELSE NULL
                           END), 2) AS average_completion,
                       SUM(CASE
                             WHEN COALESCE(task.agenda_date, task.due_date) IS NULL
                               AND LOWER(COALESCE(task.status, '')) NOT IN ('completed', 'cancelled')
                              THEN 1 ELSE 0
                            END) AS missing_schedule_dates,
                       SUM(CASE
                             WHEN task.completion_percent < 0 OR task.completion_percent > 100
                             THEN 1 ELSE 0
                           END) AS invalid_completion_rows,
                       SUM(CASE
                             WHEN LOWER(task.status) = 'completed' AND task.completed_at IS NULL
                             THEN 1 ELSE 0
                            END) AS completed_without_timestamp,
                       SUM(CASE
                             WHEN LOWER(task.status) = 'cancelled' AND task.cancelled_at IS NULL
                             THEN 1 ELSE 0
                           END) AS cancelled_without_timestamp,
                       SUM(CASE
                             WHEN bounds.to_date < bounds.snapshot_date
                              AND COALESCE(task.agenda_date, task.due_date) BETWEEN bounds.from_date AND bounds.to_date
                              AND (task.completed_at IS NULL OR DATE(task.completed_at) > bounds.to_date)
                             THEN 1 ELSE 0
                           END) AS historical_mutable_rows
                FROM process_tasks task
                CROSS JOIN bounds
                WHERE task.deleted_at IS NULL
                """ + filter.sql(), (rs, rowNum) -> new ProcessSnapshot(
                integer(rs.getObject("total_tasks")),
                integer(rs.getObject("closed_tasks")),
                integer(rs.getObject("overdue_tasks")),
                integer(rs.getObject("pending_audit_tasks")),
                integer(rs.getObject("unassigned_tasks")),
                decimal(rs.getObject("average_completion")),
                integer(rs.getObject("missing_schedule_dates")),
                 integer(rs.getObject("invalid_completion_rows")),
                 integer(rs.getObject("completed_without_timestamp")),
                 integer(rs.getObject("cancelled_without_timestamp")),
                 integer(rs.getObject("historical_mutable_rows"))), params.toArray());
    }

    public ExpenseSnapshot loadExpenses(ExecutiveKpiScope scope) {
        var filter = numericScope(scope, "expense", null);
        var params = withBoundsAndSnapshot(scope, filter.params());
        return jdbcTemplate.queryForObject("""
                WITH bounds AS (SELECT CAST(? AS DATE) AS from_date, CAST(? AS DATE) AS to_date,
                                       CAST(? AS DATE) AS snapshot_date)
                SELECT SUM(CASE
                             WHEN expense.status IN %1$s
                              AND expense.expense_date BETWEEN bounds.from_date AND bounds.to_date
                             THEN 1 ELSE 0
                           END) AS expense_count,
                       SUM(CASE WHEN expense.status = 'PENDING_APPROVAL' THEN 1 ELSE 0 END) AS pending_approval,
                       SUM(CASE
                             WHEN expense.status IN %2$s AND expense.balance_amount > 0
                             THEN 1 ELSE 0
                           END) AS open_payables,
                       SUM(CASE
                             WHEN expense.status IN %2$s AND expense.balance_amount > 0
                               AND expense.due_date < bounds.snapshot_date
                             THEN 1 ELSE 0
                           END) AS overdue_payables,
                       SUM(CASE
                             WHEN expense.status IN %1$s
                              AND expense.expense_date BETWEEN bounds.from_date AND bounds.to_date
                              AND expense.attachment_count = 0
                             THEN 1 ELSE 0
                           END) AS missing_receipts,
                       SUM(CASE
                             WHEN expense.status IN %1$s
                              AND expense.expense_date BETWEEN bounds.from_date AND bounds.to_date
                              AND (expense.total_amount < 0 OR expense.paid_amount < 0 OR expense.balance_amount < 0
                                   OR ABS(expense.balance_amount - GREATEST(expense.total_amount - expense.paid_amount, 0)) > 0.01)
                             THEN 1 ELSE 0
                           END) AS invalid_period_amount_rows,
                       SUM(CASE
                             WHEN expense.status IN %2$s
                              AND (expense.total_amount < 0 OR expense.paid_amount < 0 OR expense.balance_amount < 0
                                   OR ABS(expense.balance_amount - GREATEST(expense.total_amount - expense.paid_amount, 0)) > 0.01)
                             THEN 1 ELSE 0
                           END) AS invalid_payable_amount_rows,
                       SUM(CASE
                             WHEN expense.status IN %2$s AND expense.balance_amount > 0 AND expense.due_date IS NULL
                             THEN 1 ELSE 0
                           END) AS payable_without_due_date,
                       SUM(CASE
                             WHEN expense.status IN %1$s
                              AND expense.expense_date BETWEEN bounds.from_date AND bounds.to_date
                               AND (expense.currency_code IS NULL OR UPPER(TRIM(expense.currency_code)) NOT REGEXP '^[A-Z]{3}$')
                             THEN 1 ELSE 0
                           END) AS invalid_period_currency_rows,
                       SUM(CASE
                             WHEN expense.status IN %2$s AND expense.balance_amount > 0
                              AND (expense.currency_code IS NULL OR UPPER(TRIM(expense.currency_code)) NOT REGEXP '^[A-Z]{3}$')
                             THEN 1 ELSE 0
                           END) AS invalid_payable_currency_rows
                FROM finance_expenses expense
                CROSS JOIN bounds
                WHERE expense.deleted_at IS NULL
                  AND expense.status NOT IN ('CANCELLED', 'REJECTED')
                """.formatted(ACTUAL_EXPENSE_STATUSES, PAYABLE_EXPENSE_STATUSES) + filter.sql(),
                (rs, rowNum) -> new ExpenseSnapshot(
                        integer(rs.getObject("expense_count")),
                        integer(rs.getObject("pending_approval")),
                        integer(rs.getObject("open_payables")),
                        integer(rs.getObject("overdue_payables")),
                        integer(rs.getObject("missing_receipts")),
                        integer(rs.getObject("invalid_period_amount_rows")),
                        integer(rs.getObject("invalid_payable_amount_rows")),
                        integer(rs.getObject("payable_without_due_date")),
                        integer(rs.getObject("invalid_period_currency_rows")),
                        integer(rs.getObject("invalid_payable_currency_rows"))), params.toArray());
    }

    public PettyCashSnapshot loadPettyCash(ExecutiveKpiScope scope) {
        var fundFilter = numericScope(scope, "fund", null);
        var funds = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) AS fund_count,
                       SUM(CASE WHEN fund.status IN ('LOW_BALANCE', 'NEEDS_RECONCILIATION') THEN 1 ELSE 0 END) AS attention_funds,
                       SUM(CASE WHEN fund.limit_amount < 0 THEN 1 ELSE 0 END) AS invalid_amount_rows,
                       SUM(CASE
                             WHEN fund.currency_code IS NULL OR UPPER(TRIM(fund.currency_code)) NOT REGEXP '^[A-Z]{3}$'
                             THEN 1 ELSE 0
                           END) AS invalid_currency_rows
                FROM finance_petty_cash_funds fund
                WHERE fund.deleted_at IS NULL AND fund.status <> 'CLOSED'
                """ + fundFilter.sql(), (rs, rowNum) -> new int[] {
                integer(rs.getObject("fund_count")),
                integer(rs.getObject("attention_funds")),
                integer(rs.getObject("invalid_amount_rows")),
                integer(rs.getObject("invalid_currency_rows"))
        }, fundFilter.params().toArray());

        var lineFilter = pettyCashLineScope(scope, null);
        var lines = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) AS settlement_count,
                       SUM(CASE WHEN line.status IN ('DRAFT', 'RECEIPT_ATTACHED', 'VALIDATED') THEN 1 ELSE 0 END) AS pending_settlements,
                       SUM(CASE
                             WHEN line.status IN ('DRAFT', 'RECEIPT_ATTACHED', 'VALIDATED')
                              AND line.attachment_count = 0
                             THEN 1 ELSE 0
                           END) AS missing_receipts,
                       SUM(CASE
                             WHEN line.status IN ('DRAFT', 'RECEIPT_ATTACHED', 'VALIDATED')
                              AND line.total_amount < 0
                             THEN 1 ELSE 0
                           END) AS invalid_amount_rows,
                       SUM(CASE
                             WHEN line.status IN ('DRAFT', 'RECEIPT_ATTACHED', 'VALIDATED')
                              AND (line.currency_code IS NULL OR UPPER(TRIM(line.currency_code)) NOT REGEXP '^[A-Z]{3}$')
                             THEN 1 ELSE 0
                           END) AS invalid_currency_rows
                FROM finance_petty_cash_settlement_lines line
                JOIN finance_petty_cash_funds fund ON fund.id = line.petty_cash_fund_id
                    AND fund.company_id = line.company_id AND fund.deleted_at IS NULL
                WHERE line.deleted_at IS NULL AND line.status <> 'REJECTED'
                """ + lineFilter.sql(), (rs, rowNum) -> new int[] {
                integer(rs.getObject("settlement_count")),
                 integer(rs.getObject("pending_settlements")),
                 integer(rs.getObject("missing_receipts")),
                 integer(rs.getObject("invalid_amount_rows")),
                 integer(rs.getObject("invalid_currency_rows"))
        }, lineFilter.params().toArray());

        return new PettyCashSnapshot(funds[0], funds[1], lines[0], lines[1], lines[2],
                funds[2], funds[3], lines[3], lines[4]);
    }

    public InventorySnapshot loadInventory(ExecutiveKpiScope scope) {
        var balanceFilter = inventoryScope(scope, "balance", null);
        var balances = jdbcTemplate.queryForObject("""
                SELECT COUNT(DISTINCT balance.product_id) AS tracked_products,
                       COUNT(*) AS stock_locations,
                       SUM(CASE WHEN balance.available_quantity <= 0 THEN 1 ELSE 0 END) AS out_of_stock,
                       SUM(CASE
                             WHEN balance.available_quantity > 0
                              AND balance.available_quantity <= balance.minimum_quantity
                             THEN 1 ELSE 0
                           END) AS low_stock,
                       SUM(COALESCE(balance.available_quantity, 0)) AS available_units,
                       SUM(COALESCE(balance.reserved_quantity, 0)) AS reserved_units,
                       SUM(CASE
                             WHEN balance.available_quantity < 0 OR balance.reserved_quantity < 0
                              OR balance.minimum_quantity < 0 OR balance.unit_cost < 0
                             THEN 1 ELSE 0
                           END) AS invalid_quantity_rows,
                       SUM(CASE
                             WHEN product.currency IS NULL OR UPPER(TRIM(product.currency)) NOT REGEXP '^[A-Z]{3}$'
                             THEN 1 ELSE 0
                           END) AS invalid_currency_rows
                FROM sales_inventory_balances balance
                JOIN sales_products product ON product.id = balance.product_id
                    AND product.company_id = balance.company_id AND product.deleted_at IS NULL
                WHERE balance.deleted_at IS NULL AND balance.uses_inventory = 1
                """ + balanceFilter.sql(), (rs, rowNum) -> new double[] {
                integer(rs.getObject("tracked_products")),
                integer(rs.getObject("stock_locations")),
                integer(rs.getObject("out_of_stock")),
                integer(rs.getObject("low_stock")),
                decimal(rs.getObject("available_units")),
                decimal(rs.getObject("reserved_units")),
                integer(rs.getObject("invalid_quantity_rows")),
                integer(rs.getObject("invalid_currency_rows"))
        }, balanceFilter.params().toArray());

        var movementFilter = inventoryScope(scope, "movement", null);
        var movementParams = withBounds(scope, movementFilter.params());
        var movements = jdbcTemplate.queryForObject("""
                WITH bounds AS (SELECT CAST(? AS DATE) AS from_date, CAST(? AS DATE) AS to_date)
                SELECT COUNT(DISTINCT CASE
                           WHEN movement.movement_date BETWEEN bounds.from_date AND bounds.to_date
                           THEN COALESCE(movement.group_id, movement.movement_number)
                       END) AS movement_count,
                       COUNT(DISTINCT CASE
                           WHEN LOWER(movement.status) IN ('intransit', 'in_transit')
                           THEN COALESCE(movement.group_id, movement.movement_number)
                       END) AS in_transit,
                       COUNT(DISTINCT CASE
                           WHEN movement.movement_date BETWEEN bounds.from_date AND bounds.to_date
                            AND LOWER(movement.movement_type) IN ('adjustment', 'writeoff', 'write_off')
                           THEN COALESCE(movement.group_id, movement.movement_number)
                       END) AS adjustments
                FROM sales_inventory_movements movement
                CROSS JOIN bounds
                WHERE movement.deleted_at IS NULL
                  AND LOWER(movement.status) <> 'cancelled'
                """ + movementFilter.sql(), (rs, rowNum) -> new int[] {
                integer(rs.getObject("movement_count")),
                integer(rs.getObject("in_transit")),
                integer(rs.getObject("adjustments"))
        }, movementParams.toArray());

        return new InventorySnapshot(
                (int) balances[0], (int) balances[1], (int) balances[2], (int) balances[3],
                balances[4], balances[5], movements[0], movements[1], movements[2],
                (int) balances[6], (int) balances[7]);
    }

    public SalesSnapshot loadSales(ExecutiveKpiScope scope) {
        var salesFilter = numericScope(scope, "sale", null);
        var salesParams = withBounds(scope, salesFilter.params());
        var sales = jdbcTemplate.queryForObject("""
                WITH bounds AS (SELECT CAST(? AS DATE) AS from_date, CAST(? AS DATE) AS to_date)
                SELECT SUM(CASE
                             WHEN sale.sale_date BETWEEN bounds.from_date AND bounds.to_date THEN 1 ELSE 0
                           END) AS sale_count,
                       SUM(CASE
                             WHEN LOWER(COALESCE(sale.finance_status, '')) IN ('pending', 'pending_validation')
                             THEN 1 ELSE 0
                           END) AS pending_finance,
                       SUM(CASE
                             WHEN LOWER(COALESCE(sale.inventory_movement_status, '')) IN ('not_generated', 'pending')
                             THEN 1 ELSE 0
                           END) AS pending_inventory,
                       SUM(CASE WHEN sale.sale_date IS NULL THEN 1 ELSE 0 END) AS missing_sale_date,
                       SUM(CASE
                             WHEN sale.total_amount < 0 OR sale.subtotal < 0 OR sale.discount_total < 0
                              OR sale.tax_total < 0
                             THEN 1 ELSE 0
                           END) AS invalid_amount_rows,
                       SUM(CASE
                             WHEN sale.currency IS NULL OR UPPER(TRIM(sale.currency)) NOT REGEXP '^[A-Z]{3}$'
                             THEN 1 ELSE 0
                           END) AS invalid_currency_rows
                FROM sales_records sale
                CROSS JOIN bounds
                WHERE sale.deleted_at IS NULL AND %s
                """.formatted(VALID_SALE_PREDICATE) + salesFilter.sql(), (rs, rowNum) -> new int[] {
                integer(rs.getObject("sale_count")),
                integer(rs.getObject("pending_finance")),
                integer(rs.getObject("pending_inventory")),
                integer(rs.getObject("missing_sale_date")),
                integer(rs.getObject("invalid_amount_rows")),
                integer(rs.getObject("invalid_currency_rows"))
        }, salesParams.toArray());

        var opportunityFilter = numericScope(scope, "opportunity", null);
        var opportunityParams = withBounds(scope, opportunityFilter.params());
        var opportunities = jdbcTemplate.queryForObject("""
                WITH bounds AS (SELECT CAST(? AS DATE) AS from_date, CAST(? AS DATE) AS to_date)
                SELECT SUM(CASE
                             WHEN DATE(opportunity.created_at) BETWEEN bounds.from_date AND bounds.to_date
                              AND LOWER(COALESCE(opportunity.stage, '')) IN ('won', 'lost')
                             THEN 1 ELSE 0
                           END) AS closed_opportunities,
                       SUM(CASE
                             WHEN DATE(opportunity.created_at) BETWEEN bounds.from_date AND bounds.to_date
                              AND LOWER(COALESCE(opportunity.stage, '')) = 'won'
                             THEN 1 ELSE 0
                           END) AS won_opportunities,
                       SUM(CASE
                             WHEN opportunity.created_at IS NULL
                              AND LOWER(COALESCE(opportunity.stage, '')) IN ('won', 'lost')
                             THEN 1 ELSE 0
                           END) AS missing_opportunity_date,
                       SUM(CASE
                             WHEN LOWER(COALESCE(opportunity.stage, '')) NOT IN ('won', 'lost')
                              AND LOWER(COALESCE(opportunity.status, 'open')) <> 'closed'
                              AND (opportunity.probability_percent < 0 OR opportunity.probability_percent > 100)
                             THEN 1 ELSE 0
                           END) AS invalid_probability_rows,
                       SUM(CASE
                             WHEN LOWER(COALESCE(opportunity.stage, '')) NOT IN ('won', 'lost')
                              AND LOWER(COALESCE(opportunity.status, 'open')) <> 'closed'
                              AND opportunity.estimated_value < 0
                             THEN 1 ELSE 0
                           END) AS invalid_amount_rows,
                       SUM(CASE
                             WHEN LOWER(COALESCE(opportunity.stage, '')) NOT IN ('won', 'lost')
                              AND LOWER(COALESCE(opportunity.status, 'open')) <> 'closed'
                              AND (opportunity.currency IS NULL
                                   OR UPPER(TRIM(opportunity.currency)) NOT REGEXP '^[A-Z]{3}$')
                             THEN 1 ELSE 0
                           END) AS invalid_currency_rows
                FROM sales_opportunities opportunity
                CROSS JOIN bounds
                WHERE opportunity.deleted_at IS NULL
                """ + opportunityFilter.sql(), (rs, rowNum) -> new int[] {
                integer(rs.getObject("closed_opportunities")),
                integer(rs.getObject("won_opportunities")),
                integer(rs.getObject("missing_opportunity_date")),
                integer(rs.getObject("invalid_probability_rows")),
                integer(rs.getObject("invalid_amount_rows")),
                integer(rs.getObject("invalid_currency_rows"))
        }, opportunityParams.toArray());

        return new SalesSnapshot(sales[0], sales[1], sales[2], opportunities[0], opportunities[1],
                sales[3], sales[4], sales[5], opportunities[2], opportunities[3],
                opportunities[4], opportunities[5]);
    }

    public List<KpiMoneyAmount> loadSalesValue(ExecutiveKpiScope scope) {
        var filter = numericScope(scope, "sale", "sale.sale_date");
        return money("""
                SELECT SUM(COALESCE(sale.total_amount, 0)) AS amount, sale.currency AS currency
                FROM sales_records sale
                WHERE sale.deleted_at IS NULL AND %s
                """.formatted(VALID_SALE_PREDICATE) + filter.sql() + " GROUP BY sale.currency", filter.params());
    }

    public List<CurrencyCount> loadSalesCountByCurrency(ExecutiveKpiScope scope) {
        var filter = numericScope(scope, "sale", "sale.sale_date");
        return jdbcTemplate.query("""
                SELECT COUNT(*) AS record_count, sale.currency AS currency
                FROM sales_records sale
                WHERE sale.deleted_at IS NULL AND %s
                """.formatted(VALID_SALE_PREDICATE) + filter.sql() + " GROUP BY sale.currency",
                (rs, rowNum) -> new CurrencyCount(rs.getString("currency"), integer(rs.getObject("record_count"))),
                filter.params().toArray());
    }

    public List<KpiMoneyAmount> loadPipelineValue(ExecutiveKpiScope scope) {
        var filter = numericScope(scope, "opportunity", null);
        return money("""
                SELECT SUM(COALESCE(opportunity.estimated_value, 0)
                           * LEAST(100, GREATEST(0, COALESCE(opportunity.probability_percent, 0))) / 100) AS amount,
                       opportunity.currency AS currency
                FROM sales_opportunities opportunity
                WHERE opportunity.deleted_at IS NULL
                  AND LOWER(COALESCE(opportunity.stage, '')) NOT IN ('won', 'lost')
                  AND LOWER(COALESCE(opportunity.status, 'open')) <> 'closed'
                """ + filter.sql() + " GROUP BY opportunity.currency", filter.params());
    }

    public List<KpiMoneyAmount> loadExpenseValue(ExecutiveKpiScope scope, String column, boolean overdueOnly) {
        if (!List.of("total_amount", "balance_amount").contains(column)) {
            throw new IllegalArgumentException("Unsupported executive expense amount column");
        }
        var isTotal = "total_amount".equals(column);
        var filter = numericScope(scope, "expense", isTotal ? "expense.expense_date" : null);
        var statusFilter = isTotal
                ? " AND expense.status IN " + ACTUAL_EXPENSE_STATUSES
                : " AND expense.status IN " + PAYABLE_EXPENSE_STATUSES + " AND expense.balance_amount > 0";
        var overdue = overdueOnly ? " AND expense.due_date < ?" : "";
        var params = new ArrayList<Object>();
        if (overdueOnly) params.add(scope.snapshotDate().toString());
        params.addAll(filter.params());
        return money("SELECT SUM(COALESCE(expense." + column + ", 0)) AS amount, expense.currency_code AS currency "
                + "FROM finance_expenses expense WHERE expense.deleted_at IS NULL "
                + statusFilter + overdue + filter.sql() + " GROUP BY expense.currency_code", params);
    }

    public List<KpiMoneyAmount> loadBudgetValue(ExecutiveKpiScope scope, String column) {
        if (!List.of("planned_amount", "committed_amount", "actual_expense_amount").contains(column)) {
            throw new IllegalArgumentException("Unsupported executive budget amount column");
        }
        var filter = numericScope(scope, "line", null);
        var params = new ArrayList<>(filter.params());
        params.add(scope.to().toString());
        params.add(scope.from().toString());
        return money("SELECT SUM(COALESCE(line." + column + ", 0)) AS amount, line.currency_code AS currency "
                + "FROM finance_budget_lines line JOIN finance_budgets budget ON budget.id = line.budget_id "
                + "AND budget.company_id = line.company_id AND budget.deleted_at IS NULL AND budget.status = 'ACTIVE' "
                + "WHERE line.deleted_at IS NULL AND line.status = 'ACTIVE'" + filter.sql()
                + " AND budget.period_start <= ? AND budget.period_end >= ? GROUP BY line.currency_code", params);
    }

    public BudgetSnapshot loadBudgetQuality(ExecutiveKpiScope scope) {
        var filter = numericScope(scope, "line", null);
        var params = new ArrayList<>(filter.params());
        params.add(scope.to().toString());
        params.add(scope.from().toString());
        return jdbcTemplate.queryForObject("""
                SELECT SUM(CASE
                           WHEN line.planned_amount < 0 OR line.committed_amount < 0
                             OR line.actual_expense_amount < 0
                           THEN 1 ELSE 0
                       END) AS invalid_amount_rows,
                       SUM(CASE
                           WHEN line.currency_code IS NULL
                             OR UPPER(TRIM(line.currency_code)) NOT REGEXP '^[A-Z]{3}$'
                           THEN 1 ELSE 0
                       END) AS invalid_currency_rows
                FROM finance_budget_lines line
                JOIN finance_budgets budget ON budget.id = line.budget_id
                    AND budget.company_id = line.company_id
                    AND budget.deleted_at IS NULL AND budget.status = 'ACTIVE'
                WHERE line.deleted_at IS NULL AND line.status = 'ACTIVE'
                """ + filter.sql() + " AND budget.period_start <= ? AND budget.period_end >= ?",
                (rs, rowNum) -> new BudgetSnapshot(
                        integer(rs.getObject("invalid_amount_rows")),
                        integer(rs.getObject("invalid_currency_rows"))), params.toArray());
    }

    public List<KpiMoneyAmount> loadPettyCashValue(ExecutiveKpiScope scope, String column) {
        if (!List.of("limit_amount", "current_balance_amount").contains(column)) {
            throw new IllegalArgumentException("Unsupported executive petty cash amount column");
        }
        var filter = numericScope(scope, "fund", null);
        return money("SELECT SUM(COALESCE(fund." + column + ", 0)) AS amount, fund.currency_code AS currency "
                + "FROM finance_petty_cash_funds fund WHERE fund.deleted_at IS NULL AND fund.status <> 'CLOSED'"
                + filter.sql() + " GROUP BY fund.currency_code", filter.params());
    }

    public List<KpiMoneyAmount> loadPettyCashSettlements(ExecutiveKpiScope scope) {
        var filter = pettyCashLineScope(scope, null);
        return money("SELECT SUM(COALESCE(line.total_amount, 0)) AS amount, line.currency_code AS currency "
                + "FROM finance_petty_cash_settlement_lines line "
                + "JOIN finance_petty_cash_funds fund ON fund.id = line.petty_cash_fund_id "
                + "AND fund.company_id = line.company_id AND fund.deleted_at IS NULL "
                + "WHERE line.deleted_at IS NULL AND line.status IN ('DRAFT', 'RECEIPT_ATTACHED', 'VALIDATED')"
                + filter.sql() + " GROUP BY line.currency_code", filter.params());
    }

    public List<KpiMoneyAmount> loadInventoryValue(ExecutiveKpiScope scope) {
        var filter = inventoryScope(scope, "balance", null);
        return money("""
                SELECT SUM(COALESCE(balance.available_quantity, 0) * COALESCE(balance.unit_cost, 0)) AS amount,
                       product.currency AS currency
                FROM sales_inventory_balances balance
                JOIN sales_products product ON product.id = balance.product_id
                    AND product.company_id = balance.company_id AND product.deleted_at IS NULL
                WHERE balance.deleted_at IS NULL AND balance.uses_inventory = 1
                """ + filter.sql() + " GROUP BY product.currency", filter.params());
    }

    private ScopeFilter pettyCashLineScope(ExecutiveKpiScope scope, String dateColumn) {
        var params = new ArrayList<Object>();
        var sql = new StringBuilder(" AND line.company_id = ?");
        params.add(scope.companyId());
        appendDate(scope, dateColumn, sql, params);
        if (scope.unitId() != null) {
            sql.append(" AND fund.unit_id = ?");
            params.add(scope.unitId());
        }
        if (scope.businessId() != null) {
            sql.append(" AND fund.business_id = ?");
            params.add(scope.businessId());
        }
        return new ScopeFilter(sql.toString(), params);
    }

    private ScopeFilter numericScope(ExecutiveKpiScope scope, String alias, String dateColumn) {
        var params = new ArrayList<Object>();
        var sql = new StringBuilder(" AND ").append(alias).append(".company_id = ?");
        params.add(scope.companyId());
        appendDate(scope, dateColumn, sql, params);
        if (scope.unitId() != null) {
            sql.append(" AND ").append(alias).append(".unit_id = ?");
            params.add(scope.unitId());
        }
        if (scope.businessId() != null) {
            sql.append(" AND ").append(alias).append(".business_id = ?");
            params.add(scope.businessId());
        }
        return new ScopeFilter(sql.toString(), params);
    }

    private ScopeFilter inventoryScope(ExecutiveKpiScope scope, String alias, String dateColumn) {
        var params = new ArrayList<Object>();
        var sql = new StringBuilder(" AND ").append(alias).append(".company_id = ?");
        params.add(scope.companyId());
        appendDate(scope, dateColumn, sql, params);
        if (scope.unitId() != null) {
            sql.append(" AND (")
                    .append(alias).append(".business_unit_id = CAST(? AS CHAR)")
                    .append(" OR EXISTS (SELECT 1 FROM units kpi_unit WHERE kpi_unit.id = ?")
                    .append(" AND (kpi_unit.company_id = ").append(alias).append(".company_id OR kpi_unit.company_id IS NULL)")
                    .append(" AND LOWER(TRIM(kpi_unit.name)) COLLATE utf8mb4_0900_ai_ci")
                    .append(" = LOWER(TRIM(").append(alias).append(".business_unit_name)) COLLATE utf8mb4_0900_ai_ci))");
            params.add(scope.unitId().toString());
            params.add(scope.unitId());
        }
        if (scope.businessId() != null) {
            sql.append(" AND (")
                    .append(alias).append(".business_id = CAST(? AS CHAR)")
                    .append(" OR EXISTS (SELECT 1 FROM businesses kpi_business WHERE kpi_business.id = ?")
                    .append(" AND (kpi_business.company_id = ").append(alias).append(".company_id OR kpi_business.company_id IS NULL)")
                    .append(" AND LOWER(TRIM(kpi_business.name)) COLLATE utf8mb4_0900_ai_ci")
                    .append(" = LOWER(TRIM(").append(alias).append(".business_name)) COLLATE utf8mb4_0900_ai_ci))");
            params.add(scope.businessId().toString());
            params.add(scope.businessId());
        }
        return new ScopeFilter(sql.toString(), params);
    }

    private void appendDate(ExecutiveKpiScope scope, String dateColumn, StringBuilder sql, List<Object> params) {
        if (dateColumn == null) return;
        sql.append(" AND ").append(dateColumn).append(" BETWEEN ? AND ?");
        params.add(scope.from().toString());
        params.add(scope.to().toString());
    }

    private List<Object> withBounds(ExecutiveKpiScope scope, List<Object> scopedParams) {
        var params = new ArrayList<Object>();
        params.add(scope.from().toString());
        params.add(scope.to().toString());
        params.addAll(scopedParams);
        return params;
    }

    private List<Object> withBoundsAndSnapshot(ExecutiveKpiScope scope, List<Object> scopedParams) {
        var params = new ArrayList<Object>();
        params.add(scope.from().toString());
        params.add(scope.to().toString());
        params.add(scope.snapshotDate().toString());
        params.addAll(scopedParams);
        return params;
    }

    private List<KpiMoneyAmount> money(String sql, List<Object> params) {
        return jdbcTemplate.query(sql, (rs, rowNum) -> new KpiMoneyAmount(
                rs.getBigDecimal("amount") == null ? BigDecimal.ZERO : rs.getBigDecimal("amount"),
                rs.getString("currency")), params.toArray());
    }

    private static int integer(Object value) {
        return value instanceof Number number ? number.intValue() : 0;
    }

    private static double decimal(Object value) {
        return value instanceof Number number ? number.doubleValue() : 0;
    }

    public record ProcessSnapshot(
            int totalTasks, int closedTasks, int overdueTasks, int pendingAuditTasks, int unassignedTasks,
            double averageCompletion, int missingScheduleDates, int invalidCompletionRows,
            int completedWithoutTimestamp, int cancelledWithoutTimestamp, int historicalMutableRows) {
    }

    public record ExpenseSnapshot(
            int expenseCount, int pendingApproval, int openPayables, int overduePayables, int missingReceipts,
            int invalidPeriodAmountRows, int invalidPayableAmountRows, int payableWithoutDueDate,
            int invalidPeriodCurrencyRows, int invalidPayableCurrencyRows) {
    }

    public record BudgetSnapshot(int invalidAmountRows, int invalidCurrencyRows) {
    }

    public record PettyCashSnapshot(
            int fundCount, int attentionFunds, int settlementCount, int pendingSettlements, int missingReceipts,
            int invalidFundAmountRows, int invalidFundCurrencyRows,
            int invalidSettlementAmountRows, int invalidSettlementCurrencyRows) {
    }

    public record InventorySnapshot(
            int trackedProducts, int stockLocations, int outOfStock, int lowStock, double availableUnits,
            double reservedUnits, int movementCount, int inTransit, int adjustments,
            int invalidQuantityRows, int invalidCurrencyRows) {
    }

    public record SalesSnapshot(
            int saleCount, int pendingFinance, int pendingInventory, int closedOpportunities, int wonOpportunities,
            int missingSaleDate, int invalidSaleAmountRows, int invalidSaleCurrencyRows,
            int missingOpportunityDate, int invalidProbabilityRows,
            int invalidOpportunityAmountRows, int invalidOpportunityCurrencyRows) {
    }

    public record CurrencyCount(String currency, int count) {
    }

    private record ScopeFilter(String sql, List<Object> params) {
    }
}
