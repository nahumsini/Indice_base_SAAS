package com.indice.erp.kpis;

import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.access.tab.TabPermissionAccessService;
import com.indice.erp.access.tab.TabPermissionRequirement;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.HrOperationalScope;
import com.indice.erp.hr.HrOperationalScopeService;
import com.indice.erp.kpis.currency.BasicModuleKpiMetric;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/** Applies existing module, tab and organization authorities at the KPI read boundary. */
@Service
public class KpiRequestAccessService {
    private final ModuleAccessService modules;
    private final TabPermissionAccessService tabs;
    private final HrOperationalScopeService scopes;
    private final JdbcTemplate jdbc;
    public KpiRequestAccessService(ModuleAccessService modules, TabPermissionAccessService tabs, HrOperationalScopeService scopes, JdbcTemplate jdbc) {
        this.modules = modules; this.tabs = tabs; this.scopes = scopes; this.jdbc = jdbc;
    }

    public HrOperationalScope monetary(AuthSessionUser user, String metric) {
        var parsed = BasicModuleKpiMetric.parse(metric);
        boolean allowed = permissions(parsed).stream().anyMatch(permission -> permitted(user, permission));
        if (!allowed) denied();
        return assignedScope(user);
    }

    public Selection central(AuthSessionUser user, String tab, Long unit, Long business) {
        if (!permitted(user, "kpis." + tab)) denied();
        var scope = assignedScope(user);
        if (scope.isCorporateOffice()) return new Selection(unit, business);
        if (unit != null && !unit.equals(scope.unitId())) denied();
        if (scope.type() == HrOperationalScope.Type.BUSINESS_OFFICE) {
            if (business != null && !business.equals(scope.businessId())) denied();
            return new Selection(scope.unitId(), scope.businessId());
        }
        if (business != null && jdbc.queryForObject("SELECT COUNT(*) FROM businesses WHERE company_id = ? AND id = ? AND unit_id = ?",
                Integer.class, user.companyId(), business, scope.unitId()) != 1) denied();
        return new Selection(scope.unitId(), business);
    }

    public void requireCorporate(AuthSessionUser user, String tab) {
        central(user, tab, null, null);
        if (!assignedScope(user).isCorporateOffice()) denied();
    }

    public boolean canManageAccounting(AuthSessionUser user) {
        central(user, "accounting-reports", null, null);
        return assignedScope(user).isCorporateOffice();
    }

    private boolean permitted(AuthSessionUser user, String permission) {
        return modules.canAccess(user, permission.substring(0, permission.indexOf('.')))
            && tabs.canAccess(user, TabPermissionRequirement.one(permission));
    }
    private HrOperationalScope assignedScope(AuthSessionUser user) {
        var scope = scopes.resolve(user);
        if (scope == null || scope.type() == HrOperationalScope.Type.UNASSIGNED) denied();
        return scope;
    }
    private static void denied() { throw new ResponseStatusException(HttpStatus.FORBIDDEN, "The requested KPI is outside the permitted module or organizational scope."); }

