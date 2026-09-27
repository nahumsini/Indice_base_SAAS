package com.indice.erp.kpis.executive;

import com.indice.erp.kpis.currency.KpiMoneyAmount;
import com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ExecutiveKpiDomainRepository {

    private static final String ACTUAL_EXPENSE_STATUSES = "('APPROVED', 'PARTIALLY_PAID', 'PAID', 'CLOSED')";
    private static final String OPEN_PAYMENT_STATUSES = "('UNPAID', 'PARTIALLY_PAID', 'OVERDUE')";
    private static final String VALID_SALE_PREDICATE =
            "LOWER(COALESCE(sale.commercial_status, '')) NOT IN ('cancelled', 'canceled', 'rejected', 'voided')";

    private final JdbcTemplate jdbcTemplate;
    private final FinanceBusinessTimeZoneResolver timeZones;

    public ExecutiveKpiDomainRepository(JdbcTemplate jdbcTemplate, FinanceBusinessTimeZoneResolver timeZones) {
        this.jdbcTemplate = jdbcTemplate;
        this.timeZones = timeZones;
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
                             WHEN expense.payment_status IN %2$s AND expense.balance_amount > 0
                             THEN 1 ELSE 0
                           END) AS open_payables,
                       SUM(CASE
                             WHEN expense.payment_status IN %2$s AND expense.balance_amount > 0
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
                             WHEN expense.payment_status IN %2$s
                              AND (expense.total_amount < 0 OR expense.paid_amount < 0 OR expense.balance_amount < 0
                                   OR ABS(expense.balance_amount - GREATEST(expense.total_amount - expense.paid_amount, 0)) > 0.01)
                             THEN 1 ELSE 0
                           END) AS invalid_payable_amount_rows,
                       SUM(CASE
                             WHEN expense.payment_status IN %2$s AND expense.balance_amount > 0 AND expense.due_date IS NULL
                             THEN 1 ELSE 0
                           END) AS payable_without_due_date,
                       SUM(CASE
                             WHEN expense.status IN %1$s
                              AND expense.expense_date BETWEEN bounds.from_date AND bounds.to_date
                               AND (expense.currency_code IS NULL OR UPPER(TRIM(expense.currency_code)) NOT REGEXP '^[A-Z]{3}$')
                             THEN 1 ELSE 0
                           END) AS invalid_period_currency_rows,
                       SUM(CASE
                             WHEN expense.payment_status IN %2$s AND expense.balance_amount > 0
                              AND (expense.currency_code IS NULL OR UPPER(TRIM(expense.currency_code)) NOT REGEXP '^[A-Z]{3}$')
                             THEN 1 ELSE 0
                           END) AS invalid_payable_currency_rows,
                       SUM(CASE
                             WHEN expense.status IN %1$s
                              AND expense.expense_date BETWEEN bounds.from_date AND bounds.to_date
                              AND NOT EXISTS (
                                  SELECT 1
                                  FROM finance_budget_lines budget_line
                                  JOIN finance_budgets budget
                                    ON budget.id = budget_line.budget_id
                                   AND budget.company_id = budget_line.company_id
                                   AND budget.deleted_at IS NULL
                                   AND budget.status = 'ACTIVE'
                                   AND expense.expense_date BETWEEN budget.period_start AND budget.period_end
                                  WHERE budget_line.id = expense.budget_line_id
                                    AND budget_line.company_id = expense.company_id
                                    AND budget_line.deleted_at IS NULL
                                    AND budget_line.status = 'ACTIVE'
                              )
                             THEN 1 ELSE 0
                           END) AS expenses_outside_active_budget
                FROM finance_expenses expense
                CROSS JOIN bounds
                WHERE expense.deleted_at IS NULL
                  AND expense.status NOT IN ('CANCELLED', 'REJECTED')
                """.formatted(ACTUAL_EXPENSE_STATUSES, OPEN_PAYMENT_STATUSES) + filter.sql(),
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
                        integer(rs.getObject("invalid_payable_currency_rows")),
                        integer(rs.getObject("expenses_outside_active_budget"))), params.toArray());
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
                WHERE fund.deleted_at IS NULL AND fund.status <> 'CLOSED' AND fund.fund_type = 'INTERNAL_COMPANY'
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
                WHERE line.deleted_at IS NULL AND line.status NOT IN ('REJECTED', 'REVERSED')
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

    public List<ProductPortfolioSalesRow> loadProductPortfolioSales(ExecutiveKpiScope scope) {
        var filter = numericScope(scope, "sale", "sale.sale_date");
        return jdbcTemplate.query("""
                SELECT product.id AS product_id,
                       product.name AS product_name,
                       COALESCE(product.sku, '') AS sku,
                       COALESCE(NULLIF(TRIM(product.category), ''), 'uncategorized') AS category,
                       UPPER(TRIM(sale.currency)) AS currency,
                       UPPER(COALESCE(NULLIF(TRIM(line.cost_currency), ''), sale.currency)) AS cost_currency,
                       SUM(COALESCE(line.subtotal_amount, line.pos_total - line.pos_tax)) AS revenue,
                       SUM(CASE
                           WHEN line.unit_cost IS NOT NULL AND line.unit_cost >= 0
                           THEN line.quantity * line.unit_cost
                           ELSE 0
                       END) AS cost,
                       SUM(line.quantity) AS units,
                       COUNT(DISTINCT sale.id) AS sale_count,
                       SUM(CASE WHEN line.unit_cost IS NULL OR line.unit_cost < 0 THEN 1 ELSE 0 END)
                           AS missing_cost_lines
                FROM sales_records sale
                JOIN JSON_TABLE(
                    COALESCE(sale.sale_lines_json, JSON_ARRAY()),
                    '$[*]' COLUMNS (
                        product_id BIGINT PATH '$.productId' NULL ON EMPTY NULL ON ERROR,
                        quantity DECIMAL(19,4) PATH '$.quantity' NULL ON EMPTY NULL ON ERROR,
                        subtotal_amount DECIMAL(19,4) PATH '$.subtotal' NULL ON EMPTY NULL ON ERROR,
                        pos_total DECIMAL(19,4) PATH '$.lineTotalAmount' NULL ON EMPTY NULL ON ERROR,
                        pos_tax DECIMAL(19,4) PATH '$.taxAmount' NULL ON EMPTY NULL ON ERROR,
                        cost_currency VARCHAR(3) PATH '$.costCurrency' NULL ON EMPTY NULL ON ERROR,
                        discount_percent DECIMAL(9,4) PATH '$.discountPercent' NULL ON EMPTY NULL ON ERROR,
                        unit_cost DECIMAL(19,4) PATH '$.unitCost' NULL ON EMPTY NULL ON ERROR
                    )
                ) line
                JOIN sales_products product ON product.id = line.product_id
                    AND product.company_id = sale.company_id
                    AND product.deleted_at IS NULL
                WHERE sale.deleted_at IS NULL AND %s
                  AND line.product_id IS NOT NULL
                  AND line.quantity > 0
                  AND COALESCE(line.subtotal_amount, line.pos_total - line.pos_tax) >= 0
                """.formatted(VALID_SALE_PREDICATE) + filter.sql()
                + " GROUP BY product.id, product.name, product.sku, product.category, UPPER(TRIM(sale.currency)), UPPER(COALESCE(NULLIF(TRIM(line.cost_currency), ''), sale.currency))",
                (rs, rowNum) -> new ProductPortfolioSalesRow(
                rs.getLong("product_id"),
                rs.getString("product_name"),
                rs.getString("sku"),
                rs.getString("category"),
                rs.getString("currency"),
                rs.getBigDecimal("revenue"),
                rs.getBigDecimal("cost"),
                rs.getBigDecimal("units"),
                integer(rs.getObject("sale_count")),
                integer(rs.getObject("missing_cost_lines")), rs.getString("cost_currency")), filter.params().toArray());
    }

    public ProductPortfolioSalesQuality loadProductPortfolioSalesQuality(ExecutiveKpiScope scope) {
        var filter = numericScope(scope, "sale", "sale.sale_date");
        return jdbcTemplate.queryForObject("""
                SELECT COUNT(DISTINCT sale.id) AS sale_records,
                       COUNT(DISTINCT CASE
                           WHEN JSON_LENGTH(COALESCE(sale.sale_lines_json, JSON_ARRAY())) = 0 THEN sale.id
                       END) AS sales_without_lines,
                       COUNT(DISTINCT CASE
                           WHEN line.product_id IS NOT NULL AND line.quantity > 0
                            AND COALESCE(line.subtotal_amount, line.pos_total - line.pos_tax) >= 0 AND product.id IS NOT NULL THEN sale.id
                       END) AS attributed_sales,
                       SUM(CASE
                           WHEN JSON_LENGTH(COALESCE(sale.sale_lines_json, JSON_ARRAY())) > 0
                            AND (line.product_id IS NULL OR line.quantity IS NULL OR line.quantity <= 0
                                 OR COALESCE(line.subtotal_amount, line.pos_total - line.pos_tax) IS NULL OR COALESCE(line.subtotal_amount, line.pos_total - line.pos_tax) < 0
                                 OR line.discount_percent < 0 OR line.discount_percent > 100)
                           THEN 1 ELSE 0
                       END) AS invalid_line_rows,
                       SUM(CASE
                           WHEN JSON_LENGTH(COALESCE(sale.sale_lines_json, JSON_ARRAY())) > 0
                            AND line.product_id IS NOT NULL AND product.id IS NULL
                           THEN 1 ELSE 0
                       END) AS unlinked_product_rows,
                       COUNT(DISTINCT CASE
                           WHEN sale.currency IS NULL OR UPPER(TRIM(sale.currency)) NOT REGEXP '^[A-Z]{3}$'
                           THEN sale.id
                       END) AS invalid_currency_records
                FROM sales_records sale
                LEFT JOIN JSON_TABLE(
                    COALESCE(sale.sale_lines_json, JSON_ARRAY()),
                    '$[*]' COLUMNS (
                        product_id BIGINT PATH '$.productId' NULL ON EMPTY NULL ON ERROR,
                        quantity DECIMAL(19,4) PATH '$.quantity' NULL ON EMPTY NULL ON ERROR,
                        subtotal_amount DECIMAL(19,4) PATH '$.subtotal' NULL ON EMPTY NULL ON ERROR,
                        pos_total DECIMAL(19,4) PATH '$.lineTotalAmount' NULL ON EMPTY NULL ON ERROR,
                        pos_tax DECIMAL(19,4) PATH '$.taxAmount' NULL ON EMPTY NULL ON ERROR,
                        cost_currency VARCHAR(3) PATH '$.costCurrency' NULL ON EMPTY NULL ON ERROR,
                        discount_percent DECIMAL(9,4) PATH '$.discountPercent' NULL ON EMPTY NULL ON ERROR
                    )
                ) line ON TRUE
                LEFT JOIN sales_products product ON product.id = line.product_id
                    AND product.company_id = sale.company_id
                    AND product.deleted_at IS NULL
                WHERE sale.deleted_at IS NULL AND %s
                """.formatted(VALID_SALE_PREDICATE) + filter.sql(), (rs, rowNum) -> new ProductPortfolioSalesQuality(
                integer(rs.getObject("sale_records")),
                integer(rs.getObject("attributed_sales")),
                integer(rs.getObject("sales_without_lines")),
                integer(rs.getObject("invalid_line_rows")),
                integer(rs.getObject("unlinked_product_rows")),
                integer(rs.getObject("invalid_currency_records"))), filter.params().toArray());
    }

    public List<ProductPortfolioInventoryRow> loadProductPortfolioInventory(ExecutiveKpiScope scope) {
        var filter = inventoryScope(scope, "balance", null);
        return jdbcTemplate.query("""
                SELECT balance.product_id,
                       COUNT(*) AS stock_locations,
                       SUM(COALESCE(balance.available_quantity, 0)) AS available_quantity,
                       SUM(COALESCE(balance.minimum_quantity, 0)) AS minimum_quantity,
                       SUM(CASE WHEN balance.available_quantity <= 0 THEN 1 ELSE 0 END) AS out_of_stock_locations,
                       SUM(CASE
                           WHEN balance.available_quantity > 0
                            AND balance.available_quantity <= balance.minimum_quantity THEN 1 ELSE 0
                       END) AS low_stock_locations,
                       SUM(CASE
                           WHEN balance.available_quantity < 0 OR balance.minimum_quantity < 0
                            OR balance.reserved_quantity < 0 THEN 1 ELSE 0
                       END) AS invalid_quantity_rows
                FROM sales_inventory_balances balance
                JOIN sales_products product ON product.id = balance.product_id
                    AND product.company_id = balance.company_id
                    AND product.deleted_at IS NULL
                WHERE balance.deleted_at IS NULL AND balance.uses_inventory = 1
                """ + filter.sql() + " GROUP BY balance.product_id", (rs, rowNum) -> new ProductPortfolioInventoryRow(
                rs.getLong("product_id"),
                rs.getBigDecimal("available_quantity"),
                rs.getBigDecimal("minimum_quantity"),
                integer(rs.getObject("stock_locations")),
                integer(rs.getObject("out_of_stock_locations")),
                integer(rs.getObject("low_stock_locations")),
                integer(rs.getObject("invalid_quantity_rows"))), filter.params().toArray());
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
                : " AND expense.payment_status IN " + OPEN_PAYMENT_STATUSES + " AND expense.balance_amount > 0"
                        + " AND expense.status NOT IN ('CANCELLED', 'REJECTED')";
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
                + "FROM finance_petty_cash_funds fund WHERE fund.deleted_at IS NULL AND fund.status <> 'CLOSED' AND fund.fund_type = 'INTERNAL_COMPANY'"
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

    public ReceivablesSnapshot loadReceivables(ExecutiveKpiScope scope) {
        var accountFilter = numericScope(scope, "account", null);
        var accounts = jdbcTemplate.queryForObject("""
                SELECT SUM(CASE WHEN account.balance_amount > 0 THEN 1 ELSE 0 END) AS accounts_with_debt,
                       COUNT(DISTINCT CASE WHEN account.balance_amount > 0 THEN account.contact_id END) AS customers_with_debt,
                       SUM(CASE
                             WHEN account.original_amount < 0 OR account.total_payable_amount < 0
                               OR account.paid_amount < 0 OR account.balance_amount < 0
                               OR ABS(account.balance_amount - GREATEST(account.total_payable_amount - account.paid_amount, 0)) > 0.01
                             THEN 1 ELSE 0
                           END) AS invalid_amount_rows,
                       SUM(CASE
                             WHEN account.currency_code IS NULL
                               OR UPPER(TRIM(account.currency_code)) NOT REGEXP '^[A-Z]{3}$'
                             THEN 1 ELSE 0
                           END) AS invalid_currency_rows,
                       SUM(CASE
                             WHEN account.balance_amount > 0 AND NOT EXISTS (
                               SELECT 1 FROM finance_receivable_installments schedule
                               WHERE schedule.company_id = account.company_id
                                 AND schedule.receivable_id = account.id
                                 AND schedule.status <> 'CANCELLED'
                                 AND schedule.balance_amount > 0
                             )
                             THEN 1 ELSE 0
                           END) AS accounts_without_schedule
                FROM finance_receivable_accounts account
                WHERE account.deleted_at IS NULL AND account.status <> 'CANCELLED'
                """ + accountFilter.sql(), (rs, rowNum) -> new int[] {
                integer(rs.getObject("accounts_with_debt")),
                integer(rs.getObject("customers_with_debt")),
                integer(rs.getObject("invalid_amount_rows")),
                integer(rs.getObject("invalid_currency_rows")),
                integer(rs.getObject("accounts_without_schedule"))
        }, accountFilter.params().toArray());

        var installmentFilter = numericScope(scope, "account", null);
        var installmentParams = new ArrayList<Object>();
        installmentParams.add(scope.snapshotDate().toString());
        installmentParams.addAll(installmentFilter.params());
        var installments = jdbcTemplate.queryForObject("""
                SELECT SUM(CASE
                             WHEN installment.balance_amount > 0 AND installment.due_date < ? THEN 1 ELSE 0
                           END) AS overdue_installments,
                       SUM(CASE
                             WHEN installment.amount <= 0 OR installment.paid_amount < 0
                               OR installment.balance_amount < 0 OR installment.balance_amount > installment.amount
                               OR (installment.balance_amount > 0 AND installment.due_date IS NULL)
                             THEN 1 ELSE 0
                           END) AS invalid_rows,
                       SUM(CASE
                             WHEN installment.currency_code IS NULL
                               OR UPPER(TRIM(installment.currency_code)) NOT REGEXP '^[A-Z]{3}$'
                             THEN 1 ELSE 0
                           END) AS invalid_currency_rows
                FROM finance_receivable_installments installment
                JOIN finance_receivable_accounts account
                  ON account.company_id = installment.company_id AND account.id = installment.receivable_id
                WHERE account.deleted_at IS NULL AND account.status <> 'CANCELLED'
                  AND installment.status <> 'CANCELLED'
                """ + installmentFilter.sql(), (rs, rowNum) -> new int[] {
                integer(rs.getObject("overdue_installments")),
                integer(rs.getObject("invalid_rows")),
                integer(rs.getObject("invalid_currency_rows"))
        }, installmentParams.toArray());

        var paymentFilter = numericScope(scope, "account", null);
        var paymentParams = new ArrayList<Object>();
        paymentParams.add(scope.from().toString());
        paymentParams.add(scope.to().toString());
        paymentParams.add(scope.from().toString());
        paymentParams.add(scope.to().toString());
        paymentParams.add(scope.snapshotDate().toString());
        paymentParams.addAll(paymentFilter.params());
        var payments = jdbcTemplate.queryForObject("""
                SELECT SUM(CASE WHEN payment.payment_date BETWEEN ? AND ? THEN 1 ELSE 0 END) AS period_payments,
                       SUM(CASE
                             WHEN payment.payment_date BETWEEN ? AND ?
                               AND payment.receipt_object_key IS NOT NULL
                             THEN 1 ELSE 0
                           END) AS period_payments_with_receipt,
                       SUM(CASE
                             WHEN payment.amount <= 0 OR payment.payment_date IS NULL OR payment.payment_date > ?
                               OR payment.currency_code IS NULL
                               OR UPPER(TRIM(payment.currency_code)) NOT REGEXP '^[A-Z]{3}$'
                             THEN 1 ELSE 0
                           END) AS invalid_rows
                FROM finance_receivable_payments payment
                JOIN finance_receivable_accounts account
                  ON account.company_id = payment.company_id AND account.id = payment.receivable_id
                WHERE account.deleted_at IS NULL
                """ + paymentFilter.sql(), (rs, rowNum) -> new int[] {
                integer(rs.getObject("period_payments")),
                integer(rs.getObject("period_payments_with_receipt")),
                integer(rs.getObject("invalid_rows"))
        }, paymentParams.toArray());

        return new ReceivablesSnapshot(accounts[0], accounts[1], installments[0], payments[0], payments[1],
                accounts[2], accounts[3], accounts[4], installments[1], installments[2], payments[2]);
    }

    public List<KpiMoneyAmount> loadReceivableAccountValue(ExecutiveKpiScope scope) {
        var filter = numericScope(scope, "account", null);
        return money("""
                SELECT SUM(account.balance_amount) AS amount, account.currency_code AS currency
                FROM finance_receivable_accounts account
                WHERE account.deleted_at IS NULL AND account.status <> 'CANCELLED' AND account.balance_amount > 0
                """ + filter.sql() + " GROUP BY account.currency_code", filter.params());
    }

    public List<KpiMoneyAmount> loadReceivableInstallmentValue(ExecutiveKpiScope scope, String mode) {
        if (!List.of("overdue", "dueSoon").contains(mode)) {
            throw new IllegalArgumentException("Unsupported executive receivable installment mode");
        }
        var filter = numericScope(scope, "account", null);
        var params = new ArrayList<Object>();
        var temporalFilter = "overdue".equals(mode)
                ? " AND installment.due_date < ?"
                : " AND installment.due_date BETWEEN ? AND ?";
        params.add(scope.snapshotDate().toString());
        if ("dueSoon".equals(mode)) params.add(scope.snapshotDate().plusDays(30).toString());
        params.addAll(filter.params());
        return money("""
                SELECT SUM(installment.balance_amount) AS amount, installment.currency_code AS currency
                FROM finance_receivable_installments installment
                JOIN finance_receivable_accounts account
                  ON account.company_id = installment.company_id AND account.id = installment.receivable_id
                WHERE account.deleted_at IS NULL AND account.status <> 'CANCELLED'
                  AND installment.status <> 'CANCELLED' AND installment.balance_amount > 0
                """ + temporalFilter + filter.sql() + " GROUP BY installment.currency_code", params);
    }

    public List<KpiMoneyAmount> loadReceivablePaymentValue(ExecutiveKpiScope scope) {
        var filter = numericScope(scope, "account", null);
        var params = new ArrayList<Object>();
        params.add(scope.from().toString());
        params.add(scope.to().toString());
        params.add(scope.snapshotDate().toString());
        params.addAll(filter.params());
        return money("""
                SELECT SUM(payment.amount) AS amount, payment.currency_code AS currency
                FROM finance_receivable_payments payment
                JOIN finance_receivable_accounts account
                  ON account.company_id = payment.company_id AND account.id = payment.receivable_id
                WHERE account.deleted_at IS NULL
                  AND payment.payment_date BETWEEN ? AND ? AND payment.payment_date <= ?
                """ + filter.sql() + " GROUP BY payment.currency_code", params);
    }

    public PointOfSaleSnapshot loadPointOfSale(ExecutiveKpiScope scope) {
        var closingFilter = closingScope(scope);
        var closing = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) AS closing_count,
                       COALESCE(SUM(closing.tickets_count), 0) AS ticket_count,
                       SUM(CASE WHEN ABS(closing.over_short_amount) > 0 THEN 1 ELSE 0 END) AS closings_with_difference,
                       SUM(CASE
                             WHEN closing.opening_cash_amount < 0 OR closing.cash_sales_amount < 0
                               OR closing.expected_cash_amount < 0 OR closing.counted_cash_amount < 0
                               OR closing.total_sales_amount < 0 OR closing.total_refunds_amount < 0
                             THEN 1 ELSE 0
                           END) AS invalid_amount_rows,
                       SUM(CASE
                             WHEN shift.currency_code IS NULL
                               OR UPPER(TRIM(shift.currency_code)) NOT REGEXP '^[A-Z]{3}$'
                             THEN 1 ELSE 0
                           END) AS invalid_currency_rows,
                       SUM(CASE WHEN closing.tickets_count < 0 THEN 1 ELSE 0 END) AS invalid_ticket_count_rows
                FROM pos_cash_closings closing
                JOIN pos_shifts shift ON shift.company_id = closing.company_id AND shift.id = closing.shift_id
                WHERE closing.deleted_at IS NULL
                """ + closingFilter.sql(), (rs, rowNum) -> new int[] {
                integer(rs.getObject("closing_count")), integer(rs.getObject("ticket_count")),
                integer(rs.getObject("closings_with_difference")), integer(rs.getObject("invalid_amount_rows")),
                integer(rs.getObject("invalid_currency_rows")), integer(rs.getObject("invalid_ticket_count_rows"))
        }, closingFilter.params().toArray());
        var shiftFilter = numericScope(scope, "shift", null);
        var openShifts = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM pos_shifts shift
                WHERE shift.deleted_at IS NULL AND shift.status IN ('OPEN', 'CLOSING')
                """ + shiftFilter.sql(), Integer.class, shiftFilter.params().toArray());
        return new PointOfSaleSnapshot(closing[0], closing[1], closing[2], openShifts == null ? 0 : openShifts,
                closing[3], closing[4], closing[5]);
    }

    public List<KpiMoneyAmount> loadPointOfSaleValue(ExecutiveKpiScope scope, String metric) {
        var expression = switch (metric) {
            case "totalSales" -> "closing.total_sales_amount";
            case "cashSales" -> "closing.cash_sales_amount";
            case "absoluteDifference" -> "ABS(closing.over_short_amount)";
            case "refunds" -> "closing.total_refunds_amount";
            default -> throw new IllegalArgumentException("Unsupported executive point-of-sale metric");
        };
        var filter = closingScope(scope);
        return money("SELECT SUM(" + expression + ") AS amount, shift.currency_code AS currency "
                + "FROM pos_cash_closings closing JOIN pos_shifts shift ON shift.company_id = closing.company_id "
                + "AND shift.id = closing.shift_id WHERE closing.deleted_at IS NULL"
                + filter.sql() + " GROUP BY shift.currency_code", filter.params());
    }

    public List<CurrencyCount> loadPointOfSaleTicketCountByCurrency(ExecutiveKpiScope scope) {
        var filter = closingScope(scope);
        return jdbcTemplate.query("""
                SELECT COALESCE(SUM(closing.tickets_count), 0) AS record_count, shift.currency_code AS currency
                FROM pos_cash_closings closing
                JOIN pos_shifts shift ON shift.company_id = closing.company_id AND shift.id = closing.shift_id
                WHERE closing.deleted_at IS NULL
                """ + filter.sql() + " GROUP BY shift.currency_code",
                (rs, rowNum) -> new CurrencyCount(rs.getString("currency"), integer(rs.getObject("record_count"))),
                filter.params().toArray());
    }

    public PeopleSnapshot loadPeople(ExecutiveKpiScope scope) {
        var params = new ArrayList<Object>();
        params.add(scope.from().toString());
        params.add(scope.to().toString());
        params.add(scope.companyId());
        var narrowerScope = new StringBuilder();
        if (scope.unitId() != null) {
            narrowerScope.append(" AND person.unit_id = ?");
            params.add(scope.unitId());
        }
        if (scope.businessId() != null) {
            narrowerScope.append(" AND person.business_id = ?");
            params.add(scope.businessId());
        }

        return jdbcTemplate.queryForObject("""
                WITH bounds AS (SELECT CAST(? AS DATE) AS from_date, CAST(? AS DATE) AS to_date)
                SELECT COUNT(DISTINCT person.user_company_id) AS active_collaborators,
                       SUM(CASE WHEN attendance.id IS NOT NULL THEN 1 ELSE 0 END) AS attendance_records,
                       SUM(CASE
                             WHEN LOWER(COALESCE(attendance.corrected_status, attendance.system_status, ''))
                                  IN ('on_time', 'late', 'absence')
                             THEN 1 ELSE 0
                           END) AS scheduled_attendance_records,
                       SUM(CASE
                             WHEN LOWER(COALESCE(attendance.corrected_status, attendance.system_status, '')) = 'absence'
                             THEN 1 ELSE 0
                           END) AS absence_records,
                       SUM(CASE
                             WHEN LOWER(COALESCE(attendance.corrected_status, attendance.system_status, '')) = 'late'
                               OR (LOWER(COALESCE(attendance.corrected_status, attendance.system_status, '')) = 'on_time'
                                   AND COALESCE(attendance.minutes_late, 0) > 0)
                             THEN 1 ELSE 0
                           END) AS late_records,
                       SUM(CASE
                             WHEN attendance.id IS NOT NULL
                              AND LOWER(COALESCE(attendance.corrected_status, attendance.system_status, ''))
                                  NOT IN ('on_time', 'late', 'leave', 'rest', 'absence', 'pending', 'not_scheduled')
                             THEN 1 ELSE 0
                           END) AS invalid_status_rows,
                       SUM(CASE WHEN COALESCE(attendance.minutes_late, 0) < 0 THEN 1 ELSE 0 END)
                           AS invalid_minutes_rows
                FROM hr_users person
                CROSS JOIN bounds
                LEFT JOIN user_attendance_daily_records attendance
                  ON attendance.company_id = person.company_id
                 AND attendance.user_company_id = person.user_company_id
                 AND attendance.attendance_date BETWEEN bounds.from_date AND bounds.to_date
                WHERE person.company_id = ?
                  AND LOWER(COALESCE(person.status, 'active')) IN ('active', 'activo')
                """ + narrowerScope,
                (rs, rowNum) -> new PeopleSnapshot(
                        integer(rs.getObject("active_collaborators")),
                        integer(rs.getObject("attendance_records")),
                        integer(rs.getObject("scheduled_attendance_records")),
                        integer(rs.getObject("absence_records")),
                        integer(rs.getObject("late_records")),
                        integer(rs.getObject("invalid_status_rows")),
                        integer(rs.getObject("invalid_minutes_rows"))),
                params.toArray());
    }

    private ScopeFilter pettyCashLineScope(ExecutiveKpiScope scope, String dateColumn) {
        var params = new ArrayList<Object>();
        var sql = new StringBuilder(" AND line.company_id = ? AND fund.fund_type = 'INTERNAL_COMPANY'");
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

    private ScopeFilter closingScope(ExecutiveKpiScope scope) {
        var organization = numericScope(scope, "closing", null);
        var zone = timeZones.resolve(scope.companyId());
        var params = new ArrayList<>(organization.params());
        params.add(java.sql.Timestamp.from(scope.from().atStartOfDay(zone).toInstant()));
        params.add(java.sql.Timestamp.from(scope.to().plusDays(1).atStartOfDay(zone).toInstant()));
        // TIMESTAMP storage is UTC; reporting periods belong to the company's business timezone.
        return new ScopeFilter(organization.sql() + " AND closing.closed_at >= ? AND closing.closed_at < ?", params);
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
            int invalidPeriodCurrencyRows, int invalidPayableCurrencyRows, int expensesOutsideActiveBudget) {
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

    public record ReceivablesSnapshot(
            int accountsWithDebt,
            int customersWithDebt,
            int overdueInstallments,
            int periodPayments,
            int periodPaymentsWithReceipt,
            int invalidAccountAmountRows,
            int invalidAccountCurrencyRows,
            int accountsWithoutOpenSchedule,
            int invalidInstallmentRows,
            int invalidInstallmentCurrencyRows,
            int invalidPaymentRows) {
    }

    public record PointOfSaleSnapshot(
            int closingCount,
            int ticketCount,
            int closingsWithDifference,
            int openShifts,
            int invalidAmountRows,
            int invalidCurrencyRows,
            int invalidTicketCountRows) {
    }

    public record ProductPortfolioSalesRow(
            long productId,
            String productName,
            String sku,
            String category,
            String currency,
            BigDecimal revenue,
            BigDecimal cost,
            BigDecimal units,
            int saleCount,
            int missingCostLines,
            String costCurrency) {
        public ProductPortfolioSalesRow(long productId, String productName, String sku, String category, String currency,
                                        BigDecimal revenue, BigDecimal cost, BigDecimal units, int saleCount, int missingCostLines) {
            this(productId, productName, sku, category, currency, revenue, cost, units, saleCount, missingCostLines, currency);
        }
    }

    public record ProductPortfolioSalesQuality(
            int saleRecords,
            int attributedSales,
            int salesWithoutLines,
            int invalidLineRows,
            int unlinkedProductRows,
            int invalidCurrencyRecords) {
    }

    public record ProductPortfolioInventoryRow(
            long productId,
            BigDecimal availableQuantity,
            BigDecimal minimumQuantity,
            int stockLocations,
            int outOfStockLocations,
            int lowStockLocations,
            int invalidQuantityRows) {
    }

    public record PeopleSnapshot(
            int activeCollaborators,
            int attendanceRecords,
            int scheduledAttendanceRecords,
            int absenceRecords,
            int lateRecords,
            int invalidStatusRows,
            int invalidMinutesRows) {
    }

    public record CurrencyCount(String currency, int count) {
    }

    private record ScopeFilter(String sql, List<Object> params) {
    }
}
