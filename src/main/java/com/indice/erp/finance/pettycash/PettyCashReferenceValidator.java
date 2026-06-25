package com.indice.erp.finance.pettycash;

import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.shared.FinanceContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
class PettyCashReferenceValidator {

    private final JdbcTemplate jdbcTemplate;

    PettyCashReferenceValidator(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    void validateFundReferences(
            FinanceContext context,
            PettyCashScopedAssignment assignment,
            Long budgetId,
            Long budgetLineId,
            Long paymentAccountId,
            Long fundingSourcePaymentAccountId,
            Long responsibleUserId) {
        validateUnit(context, assignment.unitId());
        validateBusiness(context, assignment.unitId(), assignment.businessId());
        validateFinanceReference(context, "finance_budgets", budgetId, "budgetId");
        validateFinanceReference(context, "finance_budget_lines", budgetLineId, "budgetLineId");
        validateFinanceReference(context, "finance_payment_accounts", paymentAccountId, "paymentAccountId");
        validateFinanceReference(context, "finance_payment_accounts", fundingSourcePaymentAccountId, "fundingSourcePaymentAccountId");
        validateUserReference(context, responsibleUserId, "responsibleUserId");
    }

    void validateMovementReferences(
            FinanceContext context,
            Long fromPaymentAccountId,
            Long toPaymentAccountId) {
        validateFinanceReference(context, "finance_payment_accounts", fromPaymentAccountId, "fromPaymentAccountId");
        validateFinanceReference(context, "finance_payment_accounts", toPaymentAccountId, "toPaymentAccountId");
    }

    void validateSettlementReferences(
            FinanceContext context,
            Long expenseId,
            Long providerId,
            Long accountingAccountId) {
        validateFinanceReference(context, "finance_expenses", expenseId, "expenseId");
        validateFinanceReference(context, "finance_providers", providerId, "providerId");
        validateFinanceReference(context, "finance_accounting_accounts", accountingAccountId, "accountingAccountId");
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

    private void validateFinanceReference(FinanceContext context, String tableName, Long id, String fieldName) {
        if (id == null) {
            return;
        }
        var count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM " + tableName + " WHERE id = ? AND company_id = ? AND deleted_at IS NULL",
            Long.class,
            id,
            context.companyId()
        );
        requireExists(count, fieldName);
    }

    private void validateUserReference(FinanceContext context, Long userId, String fieldName) {
        if (userId == null) {
            return;
        }
        var count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM users usr
                JOIN user_companies userCompany ON userCompany.user_id = usr.id
                WHERE usr.id = ?
                  AND userCompany.company_id = ?
                  AND LOWER(COALESCE(userCompany.status, 'active')) IN ('active', 'activo')
                """,
            Long.class,
            userId,
            context.companyId()
        );
        requireExists(count, fieldName);
    }

    private void requireExists(Long count, String fieldName) {
        if (count == null || count == 0) {
            throw FinanceApiException.badRequest(fieldName + " is invalid for this company.");
        }
    }
}
