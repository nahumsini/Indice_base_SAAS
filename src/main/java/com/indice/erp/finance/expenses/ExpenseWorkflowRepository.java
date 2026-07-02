package com.indice.erp.finance.expenses;

import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceSqlSupport;
import com.indice.erp.finance.shared.FinanceScope;
import com.indice.erp.finance.status.ExpenseStatus;
import com.indice.erp.finance.status.PaymentStatus;
import java.math.BigDecimal;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class ExpenseWorkflowRepository {

    private final JdbcTemplate jdbcTemplate;

    ExpenseWorkflowRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    boolean transitionStatus(
            FinanceContext context,
            long expenseId,
            List<ExpenseStatus> allowedStatuses,
            ExpenseStatus nextStatus,
            PaymentStatus nextPaymentStatus,
            Long approvedByUserId,
            String auditStatus,
            LocalDate closeDate) {
        var params = new ArrayList<Object>();
        params.add(nextStatus.name());
        params.add(nextPaymentStatus.name());
        params.add(approvedByUserId);
        params.add(auditStatus);
        params.add(closeDate);
        params.add(context.userId());
        params.add(context.companyId());
        params.add(expenseId);
        allowedStatuses.forEach(status -> params.add(status.name()));
        appendScopeParam(params, context.scope());

        var updated = jdbcTemplate.update(
            """
            UPDATE finance_expenses expense
            SET status = ?,
                payment_status = ?,
                approved_by_user_id = COALESCE(?, approved_by_user_id),
                audit_status = COALESCE(?, audit_status),
                close_date = COALESCE(?, close_date),
                updated_by_user_id = ?,
                updated_at = CURRENT_TIMESTAMP,
                version = version + 1
            WHERE expense.company_id = ?
              AND expense.id = ?
              AND expense.deleted_at IS NULL
              AND expense.status IN (%s)
              AND %s
            """.formatted(placeholders(allowedStatuses.size()), FinanceSqlSupport.scopePredicate("expense", context.scope())),
            params.toArray()
        );
        return updated > 0;
    }

    boolean recordPayment(
            FinanceContext context,
            long expenseId,
            BigDecimal paidAmount,
            BigDecimal balanceAmount,
            ExpenseStatus nextStatus,
            PaymentStatus nextPaymentStatus,
            LocalDate paymentDate) {
        var updated = jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                """
                UPDATE finance_expenses expense
                SET paid_amount = ?,
                    balance_amount = ?,
                    status = ?,
                    payment_status = ?,
                    payment_date = ?,
                    performed_by_user_id = ?,
                    updated_by_user_id = ?,
                    updated_at = CURRENT_TIMESTAMP,
                    version = version + 1
                WHERE expense.company_id = ?
                  AND expense.id = ?
                  AND expense.deleted_at IS NULL
                  AND expense.status IN (?, ?, ?)
                  AND """ + FinanceSqlSupport.scopePredicate("expense", context.scope())
            );
            bindPayment(statement, context, expenseId, paidAmount, balanceAmount, nextStatus, nextPaymentStatus, paymentDate);
            return statement;
        });
        return updated > 0;
    }

    boolean applyManualStatus(
            FinanceContext context,
            long expenseId,
            BigDecimal paidAmount,
            BigDecimal balanceAmount,
            ExpenseStatus nextStatus,
            PaymentStatus nextPaymentStatus,
            LocalDate paymentDate,
            String auditStatus,
            LocalDate closeDate) {
        var updated = jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                """
                UPDATE finance_expenses expense
                SET paid_amount = ?,
                    balance_amount = ?,
                    status = ?,
                    payment_status = ?,
                    payment_date = ?,
                    audit_status = COALESCE(?, audit_status),
                    close_date = COALESCE(?, close_date),
                    performed_by_user_id = ?,
                    updated_by_user_id = ?,
                    updated_at = CURRENT_TIMESTAMP,
                    version = version + 1
                WHERE expense.company_id = ?
                  AND expense.id = ?
                  AND expense.deleted_at IS NULL
                  AND expense.status NOT IN (?, ?)
                  AND """ + FinanceSqlSupport.scopePredicate("expense", context.scope())
            );
            bindManualStatus(statement, context, expenseId, paidAmount, balanceAmount, nextStatus,
                nextPaymentStatus, paymentDate, auditStatus, closeDate);
            return statement;
        });
        return updated > 0;
    }

    int markOverduePayments(FinanceContext context, LocalDate referenceDate) {
        var params = new ArrayList<Object>();
        params.add(PaymentStatus.OVERDUE.name());
        params.add(context.userId());
        params.add(context.companyId());
        params.add(referenceDate);
        params.add(ExpenseStatus.PAID.name());
        params.add(ExpenseStatus.CLOSED.name());
        params.add(ExpenseStatus.CANCELLED.name());
        params.add(ExpenseStatus.REJECTED.name());
        params.add(PaymentStatus.UNPAID.name());
        params.add(PaymentStatus.PARTIALLY_PAID.name());
        appendScopeParam(params, context.scope());

        return jdbcTemplate.update(
            """
            UPDATE finance_expenses expense
            SET payment_status = ?,
                updated_by_user_id = ?,
                updated_at = CURRENT_TIMESTAMP,
                version = version + 1
            WHERE expense.company_id = ?
              AND expense.deleted_at IS NULL
              AND expense.due_date IS NOT NULL
              AND expense.due_date < ?
              AND COALESCE(expense.balance_amount, expense.total_amount - expense.paid_amount) > 0
              AND expense.status NOT IN (?, ?, ?, ?)
              AND expense.payment_status IN (?, ?)
              AND %s
            """.formatted(FinanceSqlSupport.scopePredicate("expense", context.scope())),
            params.toArray()
        );
    }

    private void bindPayment(
            PreparedStatement statement,
            FinanceContext context,
            long expenseId,
            BigDecimal paidAmount,
            BigDecimal balanceAmount,
            ExpenseStatus nextStatus,
            PaymentStatus nextPaymentStatus,
            LocalDate paymentDate) throws java.sql.SQLException {
        statement.setBigDecimal(1, paidAmount);
        statement.setBigDecimal(2, balanceAmount);
        statement.setString(3, nextStatus.name());
        statement.setString(4, nextPaymentStatus.name());
        statement.setDate(5, Date.valueOf(paymentDate));
        statement.setLong(6, context.userId());
        statement.setLong(7, context.userId());
        statement.setLong(8, context.companyId());
        statement.setLong(9, expenseId);
        statement.setString(10, ExpenseStatus.APPROVED.name());
        statement.setString(11, ExpenseStatus.PARTIALLY_PAID.name());
        statement.setString(12, ExpenseStatus.PAID.name());
        bindScopeParam(statement, 13, context.scope());
    }

    private void bindManualStatus(
            PreparedStatement statement,
            FinanceContext context,
            long expenseId,
            BigDecimal paidAmount,
            BigDecimal balanceAmount,
            ExpenseStatus nextStatus,
            PaymentStatus nextPaymentStatus,
            LocalDate paymentDate,
            String auditStatus,
            LocalDate closeDate) throws java.sql.SQLException {
        statement.setBigDecimal(1, paidAmount);
        statement.setBigDecimal(2, balanceAmount);
        statement.setString(3, nextStatus.name());
        statement.setString(4, nextPaymentStatus.name());
        setNullableDate(statement, 5, paymentDate);
        statement.setString(6, auditStatus);
        setNullableDate(statement, 7, closeDate);
        statement.setLong(8, context.userId());
        statement.setLong(9, context.userId());
        statement.setLong(10, context.companyId());
        statement.setLong(11, expenseId);
        statement.setString(12, ExpenseStatus.CANCELLED.name());
        statement.setString(13, ExpenseStatus.REJECTED.name());
        bindScopeParam(statement, 14, context.scope());
    }

    private void appendScopeParam(List<Object> params, FinanceScope scope) {
        switch (scope.type()) {
            case CORPORATE_OFFICE -> {
            }
            case UNIT_HEADQUARTERS -> params.add(scope.unitId());
            case BUSINESS_OFFICE -> params.add(scope.businessId());
        }
    }

    private void bindScopeParam(PreparedStatement statement, int index, FinanceScope scope) throws java.sql.SQLException {
        switch (scope.type()) {
            case CORPORATE_OFFICE -> {
            }
            case UNIT_HEADQUARTERS -> statement.setLong(index, scope.unitId());
            case BUSINESS_OFFICE -> statement.setLong(index, scope.businessId());
        }
    }

    private void setNullableDate(PreparedStatement statement, int index, LocalDate value) throws java.sql.SQLException {
        if (value == null) {
            statement.setDate(index, null);
            return;
        }
        statement.setDate(index, Date.valueOf(value));
    }

    private String placeholders(int count) {
        return String.join(", ", java.util.Collections.nCopies(count, "?"));
    }
}
