package com.indice.erp.finance.expenses;

import com.indice.erp.finance.expenses.dto.CreateExpenseRequest;
import com.indice.erp.finance.expenses.dto.ExpenseResponse;
import com.indice.erp.finance.expenses.dto.UpdateExpenseRequest;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceJsonSupport;
import com.indice.erp.finance.status.ExpenseStatus;
import com.indice.erp.finance.status.PaymentStatus;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Locale;
import org.springframework.stereotype.Component;

@Component
public class ExpenseMapper {

    public ExpenseRecord mapRow(ResultSet rs, int rowNum) throws SQLException {
        return new ExpenseRecord(
            rs.getLong("id"),
            rs.getLong("company_id"),
            nullableLong(rs, "unit_id"),
            nullableLong(rs, "business_id"),
            nullableLong(rs, "provider_id"),
            nullableLong(rs, "budget_line_id"),
            nullableLong(rs, "accounting_account_id"),
            nullableLong(rs, "payment_account_id"),
            nullableLong(rs, "purchase_order_id"),
            rs.getString("folio"),
            rs.getString("concept"),
            rs.getString("description"),
            ExpenseType.valueOf(rs.getString("expense_type")),
            rs.getBigDecimal("subtotal_amount"),
            rs.getBigDecimal("tax_amount"),
            rs.getBigDecimal("total_amount"),
            rs.getBigDecimal("paid_amount"),
            rs.getBigDecimal("balance_amount"),
            rs.getString("currency_code"),
            rs.getObject("expense_date", LocalDate.class),
            rs.getObject("due_date", LocalDate.class),
            rs.getObject("payment_date", LocalDate.class),
            rs.getObject("close_date", LocalDate.class),
            nullableLong(rs, "requested_by_user_id"),
            nullableLong(rs, "approved_by_user_id"),
            nullableLong(rs, "performed_by_user_id"),
            ExpenseStatus.valueOf(rs.getString("status")),
            PaymentStatus.valueOf(rs.getString("payment_status")),
            rs.getString("audit_status"),
            rs.getInt("attachment_count"),
            nullableLong(rs, "created_by_user_id"),
            nullableLong(rs, "updated_by_user_id"),
            instant(rs, "created_at"),
            instant(rs, "updated_at"),
            instant(rs, "deleted_at"),
            rs.getLong("version"),
            rs.getString("custom_fields_json"),
            rs.getString("metadata_json"),
            nullableLong(rs, "origin_fund_id") == null ? null : new com.indice.erp.finance.expenses.dto.ExpenseFundReference(
                nullableLong(rs, "origin_fund_id"), rs.getString("origin_fund_name"), rs.getString("origin_fund_type")),
            rs.getBoolean("accounting_posted")
        );
    }

    public ExpenseResponse toResponse(ExpenseRecord record) {
        return new ExpenseResponse(
            record.id(), record.companyId(), record.unitId(), record.businessId(), record.providerId(),
            record.budgetLineId(), record.accountingAccountId(), record.paymentAccountId(),
            record.purchaseOrderId(), record.folio(), record.concept(), record.description(),
            record.expenseType(), record.subtotalAmount(), record.taxAmount(), record.totalAmount(),
            record.paidAmount(), record.balanceAmount(), record.currencyCode(), record.expenseDate(),
            record.dueDate(), record.paymentDate(), record.closeDate(), record.requestedByUserId(),
            record.approvedByUserId(), record.performedByUserId(), record.status(), record.paymentStatus(),
            record.auditStatus(), record.attachmentCount(), record.createdByUserId(), record.updatedByUserId(),
            record.createdAt(), record.updatedAt(), record.deletedAt(), record.version(),
            FinanceJsonSupport.toJsonNode(record.customFieldsJson()),
            FinanceJsonSupport.toJsonNode(record.metadataJson()), record.originFund(), record.accountingPosted()
        );
    }

    public ExpenseDraftCommand toCreateCommand(
            FinanceContext context,
            CreateExpenseRequest request,
            ExpenseScopedAssignment assignment) {
        return toCreateCommand(context, request, assignment, request.folio());
    }

    public ExpenseDraftCommand toCreateCommand(
            FinanceContext context,
            CreateExpenseRequest request,
            ExpenseScopedAssignment assignment,
            String folio) {
        return newCommand(context, assignment, request.providerId(), request.budgetLineId(),
            request.accountingAccountId(), request.paymentAccountId(), request.purchaseOrderId(), folio, request.concept(),
            request.description(), request.expenseType(), request.subtotalAmount(), request.taxAmount(),
            request.totalAmount(), request.currencyCode(), request.expenseDate(), request.dueDate(),
            defaultUserId(request.requestedByUserId(), context.userId()), request.approvedByUserId(),
            request.performedByUserId(), FinanceJsonSupport.toJson(request.customFields()),
            createMetadata(request.metadata()), true);
    }

