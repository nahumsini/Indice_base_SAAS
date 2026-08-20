package com.indice.erp.kpis.currency;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class BasicModuleKpiCurrencyRepository {

    private final JdbcTemplate jdbcTemplate;

    public BasicModuleKpiCurrencyRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<KpiMoneyAmount> load(
        BasicModuleKpiMetric metric,
        long companyId,
        LocalDate from,
        LocalDate to,
        List<Long> ids,
        boolean restrictToIds
    ) {
        var definition = definition(metric);
        var params = new ArrayList<Object>();
        params.add(companyId);
        var dateClause = "";
        if (definition.dateColumn() != null && from != null) {
            dateClause += " AND " + definition.dateColumn() + " >= ?";
            params.add(from);
        }
        if (definition.dateColumn() != null && to != null) {
            dateClause += " AND " + definition.dateColumn() + " <= ?";
            params.add(to);
        }
        var idClause = "";
        if (restrictToIds && (ids == null || ids.isEmpty())) {
            idClause = " AND 1 = 0";
        } else if (ids != null && !ids.isEmpty()) {
            idClause = " AND " + definition.idColumn() + " IN (" + String.join(",", java.util.Collections.nCopies(ids.size(), "?")) + ")";
            params.addAll(ids);
        }
        var sql = "SELECT " + definition.amountColumn() + " AS amount, "
            + definition.currencyColumn() + " AS currency FROM " + definition.table()
            + " WHERE " + definition.companyColumn() + " = ?" + definition.baseFilter() + dateClause + idClause;

        return jdbcTemplate.query(sql, (rs, rowNum) -> new KpiMoneyAmount(
            rs.getBigDecimal("amount"),
            rs.getString("currency")
        ), params.toArray());
    }

    private MetricDefinition definition(BasicModuleKpiMetric metric) {
        return switch (metric) {
            case SALES_TOTAL -> new MetricDefinition("sales_records", "total_amount", "currency", "sale_date", " AND deleted_at IS NULL");
            case SALES_TAX -> new MetricDefinition("sales_records", "tax_total", "currency", "sale_date", " AND deleted_at IS NULL");
            case SALES_COMMISSION -> new MetricDefinition("sales_records", "commission_amount", "currency", "sale_date", " AND deleted_at IS NULL");
            case SALES_OPPORTUNITY_PIPELINE -> opportunityQuoteDefinition(
                " AND LOWER(COALESCE(o.stage, '')) NOT IN ('won', 'lost')"
            );
            case SALES_OPPORTUNITY_WON -> opportunityQuoteDefinition(
                " AND LOWER(COALESCE(o.stage, '')) = 'won'"
            );
            case SALES_OPPORTUNITY_LOST -> opportunityQuoteDefinition(
                " AND LOWER(COALESCE(o.stage, '')) = 'lost'"
            );
            case PRODUCT_INVENTORY_VALUE -> inventoryBalanceDefinition("b.available_quantity * b.unit_cost", "b.product_id");
            case PRODUCT_ESTIMATED_PROFIT -> inventoryBalanceDefinition("b.available_quantity * (COALESCE(p.price, 0) - COALESCE(p.cost, 0))", "b.product_id");
            case INVENTORY_BALANCE_VALUE -> inventoryBalanceDefinition("b.available_quantity * b.unit_cost", "b.id");
            case INVENTORY_MOVEMENT_VALUE -> new MetricDefinition(
                "sales_inventory_movements m JOIN sales_products p ON p.id = m.product_id AND p.company_id = m.company_id",
                "ABS(m.quantity) * COALESCE(m.unit_cost, 0)",
                "p.currency",
                "m.movement_date",
                " AND m.deleted_at IS NULL AND LOWER(m.status) = 'intransit'",
                "m.id",
                "m.company_id"
            );
            case EXPENSE_TOTAL -> new MetricDefinition("finance_expenses", "total_amount", "currency_code", "expense_date", " AND deleted_at IS NULL AND status NOT IN ('CANCELLED', 'REJECTED')");
            case EXPENSE_PAID -> new MetricDefinition("finance_expenses", "paid_amount", "currency_code", "expense_date", " AND deleted_at IS NULL AND status NOT IN ('CANCELLED', 'REJECTED')");
            case EXPENSE_SUBTOTAL -> new MetricDefinition("finance_expenses", "subtotal_amount", "currency_code", "expense_date", " AND deleted_at IS NULL AND status NOT IN ('CANCELLED', 'REJECTED')");
            case EXPENSE_TAX -> new MetricDefinition("finance_expenses", "tax_amount", "currency_code", "expense_date", " AND deleted_at IS NULL AND status NOT IN ('CANCELLED', 'REJECTED')");
            case EXPENSE_BALANCE -> new MetricDefinition("finance_expenses", "balance_amount", "currency_code", "expense_date", " AND deleted_at IS NULL AND status NOT IN ('CANCELLED', 'REJECTED')");
            case EXPENSE_OVERDUE_BALANCE -> new MetricDefinition("finance_expenses", "balance_amount", "currency_code", "expense_date", " AND deleted_at IS NULL AND status NOT IN ('CANCELLED', 'REJECTED') AND balance_amount > 0 AND due_date < CURRENT_DATE()");
            case EXPENSE_DUE_SOON_BALANCE -> new MetricDefinition("finance_expenses", "balance_amount", "currency_code", "expense_date", " AND deleted_at IS NULL AND status NOT IN ('CANCELLED', 'REJECTED') AND balance_amount > 0 AND due_date BETWEEN CURRENT_DATE() AND DATE_ADD(CURRENT_DATE(), INTERVAL 7 DAY)");
            case BUDGET_PLANNED -> new MetricDefinition("finance_budget_lines", "planned_amount", "currency_code", "created_at", " AND deleted_at IS NULL AND status = 'ACTIVE'");
            case BUDGET_COMMITTED -> new MetricDefinition("finance_budget_lines", "committed_amount", "currency_code", "created_at", " AND deleted_at IS NULL AND status = 'ACTIVE'");
            case BUDGET_ACTUAL -> new MetricDefinition("finance_budget_lines", "actual_expense_amount", "currency_code", "created_at", " AND deleted_at IS NULL AND status = 'ACTIVE'");
            case BUDGET_AVAILABLE -> new MetricDefinition("finance_budget_lines", "available_amount", "currency_code", "created_at", " AND deleted_at IS NULL");
            case RECEIVABLE_BALANCE -> new MetricDefinition("finance_receivable_accounts", "balance_amount", "currency_code", "created_at", " AND deleted_at IS NULL AND status <> 'CANCELLED'");
            case RECEIVABLE_INSTALLMENT_BALANCE -> new MetricDefinition("finance_receivable_installments", "balance_amount", "currency_code", "due_date", " AND status <> 'CANCELLED'");
            case RECEIVABLE_PAYMENT_AMOUNT -> new MetricDefinition("finance_receivable_payments", "amount", "currency_code", "payment_date", "");
            case CREDIT_POLICY_LINE -> new MetricDefinition("finance_credit_policies", "credit_line_amount", "currency_code", "created_at", " AND deleted_at IS NULL");
            case CREDIT_POLICY_AVAILABLE -> new MetricDefinition("finance_credit_policies", "available_credit_amount", "currency_code", "created_at", " AND deleted_at IS NULL");
            case CREDIT_SALES_TOTAL_PAYABLE -> new MetricDefinition("finance_credit_sales", "total_payable_amount", "currency_code", "sale_date", " AND deleted_at IS NULL AND status NOT IN ('CANCELLED', 'REJECTED')");
            case CREDIT_SALES_MONTHLY_PAYMENT -> new MetricDefinition("finance_credit_sales", "monthly_payment_amount", "currency_code", "sale_date", " AND deleted_at IS NULL AND status NOT IN ('CANCELLED', 'REJECTED')");
            case CREDIT_SALES_INTEREST -> new MetricDefinition("finance_credit_sales", "total_interest_amount", "currency_code", "sale_date", " AND deleted_at IS NULL AND status NOT IN ('CANCELLED', 'REJECTED')");
            case PETTY_CASH_BALANCE -> new MetricDefinition("finance_petty_cash_funds", "current_balance_amount", "currency_code", null, " AND deleted_at IS NULL AND status <> 'CLOSED'");
            case PETTY_CASH_LIMIT -> new MetricDefinition("finance_petty_cash_funds", "limit_amount", "currency_code", null, " AND deleted_at IS NULL AND status <> 'CLOSED'");
            case PETTY_CASH_STATEMENT_OPENING -> pettyStatementDefinition("opening_balance_amount");
            case PETTY_CASH_STATEMENT_FUNDED -> pettyStatementDefinition("assigned_amount + additional_deposit_amount");
            case PETTY_CASH_STATEMENT_ESTIMATED -> pettyStatementDefinition("estimated_usage_amount");
            case PETTY_CASH_STATEMENT_VERIFIED -> pettyStatementDefinition("verified_expense_amount");
            case PETTY_CASH_STATEMENT_CLOSING -> pettyStatementDefinition("declared_closing_balance_amount");
            case PETTY_CASH_STATEMENT_PENDING -> pettyStatementDefinition("GREATEST(estimated_usage_amount - verified_expense_amount - returned_amount - shortage_amount, 0)");
            case PETTY_CASH_STATEMENT_SHORTAGE -> pettyStatementDefinition("shortage_amount");
            case PETTY_CASH_MOVEMENT_AMOUNT -> new MetricDefinition("finance_petty_cash_movements", "amount", "currency_code", "movement_date", " AND deleted_at IS NULL");
            case PETTY_CASH_SETTLEMENT_AMOUNT -> new MetricDefinition("finance_petty_cash_settlement_lines", "total_amount", "currency_code", "expense_date", " AND deleted_at IS NULL AND status <> 'REJECTED'");
            case PAYMENT_ACCOUNT_BALANCE -> new MetricDefinition("finance_payment_accounts", "current_balance", "currency_code", null, " AND deleted_at IS NULL AND status = 'ACTIVE'");
            case HR_ASSET_VALUE -> new MetricDefinition("user_assets", "value_amount", "value_currency", "created_at", " AND status <> 'inactive'");
            case HR_EMPLOYEE_MONTHLY_PAYROLL -> new MetricDefinition(
                "hr_users",
                "CASE WHEN LOWER(salary_type) = 'hourly' THEN COALESCE(hourly_rate, 0) * COALESCE(workday_hours, 8) * COALESCE(workdays_per_week, 5) * 52 / 12 "
                    + "ELSE COALESCE(salary, 0) * CASE LOWER(pay_period) WHEN 'monthly' THEN 1 WHEN 'biweekly' THEN 26 / 12 WHEN 'semimonthly' THEN 2 ELSE 52 / 12 END END",
                "CASE UPPER(registration_country) WHEN 'BR' THEN 'BRL' WHEN 'CA' THEN 'CAD' WHEN 'CO' THEN 'COP' WHEN 'US' THEN 'USD' ELSE 'MXN' END",
                "created_at",
                " AND LOWER(status) = 'active'"
            );
            case HR_INCENTIVE_AMOUNT -> new MetricDefinition("hr_incentives", "amount", "currency_code", "created_at", " AND LOWER(status) <> 'cancelled'");
            case PAYROLL_NET_AMOUNT -> new MetricDefinition("payroll_run_lines", "net_amount", "currency_code_snapshot", "created_at", "", "run_id");
            case POS_SALES_TOTAL -> new MetricDefinition("pos_tickets", "total_amount", "currency_code", "created_at", " AND deleted_at IS NULL AND status NOT IN ('CANCELLED', 'VOIDED')");
            case POS_CLOSING_TOTAL -> closingDefinition("c.total_sales_amount");
            case POS_CLOSING_CASH_SALES -> closingDefinition("c.cash_sales_amount");
            case POS_CLOSING_CARD_SALES -> closingPaymentDefinition("CARD");
            case POS_CLOSING_TRANSFER_SALES -> closingPaymentDefinition("TRANSFER");
            case POS_CLOSING_CREDIT_SALES -> closingPaymentDefinition("CREDIT");
            case POS_CLOSING_EXPECTED_CASH -> closingDefinition("c.expected_cash_amount");
            case POS_CLOSING_COUNTED_CASH -> closingDefinition("c.counted_cash_amount");
            case POS_CLOSING_DIFFERENCE -> closingDefinition("c.over_short_amount");
            case POS_CLOSING_ABSOLUTE_DIFFERENCE -> closingDefinition("ABS(c.over_short_amount)");
            case POS_CLOSING_SHORTAGE -> closingDefinition("CASE WHEN c.over_short_amount < 0 THEN ABS(c.over_short_amount) ELSE 0 END");
            case POS_CLOSING_OVERAGE -> closingDefinition("CASE WHEN c.over_short_amount > 0 THEN c.over_short_amount ELSE 0 END");
            case POS_CLOSING_REFUNDS -> closingDefinition("c.total_refunds_amount");
            case PURCHASE_ORDER_TOTAL -> new MetricDefinition("pos_purchase_orders", "total_amount", "currency_code", "created_at", " AND deleted_at IS NULL AND status NOT IN ('CANCELLED', 'REJECTED')");
            case SUPPLIER_SUBMISSION_TOTAL -> new MetricDefinition("pos_supplier_submissions", "total_amount", "currency_code", "created_at", " AND deleted_at IS NULL AND status <> 'REJECTED'");
        };
    }

    private MetricDefinition closingDefinition(String amountColumn) {
        return new MetricDefinition(
            "pos_cash_closings c JOIN pos_shifts s ON s.id = c.shift_id AND s.company_id = c.company_id",
            amountColumn,
            "s.currency_code",
            "c.closed_at",
            " AND c.deleted_at IS NULL",
            "c.id",
            "c.company_id"
        );
    }

    private MetricDefinition closingPaymentDefinition(String paymentMethod) {
        var amountColumn = "COALESCE((SELECT SUM(payment.amount) FROM JSON_TABLE("
            + "COALESCE(c.payments_summary_json, JSON_ARRAY()), '$[*]' COLUMNS ("
            + "payment_method VARCHAR(32) PATH '$.paymentMethod', "
            + "amount DECIMAL(19,4) PATH '$.amount')) AS payment "
            + "WHERE payment.payment_method = '" + paymentMethod + "'), 0)";
        return closingDefinition(amountColumn);
    }

    private MetricDefinition inventoryBalanceDefinition(String amountColumn, String idColumn) {
        return new MetricDefinition(
            "sales_inventory_balances b JOIN sales_products p ON p.id = b.product_id AND p.company_id = b.company_id",
            amountColumn,
            "p.currency",
            "b.updated_at",
            " AND b.deleted_at IS NULL AND p.deleted_at IS NULL AND b.uses_inventory = 1",
            idColumn,
            "b.company_id"
        );
    }

    private MetricDefinition opportunityQuoteDefinition(String opportunityFilter) {
        return new MetricDefinition(
            "sales_quotes q JOIN sales_opportunities o ON o.id = q.opportunity_id AND o.company_id = q.company_id",
            "COALESCE(q.amount, 0)",
            "q.currency",
            "o.updated_at",
            " AND q.deleted_at IS NULL AND o.deleted_at IS NULL"
                + " AND LOWER(COALESCE(q.status, '')) IN ('draft', 'sent', 'viewed', 'negotiation', 'approved', 'closed_won')"
                + opportunityFilter,
            "o.id",
            "o.company_id"
        );
    }

    private MetricDefinition pettyStatementDefinition(String amountColumn) {
        return new MetricDefinition(
            "finance_petty_cash_statements", amountColumn, "currency_code", "period_end", " AND deleted_at IS NULL"
        );
    }

    private record MetricDefinition(
        String table,
        String amountColumn,
        String currencyColumn,
        String dateColumn,
        String baseFilter,
        String idColumn,
        String companyColumn
    ) {
        private MetricDefinition(String table, String amountColumn, String currencyColumn, String dateColumn, String baseFilter) {
            this(table, amountColumn, currencyColumn, dateColumn, baseFilter, "id", "company_id");
        }

        private MetricDefinition(String table, String amountColumn, String currencyColumn, String dateColumn, String baseFilter, String idColumn) {
            this(table, amountColumn, currencyColumn, dateColumn, baseFilter, idColumn, "company_id");
        }
    }
}
