package com.indice.erp.finance.expenses.attachments;

import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import com.indice.erp.finance.shared.FinanceSqlSupport;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

@Repository
class BudgetLineAttachmentRepository {

    private final JdbcTemplate jdbcTemplate;

    BudgetLineAttachmentRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    boolean budgetLineExists(FinanceContext context, long budgetLineId) {
        var params = new ArrayList<Object>();
        params.add(context.companyId());
        params.add(budgetLineId);
        appendScopeParam(params, context.scope());
        var count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM finance_budget_lines line
                WHERE line.company_id = ?
                  AND line.id = ?
                  AND line.deleted_at IS NULL
                  AND """ + FinanceSqlSupport.scopePredicate("line", context.scope()),
                Long.class,
                params.toArray());
        return count != null && count > 0;
    }

    List<ExpenseAttachmentRow> list(long companyId, long budgetLineId) {
        return jdbcTemplate.query(
                selectSql() + """
                WHERE attachment.company_id = ?
                  AND attachment.budget_line_id = ?
                  AND attachment.deleted_at IS NULL
                ORDER BY attachment.id ASC
                """,
                this::mapRow,
                companyId,
                budgetLineId);
    }

    Optional<ExpenseAttachmentRow> findById(long companyId, long budgetLineId, long attachmentId) {
        var rows = jdbcTemplate.query(
                selectSql() + """
                WHERE attachment.company_id = ?
                  AND attachment.budget_line_id = ?
                  AND attachment.id = ?
                  AND attachment.deleted_at IS NULL
                """,
                this::mapRow,
                companyId,
                budgetLineId,
                attachmentId);
        return rows.stream().findFirst();
    }

    ExpenseAttachmentRow insert(
            FinanceContext context,
            long budgetLineId,
            String originalFilename,
            String mimeType,
            long sizeBytes,
            String objectKey) {
        var keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                    """
                    INSERT INTO finance_budget_line_attachments
                    (company_id, budget_line_id, original_filename, mime_type, size_bytes, object_key, uploaded_by_user_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    new String[] { "id" });
            statement.setLong(1, context.companyId());
            statement.setLong(2, budgetLineId);
            statement.setString(3, originalFilename);
            statement.setString(4, mimeType);
            statement.setLong(5, sizeBytes);
            statement.setString(6, objectKey);
            if (context.userId() == null) {
                statement.setNull(7, java.sql.Types.BIGINT);
            } else {
                statement.setLong(7, context.userId());
            }
            return statement;
        }, keyHolder);
        var attachmentId = keyHolder.getKey() == null ? 0L : keyHolder.getKey().longValue();
        return findById(context.companyId(), budgetLineId, attachmentId).orElseThrow();
    }

    boolean softDelete(FinanceContext context, long budgetLineId, long attachmentId) {
        return jdbcTemplate.update(
                """
                UPDATE finance_budget_line_attachments
                SET deleted_at = CURRENT_TIMESTAMP,
                    version = version + 1
                WHERE company_id = ?
                  AND budget_line_id = ?
                  AND id = ?
                  AND deleted_at IS NULL
                """,
                context.companyId(),
                budgetLineId,
                attachmentId) > 0;
    }

    private String selectSql() {
        return """
                SELECT attachment.id,
                       attachment.original_filename,
                       attachment.mime_type,
                       attachment.size_bytes,
                       attachment.object_key,
                       attachment.uploaded_by_user_id,
                       COALESCE(NULLIF(TRIM(uploaded_user.full_name), ''), NULLIF(TRIM(uploaded_user.email), '')) AS uploaded_by_name,
                       attachment.created_at
                FROM finance_budget_line_attachments attachment
                LEFT JOIN users uploaded_user ON uploaded_user.id = attachment.uploaded_by_user_id
                """;
    }

    private ExpenseAttachmentRow mapRow(ResultSet rs, int rowNum) throws SQLException {
        return new ExpenseAttachmentRow(
                rs.getLong("id"),
                rs.getString("original_filename"),
                rs.getString("mime_type"),
                rs.getLong("size_bytes"),
                rs.getString("object_key"),
                rs.getObject("uploaded_by_user_id", Long.class),
                rs.getString("uploaded_by_name"),
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