	    public ExpenseDraftCommand toUpdateCommand(
            FinanceContext context,
            UpdateExpenseRequest request,
            ExpenseScopedAssignment assignment,
            ExpenseRecord existing) {
            var paidAmount = existing.paidAmount().min(request.totalAmount()).max(BigDecimal.ZERO);
            var balanceAmount = request.totalAmount().subtract(paidAmount).max(BigDecimal.ZERO);
	        return new ExpenseDraftCommand(
	            assignment.unitId(), assignment.businessId(), request.providerId(), request.budgetLineId(),
	            request.accountingAccountId(), request.paymentAccountId(), request.purchaseOrderId(), trim(request.folio()),
	            trim(request.concept()), trim(request.description()), request.expenseType(), request.subtotalAmount(),
	            request.taxAmount(), request.totalAmount(), paidAmount, balanceAmount,
	            request.currencyCode().trim().toUpperCase(Locale.ROOT), request.expenseDate(), request.dueDate(),
	            defaultUserId(request.requestedByUserId(), defaultUserId(existing.requestedByUserId(), context.userId())),
	            request.approvedByUserId(), request.performedByUserId(), null, context.userId(),
	            FinanceJsonSupport.toJson(request.customFields()), preserveClassificationAudit(existing, request)
	        );
	    }

    private String preserveClassificationAudit(ExpenseRecord existing, UpdateExpenseRequest request) {
        var incoming = classificationSafeMetadata(request.metadata());
        var previous = FinanceJsonSupport.toJsonNode(existing.metadataJson());
        if (previous == null || !previous.has("accountingClassificationChanges")) return createMetadata(request.metadata());
        if (previous != null && previous.has("accountingClassificationChanges")) {
            incoming.set("accountingClassificationChanges", previous.get("accountingClassificationChanges"));
        }
        return incoming.toString();
    }

    private String createMetadata(com.fasterxml.jackson.databind.JsonNode metadata) {
        return metadata != null && metadata.isObject()
            ? classificationSafeMetadata(metadata).toString() : FinanceJsonSupport.toJson(metadata);
    }

    private com.fasterxml.jackson.databind.node.ObjectNode classificationSafeMetadata(com.fasterxml.jackson.databind.JsonNode metadata) {
        var result = metadata != null && metadata.isObject()
            ? (com.fasterxml.jackson.databind.node.ObjectNode) metadata.deepCopy()
            : com.fasterxml.jackson.databind.node.JsonNodeFactory.instance.objectNode();
        result.remove("accountingClassificationChanges");
        return result;
    }

    private ExpenseDraftCommand newCommand(
            FinanceContext context,
            ExpenseScopedAssignment assignment,
            Long providerId,
            Long budgetLineId,
            Long accountingAccountId,
            Long paymentAccountId,
            Long purchaseOrderId,
            String folio,
            String concept,
            String description,
            ExpenseType expenseType,
            BigDecimal subtotal,
            BigDecimal tax,
            BigDecimal total,
            String currencyCode,
            LocalDate expenseDate,
            LocalDate dueDate,
            Long requestedByUserId,
            Long approvedByUserId,
            Long performedByUserId,
            String customFieldsJson,
            String metadataJson,
            boolean create) {
        return new ExpenseDraftCommand(
            assignment.unitId(), assignment.businessId(), providerId, budgetLineId, accountingAccountId,
            paymentAccountId, purchaseOrderId, trim(folio), trim(concept), trim(description), expenseType, subtotal, tax,
            total, BigDecimal.ZERO, total, currencyCode.trim().toUpperCase(Locale.ROOT), expenseDate, dueDate,
            requestedByUserId, approvedByUserId, performedByUserId, create ? context.userId() : null,
            create ? null : context.userId(), customFieldsJson, metadataJson
        );
    }

    private Long defaultUserId(Long requestedUserId, Long defaultUserId) {
        return requestedUserId == null ? defaultUserId : requestedUserId;
    }

    private Long nullableLong(ResultSet rs, String column) throws SQLException {
        var value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    private Instant instant(ResultSet rs, String column) throws SQLException {
        Timestamp timestamp = rs.getTimestamp(column);
        return timestamp == null ? null : timestamp.toInstant();
    }

    private String trim(String value) {
        return value == null ? null : value.trim();
    }
}
