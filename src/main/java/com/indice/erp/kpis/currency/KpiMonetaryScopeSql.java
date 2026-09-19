package com.indice.erp.kpis.currency;

import com.indice.erp.hr.HrOperationalScope;
import java.util.List;

/** Owner-specific dimensional joins; requested IDs can only narrow this server-authorized scope. */
final class KpiMonetaryScopeSql {
    private KpiMonetaryScopeSql() {}
    static String filter(BasicModuleKpiMetric metric, HrOperationalScope scope, String table, List<Object> parameters) {
        if (scope == null || scope.type() == HrOperationalScope.Type.UNASSIGNED) return " AND 1 = 0";
        if (scope.isCorporateOffice()) return "";
        String name = metric.name();
        if (metric == BasicModuleKpiMetric.HR_ASSET_VALUE) {
            if (scope.type() == HrOperationalScope.Type.UNIT_HEADQUARTERS) {
                parameters.add(scope.unitId()); parameters.addAll(scope.assignmentParameters());
                return " AND (user_assets.unit_id = ? OR EXISTS (SELECT 1 FROM hr_users owner WHERE owner.company_id = user_assets.company_id"
                    + " AND owner.id = user_assets.responsible_user_company_id" + assigned(scope, "owner", "unit_id", "business_id") + "))";
            }
            parameters.add(scope.businessId());
            return " AND EXISTS (SELECT 1 FROM hr_users owner WHERE owner.company_id = user_assets.company_id"
                + " AND owner.id = user_assets.responsible_user_company_id AND owner.business_id = ?)";
        }
        parameters.addAll(scope.assignmentParameters());
        if (metric == BasicModuleKpiMetric.SALES_RECEIVABLE_BALANCE) return assigned(scope, "s", "unit_id", "business_id");
        if (name.startsWith("SALES_OPPORTUNITY_")) return assigned(scope, "o", "unit_id", "business_id");
        if (name.startsWith("PRODUCT_") || metric == BasicModuleKpiMetric.INVENTORY_BALANCE_VALUE) {
            return " AND EXISTS (SELECT 1 FROM sales_inventory_warehouses owner WHERE owner.company_id = b.company_id AND owner.id = b.warehouse_id"
                + assigned(scope, "owner", "business_unit_id", "business_id") + ")";
        }
        if (metric == BasicModuleKpiMetric.INVENTORY_MOVEMENT_VALUE) return assigned(scope, "m", "business_unit_id", "business_id");
        if (metric == BasicModuleKpiMetric.EXPENSE_PAID) return assigned(scope, "expense", "unit_id", "business_id");
        if (metric == BasicModuleKpiMetric.RECEIVABLE_PAYMENT_AMOUNT || metric == BasicModuleKpiMetric.RECEIVABLE_INSTALLMENT_BALANCE) {
            return " AND EXISTS (SELECT 1 FROM finance_receivable_accounts owner WHERE owner.company_id = " + table + ".company_id"
                + " AND owner.id = " + table + ".receivable_id" + assigned(scope, "owner", "unit_id", "business_id") + ")";
        }
        if ((name.startsWith("PETTY_CASH_STATEMENT_") || name.startsWith("PETTY_CASH_CUSTODY_STATEMENT_"))) {
            return " AND EXISTS (SELECT 1 FROM finance_petty_cash_funds owner WHERE owner.company_id = finance_petty_cash_statements.company_id"
                + " AND owner.id = finance_petty_cash_statements.petty_cash_fund_id" + assigned(scope, "owner", "unit_id", "business_id") + ")";
        }
        if (name.startsWith("PETTY_CASH_CUSTODY_SETTLEMENT_") || metric == BasicModuleKpiMetric.PETTY_CASH_MOVEMENT_AMOUNT || metric == BasicModuleKpiMetric.PETTY_CASH_SETTLEMENT_AMOUNT) {
            return " AND EXISTS (SELECT 1 FROM finance_petty_cash_funds owner WHERE owner.company_id = statement_record.company_id"
                + " AND owner.id = statement_record.petty_cash_fund_id" + assigned(scope, "owner", "unit_id", "business_id") + ")";
        }
        if (metric == BasicModuleKpiMetric.PAYROLL_NET_AMOUNT) return assigned(scope, "payroll_run_lines", "unit_id_snapshot", "business_id_snapshot");
        if (metric == BasicModuleKpiMetric.HR_INCENTIVE_AMOUNT) {
            return " AND EXISTS (SELECT 1 FROM hr_incentive_assignments owner WHERE owner.company_id = hr_incentives.company_id"
                + " AND owner.incentive_id = hr_incentives.id AND (owner.assignment_type = 'all' OR (1 = 1"
                + assigned(scope, "owner", "unit_id", "business_id") + ")))";
        }
        if (name.startsWith("POS_CLOSING_")) return assigned(scope, "s", "unit_id", "business_id");
        if (metric == BasicModuleKpiMetric.SUPPLIER_SUBMISSION_TOTAL) {
            return " AND EXISTS (SELECT 1 FROM finance_providers owner WHERE owner.company_id = pos_supplier_submissions.company_id"
                + " AND owner.id = pos_supplier_submissions.provider_id" + assigned(scope, "owner", "unit_id", "business_id") + ")";
        }
        return assigned(scope, table, "unit_id", "business_id");
    }
    private static String assigned(HrOperationalScope scope, String alias, String unit, String business) {
        return scope.assignmentPredicate(alias + "." + unit, alias + "." + business, alias + ".company_id");
    }
}
