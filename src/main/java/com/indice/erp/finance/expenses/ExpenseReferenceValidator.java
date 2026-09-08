package com.indice.erp.finance.expenses;

import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.expenses.dto.CreateExpenseRequest;
import com.indice.erp.finance.expenses.dto.UpdateExpenseRequest;
import com.indice.erp.finance.shared.FinanceContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class ExpenseReferenceValidator {

    private final JdbcTemplate jdbcTemplate;

    public ExpenseReferenceValidator(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void validateCreate(FinanceContext context, ExpenseScopedAssignment assignment, CreateExpenseRequest request) {
        validateReferences(context, assignment, request.providerId(), request.budgetLineId(),
            request.accountingAccountId(), request.paymentAccountId(), request.requestedByUserId(),
            request.approvedByUserId(), request.performedByUserId());
    }

    public void validateUpdate(FinanceContext context, ExpenseScopedAssignment assignment, UpdateExpenseRequest request) {
        validateReferences(context, assignment, request.providerId(), request.budgetLineId(),
            request.accountingAccountId(), request.paymentAccountId(), request.requestedByUserId(),
            request.approvedByUserId(), request.performedByUserId());
    }

    public void validatePaymentAccountForPayment(FinanceContext context, Long paymentAccountId, String currencyCode) {
        if (paymentAccountId == null) {
            throw FinanceApiException.badRequest("paymentAccountId is required.");
        }
        var count = jdbcTemplate.queryForObject(
            """
            SELECT COUNT(*)
            FROM finance_payment_accounts
            WHERE id = ?
              AND company_id = ?
              AND deleted_at IS NULL
              AND status = 'ACTIVE'
              AND UPPER(currency_code) = UPPER(?)
            """,
            Long.class,
            paymentAccountId,
            context.companyId(),
            currencyCode
        );
        requireExists(count, "paymentAccountId");
    }

    public void validateImportPaymentAccount(FinanceContext context, Long id, String currency) {
        if (id == null) return;
        var count = jdbcTemplate.queryForObject("""
            SELECT COUNT(*) FROM finance_payment_accounts account
            WHERE account.id = ? AND account.company_id = ? AND account.deleted_at IS NULL
              AND account.status = 'ACTIVE' AND UPPER(account.currency_code) = UPPER(?)
              AND account.type <> 'PETTY_CASH'
            """, Long.class, id, context.companyId(), currency);
        requireExists(count, "paymentAccountId");
    }

    public void validateImportAccountingAccount(FinanceContext context, Long id) {
        if (id == null) return;
        requireExists(jdbcTemplate.queryForObject("""
            SELECT COUNT(*) FROM finance_accounting_accounts
            WHERE id = ? AND company_id = ? AND deleted_at IS NULL AND status = 'ACTIVE'
            """, Long.class, id, context.companyId()), "accountingAccountId");
    }

    private void validateReferences(
            FinanceContext context,
            ExpenseScopedAssignment assignment,
            Long providerId,
            Long budgetLineId,
            Long accountingAccountId,
            Long paymentAccountId,
            Long requestedByUserId,
            Long approvedByUserId,
            Long performedByUserId) {
        validateUnit(context, assignment.unitId());
        validateBusiness(context, assignment.unitId(), assignment.businessId());
        validateFinanceReference(context, "finance_providers", providerId, "providerId");
        validateFinanceReference(context, "finance_budget_lines", budgetLineId, "budgetLineId");
        validateFinanceReference(context, "finance_accounting_accounts", accountingAccountId, "accountingAccountId");
        validateFinanceReference(context, "finance_payment_accounts", paymentAccountId, "paymentAccountId");
        validateUserReference(context, requestedByUserId, "requestedByUserId");
        validateUserReference(context, approvedByUserId, "approvedByUserId");
        validateUserReference(context, performedByUserId, "performedByUserId");
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