    public static String[] monetaryPermissions() {
        return Arrays.stream(BasicModuleKpiMetric.values()).flatMap(metric -> permissions(metric).stream()).distinct().toArray(String[]::new);
    }
    private static List<String> permissions(BasicModuleKpiMetric metric) {
        var owners = switch (metric) {
            case SALES_TOTAL, SALES_COLLECTED, SALES_RECEIVABLE_BALANCE, SALES_TAX, SALES_COMMISSION -> List.of("crm.sales", "crm.kpis");
            case SALES_OPPORTUNITY_PIPELINE, SALES_OPPORTUNITY_WON, SALES_OPPORTUNITY_LOST -> List.of("crm.leads", "crm.kpis");
            case PRODUCT_INVENTORY_VALUE, PRODUCT_ESTIMATED_PROFIT -> List.of("inventory.products", "crm.kpis");
            case INVENTORY_BALANCE_VALUE, INVENTORY_MOVEMENT_VALUE -> List.of("inventory.inventory");
            case EXPENSE_TOTAL, EXPENSE_PAID, EXPENSE_PAID_TO_DATE, EXPENSE_ACTUAL, EXPENSE_SUBTOTAL, EXPENSE_TAX,
                EXPENSE_BALANCE, EXPENSE_OVERDUE_BALANCE, EXPENSE_DUE_SOON_BALANCE -> List.of("expenses.expenses", "expenses.kpis");
            case BUDGET_PLANNED, BUDGET_COMMITTED, BUDGET_ACTUAL, BUDGET_AVAILABLE -> List.of("expenses.budgets", "expenses.kpis");
            case RECEIVABLE_BALANCE, RECEIVABLE_INSTALLMENT_BALANCE -> List.of("receivables.accounts-receivable");
            case RECEIVABLE_PAYMENT_AMOUNT -> List.of("receivables.payments");
            case CREDIT_POLICY_LINE, CREDIT_POLICY_AVAILABLE -> List.of("receivables.credit-customers");
            case CREDIT_SALES_TOTAL_PAYABLE, CREDIT_SALES_MONTHLY_PAYMENT, CREDIT_SALES_INTEREST -> List.of("receivables.credit-sales");
            case PETTY_CASH_BALANCE, PETTY_CASH_LIMIT -> List.of("petty_cash.cash", "petty_cash.kpis");
            case PETTY_CASH_STATEMENT_OPENING, PETTY_CASH_STATEMENT_FUNDED, PETTY_CASH_STATEMENT_ESTIMATED,
                PETTY_CASH_STATEMENT_VERIFIED, PETTY_CASH_STATEMENT_CLOSING, PETTY_CASH_STATEMENT_PENDING,
                PETTY_CASH_STATEMENT_SHORTAGE, PETTY_CASH_MOVEMENT_AMOUNT, PETTY_CASH_SETTLEMENT_AMOUNT -> List.of("petty_cash.statements", "petty_cash.control", "petty_cash.kpis");
            case PAYMENT_ACCOUNT_BALANCE -> List.of("expenses.payment-accounts", "expenses.kpis");
            case HR_ASSET_VALUE -> List.of("human_resources.assets", "human_resources.kpis");
            case HR_EMPLOYEE_MONTHLY_PAYROLL, PAYROLL_NET_AMOUNT -> List.of("human_resources.payroll", "human_resources.kpis");
            case HR_INCENTIVE_AMOUNT -> List.of("human_resources.incentives", "human_resources.kpis");
            case POS_SALES_TOTAL -> List.of("pos.sale", "pos.kpis");
            case POS_CLOSING_TOTAL, POS_CLOSING_CASH_SALES, POS_CLOSING_CARD_SALES, POS_CLOSING_TRANSFER_SALES,
                POS_CLOSING_CREDIT_SALES, POS_CLOSING_EXPECTED_CASH, POS_CLOSING_COUNTED_CASH, POS_CLOSING_DIFFERENCE,
                POS_CLOSING_ABSOLUTE_DIFFERENCE, POS_CLOSING_SHORTAGE, POS_CLOSING_OVERAGE, POS_CLOSING_REFUNDS -> List.of("pos.cortes", "pos.kpis");
            case PURCHASE_ORDER_TOTAL, SUPPLIER_SUBMISSION_TOTAL -> List.of("inventory.purchase-orders", "inventory.providers");
        };
        var all = new java.util.ArrayList<>(owners); all.add("kpis.kpis"); return all;
    }
    public record Selection(Long unitId, Long businessId) {
        public Map<String, String> apply(Map<String, String> parameters) {
            var scoped = new java.util.LinkedHashMap<>(parameters);
            if (unitId != null) scoped.put("unitId", unitId.toString());
            if (businessId != null) scoped.put("businessId", businessId.toString());
            return scoped;
        }
    }
}
