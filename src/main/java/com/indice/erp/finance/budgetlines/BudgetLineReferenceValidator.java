package com.indice.erp.finance.budgetlines;

import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.shared.FinanceContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
class BudgetLineReferenceValidator {

    private final JdbcTemplate jdbcTemplate;

    BudgetLineReferenceValidator(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    void validateReferences(FinanceContext context, Long budgetId, BudgetLineScopedAssignment assignment) {
        validateBudget(context, budgetId);
        validateUnit(context, assignment.unitId());
        validateBusiness(context, assignment.unitId(), assignment.businessId());
    }

    private void validateBudget(FinanceContext context, Long budgetId) {
        var count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM finance_budgets WHERE id = ? AND company_id = ? AND deleted_at IS NULL",
            Long.class,
            budgetId,
            context.companyId()
        );
        requireExists(count, "budgetId");
    }

    private void validateUnit(FinanceContext context, Long unitId) {
        if (unitId == null) {
            return;
        }
        var count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM units WHERE id = ? AND (company_id = ? OR company_id IS NULL)",
            Long.class,
            unitId,
            context.companyId()
        );
        requireExists(count, "unitId");
    }

    private void validateBusiness(FinanceContext context, Long unitId, Long businessId) {
        if (businessId == null) {
            return;
        }
        var sql = unitId == null
            ? "SELECT COUNT(*) FROM businesses WHERE id = ? AND (company_id = ? OR company_id IS NULL)"
            : "SELECT COUNT(*) FROM businesses WHERE id = ? AND unit_id = ? AND (company_id = ? OR company_id IS NULL)";
        var count = unitId == null
            ? jdbcTemplate.queryForObject(sql, Long.class, businessId, context.companyId())
            : jdbcTemplate.queryForObject(sql, Long.class, businessId, unitId, context.companyId());
        requireExists(count, "businessId");
    }

    private void requireExists(Long count, String fieldName) {
        if (count == null || count == 0) {
            throw FinanceApiException.badRequest(fieldName + " is invalid for this company.");
        }
    }
}
