package com.indice.erp.finance.expenses.attachments;

import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceSqlSupport;
import com.indice.erp.finance.shared.FinanceScope;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

@Repository
class ExpenseAttachmentRepository {

    private final JdbcTemplate jdbcTemplate;

    ExpenseAttachmentRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    boolean expenseExists(FinanceContext context, long expenseId) {
        var params = new ArrayList<Object>();
        params.add(context.companyId());
        params.add(expenseId);
        appendScopeParam(params, context.scope());

        var count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM finance_expenses expense
                WHERE expense.company_id = ?
                  AND expense.id = ?
                  AND expense.deleted_at IS NULL
                  AND """ + FinanceSqlSupport.scopePredicate("expense", context.scope()),
                Long.class,
                params.toArray());
        return count != null && count > 0;
    }

    boolean providerOwnsExpense(long companyId, long providerId, long expenseId) {
        var count = jdbcTemplate.queryForObject("""
            SELECT COUNT(*)
            FROM finance_expenses expense
            WHERE expense.company_id = ? AND expense.provider_id = ? AND expense.id = ?
              AND expense.deleted_at IS NULL
            """, Long.class, companyId, providerId, expenseId);
        return count != null && count == 1;
    }

    List<ExpenseAttachmentRow> list(long companyId, long expenseId) {
        return jdbcTemplate.query(
                """
                SELECT attachment.id,
                       attachment.original_filename,
                       attachment.mime_type,
                       attachment.size_bytes,
                       attachment.object_key,
                       attachment.uploaded_by_user_id,
                       attachment.payment_amount,
                       attachment.payment_date,
                       attachment.payment_account_id,
                       COALESCE(NULLIF(TRIM(uploaded_user.full_name), ''), NULLIF(TRIM(uploaded_user.email), '')) AS uploaded_by_name,
                       attachment.created_at
                FROM finance_expense_attachments attachment
                LEFT JOIN users uploaded_user ON uploaded_user.id = attachment.uploaded_by_user_id
                WHERE attachment.company_id = ?
                  AND attachment.expense_id = ?
                  AND attachment.deleted_at IS NULL
                ORDER BY attachment.id ASC
                """,
                (rs, rowNum) -> mapRow(rs),
                companyId,
                expenseId);
    }

    Optional<ExpenseAttachmentRow> findById(long companyId, long expenseId, long attachmentId) {
        var rows = jdbcTemplate.query(
                """
                SELECT attachment.id,
                       attachment.original_filename,
                       attachment.mime_type,
                       attachment.size_bytes,
                       attachment.object_key,
                       attachment.uploaded_by_user_id,
                       attachment.payment_amount,
                       attachment.payment_date,
                       attachment.payment_account_id,
                       COALESCE(NULLIF(TRIM(uploaded_user.full_name), ''), NULLIF(TRIM(uploaded_user.email), '')) AS uploaded_by_name,
                       attachment.created_at
                FROM finance_expense_attachments attachment
                LEFT JOIN users uploaded_user ON uploaded_user.id = attachment.uploaded_by_user_id
                WHERE attachment.company_id = ?
                  AND attachment.expense_id = ?
                  AND attachment.id = ?
                  AND attachment.deleted_at IS NULL
                """,
                (rs, rowNum) -> mapRow(rs),
                companyId,
                expenseId,
                attachmentId);
        return rows.stream().findFirst();
    }

    ExpenseAttachmentRow insert(
            FinanceContext context,
            long expenseId,
            String originalFilename,
            String mimeType,
            long sizeBytes,
            String objectKey,
            java.math.BigDecimal paymentAmount,
            java.time.LocalDate paymentDate,
            Long paymentAccountId) {
        var keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                    """
                    INSERT INTO finance_expense_attachments
                    (company_id, expense_id, original_filename, mime_type, size_bytes, object_key, uploaded_by_user_id,
                     payment_amount, payment_date, payment_account_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    new String[] { "id" });
            statement.setLong(1, context.companyId());
            statement.setLong(2, expenseId);
            statement.setString(3, originalFilename);
            statement.setString(4, mimeType);
            statement.setLong(5, sizeBytes);
            statement.setString(6, objectKey);
            if (context.userId() == null) {
                statement.setNull(7, java.sql.Types.BIGINT);
            } else {
                statement.setLong(7, context.userId());
            }
            statement.setBigDecimal(8, paymentAmount);
            statement.setObject(9, paymentDate);
            if (paymentAccountId == null) statement.setNull(10, java.sql.Types.BIGINT);
            else statement.setLong(10, paymentAccountId);
            return statement;
        }, keyHolder);

        var attachmentId = keyHolder.getKey() == null ? 0L : keyHolder.getKey().longValue();
        return findById(context.companyId(), expenseId, attachmentId).orElseThrow();
    }

    boolean softDelete(FinanceContext context, long expenseId, long attachmentId) {
        return jdbcTemplate.update(
                """
                UPDATE finance_expense_attachments
                SET deleted_at = CURRENT_TIMESTAMP,
                    version = version + 1
                WHERE company_id = ?
                  AND expense_id = ?
                  AND id = ?
                  AND deleted_at IS NULL
                """,
                context.companyId(),
                expenseId,
                attachmentId) > 0;
    }

    boolean objectKeyIsReferencedByPettyCash(long companyId, String objectKey) {
        var count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM finance_petty_cash_settlement_line_attachments
                WHERE company_id = ?
                  AND object_key = ?
                  AND deleted_at IS NULL
                """,
                Long.class,
                companyId,
                objectKey);
        return count != null && count > 0;
    }

    void refreshExpenseAttachmentCount(FinanceContext context, long expenseId) {
        var count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM finance_expense_attachments
                WHERE company_id = ?
                  AND expense_id = ?
                  AND deleted_at IS NULL
                """,
                Integer.class,
                context.companyId(),
                expenseId);

        jdbcTemplate.update(
                """
                UPDATE finance_expenses
                SET attachment_count = ?,
                    updated_by_user_id = ?,
                    version = version + 1
                WHERE company_id = ?
                  AND id = ?
                  AND deleted_at IS NULL
                """,
                count == null ? 0 : count,
                context.userId(),
                context.companyId(),
                expenseId);
    }

    private ExpenseAttachmentRow mapRow(ResultSet rs) throws SQLException {
        return new ExpenseAttachmentRow(
                rs.getLong("id"),
                rs.getString("original_filename"),
                rs.getString("mime_type"),
                rs.getLong("size_bytes"),
                rs.getString("object_key"),
                rs.getObject("uploaded_by_user_id", Long.class),
                rs.getString("uploaded_by_name"),
                rs.getBigDecimal("payment_amount"),
                rs.getObject("payment_date", java.time.LocalDate.class),
                rs.getObject("payment_account_id", Long.class),
                rs.getTimestamp("created_at") == null ? null : rs.getTimestamp("created_at").toInstant().toString());
    }

    private void appendScopeParam(List<Object> params, FinanceScope scope) {
        switch (scope.type()) {
            case CORPORATE_OFFICE -> {
            }
            case UNIT_HEADQUARTERS -> params.add(scope.unitId());
            case BUSINESS_OFFICE -> params.add(scope.businessId());
        }
    }

}
