package com.indice.erp.finance.pettycash;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.pettycash.dto.CreatePettyCashFundRequest;
import com.indice.erp.finance.pettycash.dto.CreatePettyCashMovementRequest;
import com.indice.erp.finance.pettycash.dto.CreatePettyCashSettlementLineRequest;
import com.indice.erp.finance.pettycash.dto.PettyCashFundResponse;
import com.indice.erp.finance.pettycash.dto.PettyCashMovementResponse;
import com.indice.erp.finance.pettycash.dto.PettyCashSettlementLineResponse;
import com.indice.erp.finance.pettycash.dto.PettyCashStatementResponse;
import com.indice.erp.finance.pettycash.dto.UpdatePettyCashFundRequest;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceJsonSupport;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Component;

@Component
public class PettyCashMapper {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final TypeReference<List<String>> STRING_LIST_TYPE = new TypeReference<>() {
    };

    public PettyCashFundRecord mapFund(ResultSet rs, int rowNum) throws SQLException {
        return new PettyCashFundRecord(
            rs.getLong("id"),
            rs.getLong("company_id"),
            nullableLong(rs, "unit_id"),
            nullableLong(rs, "business_id"),
            nullableLong(rs, "budget_id"),
            nullableLong(rs, "budget_line_id"),
            nullableLong(rs, "payment_account_id"),
            nullableLong(rs, "funding_source_payment_account_id"),
            nullableLong(rs, "responsible_user_id"),
            rs.getString("name"),
            rs.getString("currency_code"),
            rs.getBigDecimal("limit_amount"),
            rs.getBigDecimal("current_balance_amount"),
            rs.getInt("cut_off_day"),
            rs.getString("funding_source_name"),
            rs.getString("funding_methods_json"),
            rs.getString("spending_methods_json"),
            rs.getBoolean("kiosk_enabled"),
            rs.getBoolean("kiosk_uses_universal_pin"),
            rs.getString("kiosk_access_url"),
            rs.getString("kiosk_public_token"),
            PettyCashFundStatus.valueOf(rs.getString("status")),
            nullableLong(rs, "created_by_user_id"),
            nullableLong(rs, "updated_by_user_id"),
            instant(rs, "created_at"),
            instant(rs, "updated_at"),
            instant(rs, "deleted_at"),
            rs.getLong("version"),
            rs.getString("custom_fields_json"),
            rs.getString("metadata_json")
        );
    }

    public PettyCashStatementRecord mapStatement(ResultSet rs, int rowNum) throws SQLException {
        return new PettyCashStatementRecord(
            rs.getLong("id"),
            rs.getLong("company_id"),
            rs.getLong("petty_cash_fund_id"),
            rs.getString("folio"),
            rs.getString("period_key"),
            rs.getObject("period_start", LocalDate.class),
            rs.getObject("period_end", LocalDate.class),
            rs.getObject("cut_off_date", LocalDate.class),
            rs.getBigDecimal("opening_balance_amount"),
            rs.getBigDecimal("assigned_amount"),
            rs.getBigDecimal("additional_deposit_amount"),
            rs.getBigDecimal("declared_closing_balance_amount"),
            rs.getBigDecimal("estimated_usage_amount"),
            rs.getBigDecimal("verified_expense_amount"),
            rs.getBigDecimal("returned_amount"),
            rs.getBigDecimal("shortage_amount"),
            rs.getBigDecimal("carry_forward_amount"),
            rs.getString("currency_code"),
            PettyCashStatementStatus.valueOf(rs.getString("status")),
            nullableLong(rs, "responsible_user_id"),
            nullableLong(rs, "reviewed_by_user_id"),
            rs.getInt("attachment_count"),
            nullableLong(rs, "created_by_user_id"),
            nullableLong(rs, "updated_by_user_id"),
            instant(rs, "created_at"),
            instant(rs, "updated_at"),
            instant(rs, "deleted_at"),
            rs.getLong("version"),
            rs.getString("custom_fields_json"),
            rs.getString("metadata_json")
        );
    }

    public PettyCashMovementRecord mapMovement(ResultSet rs, int rowNum) throws SQLException {
        return new PettyCashMovementRecord(
            rs.getLong("id"),
            rs.getLong("company_id"),
            rs.getLong("petty_cash_fund_id"),
            nullableLong(rs, "petty_cash_statement_id"),
            nullableLong(rs, "from_payment_account_id"),
            nullableLong(rs, "to_payment_account_id"),
            PettyCashMovementType.valueOf(rs.getString("type")),
            rs.getBigDecimal("amount"),
            rs.getString("currency_code"),
            rs.getObject("movement_date", LocalDate.class),
            rs.getString("reference"),
            nullableLong(rs, "created_by_user_id"),
            nullableLong(rs, "updated_by_user_id"),
            instant(rs, "created_at"),
            instant(rs, "updated_at"),
            instant(rs, "deleted_at"),
            rs.getLong("version"),
            rs.getString("custom_fields_json"),
            rs.getString("metadata_json")
        );
    }

    public PettyCashSettlementLineRecord mapSettlementLine(ResultSet rs, int rowNum) throws SQLException {
        return new PettyCashSettlementLineRecord(
            rs.getLong("id"),
            rs.getLong("company_id"),
            rs.getLong("petty_cash_fund_id"),
            rs.getLong("petty_cash_statement_id"),
            nullableLong(rs, "expense_id"),
            nullableLong(rs, "provider_id"),
            nullableLong(rs, "accounting_account_id"),
            rs.getString("description"),
            rs.getString("receipt_reference"),
            rs.getBigDecimal("subtotal_amount"),
            rs.getBigDecimal("tax_amount"),
            rs.getBigDecimal("total_amount"),
            rs.getString("currency_code"),
            rs.getObject("expense_date", LocalDate.class),
            rs.getInt("attachment_count"),
            PettyCashSettlementLineStatus.valueOf(rs.getString("status")),
            nullableLong(rs, "created_by_user_id"),
            nullableLong(rs, "updated_by_user_id"),
            instant(rs, "created_at"),
            instant(rs, "updated_at"),
            instant(rs, "deleted_at"),
            rs.getLong("version"),
            rs.getString("custom_fields_json"),
            rs.getString("metadata_json")
        );
    }

    public PettyCashFundResponse toResponse(PettyCashFundRecord record) {
        return new PettyCashFundResponse(
            record.id(), record.companyId(), record.unitId(), record.businessId(), record.budgetId(),
            record.budgetLineId(), record.paymentAccountId(), record.fundingSourcePaymentAccountId(),
            record.responsibleUserId(), record.name(), record.currencyCode(), record.limitAmount(),
            record.currentBalanceAmount(), record.cutOffDay(), record.fundingSourceName(),
            toStringList(record.fundingMethodsJson()), toStringList(record.spendingMethodsJson()),
            record.kioskEnabled(), record.kioskUsesUniversalPin(), record.kioskAccessUrl(), record.kioskPublicToken(), record.status(),
            record.createdByUserId(), record.updatedByUserId(), record.createdAt(), record.updatedAt(),
            record.deletedAt(), record.version(), toJsonNode(record.customFieldsJson()), toJsonNode(record.metadataJson())
        );
    }

    public PettyCashStatementResponse toResponse(PettyCashStatementRecord record) {
        return new PettyCashStatementResponse(
            record.id(), record.companyId(), record.pettyCashFundId(), record.folio(), record.periodKey(),
            record.periodStart(), record.periodEnd(), record.cutOffDate(), record.openingBalanceAmount(),
            record.assignedAmount(), record.additionalDepositAmount(), record.declaredClosingBalanceAmount(),
            record.estimatedUsageAmount(), record.verifiedExpenseAmount(), record.returnedAmount(),
            record.shortageAmount(), record.carryForwardAmount(), record.currencyCode(), record.status(),
            record.responsibleUserId(), record.reviewedByUserId(), record.attachmentCount(),
            record.createdByUserId(), record.updatedByUserId(), record.createdAt(), record.updatedAt(),
            record.deletedAt(), record.version(), toJsonNode(record.customFieldsJson()), toJsonNode(record.metadataJson())
        );
    }

    public PettyCashMovementResponse toResponse(PettyCashMovementRecord record) {
        return new PettyCashMovementResponse(
            record.id(), record.companyId(), record.pettyCashFundId(), record.pettyCashStatementId(),
            record.fromPaymentAccountId(), record.toPaymentAccountId(), record.type(), record.amount(),
            record.currencyCode(), record.movementDate(), record.reference(), record.createdByUserId(),
            record.updatedByUserId(), record.createdAt(), record.updatedAt(), record.deletedAt(),
            record.version(), toJsonNode(record.customFieldsJson()), toJsonNode(record.metadataJson())
        );
    }

    public PettyCashSettlementLineResponse toResponse(PettyCashSettlementLineRecord record) {
        return new PettyCashSettlementLineResponse(
            record.id(), record.companyId(), record.pettyCashFundId(), record.pettyCashStatementId(),
            record.expenseId(), record.providerId(), record.accountingAccountId(), record.description(),
            record.receiptReference(), record.subtotalAmount(), record.taxAmount(), record.totalAmount(),
            record.currencyCode(), record.expenseDate(), record.attachmentCount(), record.status(),
            record.createdByUserId(), record.updatedByUserId(), record.createdAt(), record.updatedAt(),
            record.deletedAt(), record.version(), toJsonNode(record.customFieldsJson()), toJsonNode(record.metadataJson())
        );
    }

    PettyCashFundCommand toCreateCommand(
            FinanceContext context,
            CreatePettyCashFundRequest request,
            PettyCashScopedAssignment assignment,
            String kioskPublicToken) {
        var normalizedCurrency = normalizeCurrency(request.currencyCode());
        var currentBalance = request.currentBalanceAmount() == null ? BigDecimal.ZERO : request.currentBalanceAmount();
        var kioskEnabled = request.kioskEnabled() != null && request.kioskEnabled();
        return new PettyCashFundCommand(
            assignment.unitId(), assignment.businessId(), request.budgetId(), request.budgetLineId(),
            request.paymentAccountId(), request.fundingSourcePaymentAccountId(), request.responsibleUserId(),
            trim(request.name()), normalizedCurrency, request.limitAmount(), currentBalance,
            request.cutOffDay() == null ? 30 : request.cutOffDay(), trimToNull(request.fundingSourceName()),
            FinanceJsonSupport.toJson(cleanList(request.fundingMethods())),
            FinanceJsonSupport.toJson(cleanList(request.spendingMethods())),
            kioskEnabled,
            request.kioskUsesUniversalPin() == null || request.kioskUsesUniversalPin(),
            kioskAccessUrl(request.kioskAccessUrl(), kioskPublicToken, kioskEnabled), kioskPublicToken,
            request.status() == null ? PettyCashFundStatus.OPEN : request.status(),
            context.userId(), null, FinanceJsonSupport.toJson(request.customFields()),
            FinanceJsonSupport.toJson(request.metadata())
        );
    }

    PettyCashFundCommand toUpdateCommand(
            FinanceContext context,
            UpdatePettyCashFundRequest request,
            PettyCashScopedAssignment assignment,
            PettyCashFundRecord existing,
            String kioskPublicToken) {
        var kioskEnabled = request.kioskEnabled() != null && request.kioskEnabled();
        return new PettyCashFundCommand(
            assignment.unitId(), assignment.businessId(), request.budgetId(), request.budgetLineId(),
            request.paymentAccountId(), request.fundingSourcePaymentAccountId(), request.responsibleUserId(),
            trim(request.name()), normalizeCurrency(request.currencyCode()), request.limitAmount(),
            existing.currentBalanceAmount(), request.cutOffDay() == null ? existing.cutOffDay() : request.cutOffDay(),
            trimToNull(request.fundingSourceName()), FinanceJsonSupport.toJson(cleanList(request.fundingMethods())),
            FinanceJsonSupport.toJson(cleanList(request.spendingMethods())),
            kioskEnabled,
            request.kioskUsesUniversalPin() == null || request.kioskUsesUniversalPin(),
            kioskAccessUrl(request.kioskAccessUrl(), kioskPublicToken, kioskEnabled), kioskPublicToken,
            request.status() == null ? existing.status() : request.status(),
            null, context.userId(), FinanceJsonSupport.toJson(request.customFields()),
            FinanceJsonSupport.toJson(request.metadata())
        );
    }

    PettyCashMovementCommand toCommand(FinanceContext context, CreatePettyCashMovementRequest request) {
        return new PettyCashMovementCommand(
            request.pettyCashStatementId(), request.fromPaymentAccountId(), request.toPaymentAccountId(),
            request.type() == null ? PettyCashMovementType.ADDITIONAL_DEPOSIT : request.type(),
            request.amount(), normalizeCurrency(request.currencyCode()), request.movementDate(),
            trimToNull(request.reference()), context.userId(), FinanceJsonSupport.toJson(request.customFields()),
            FinanceJsonSupport.toJson(request.metadata())
        );
    }

    PettyCashSettlementLineCommand toCommand(FinanceContext context, CreatePettyCashSettlementLineRequest request) {
        var taxAmount = request.taxAmount() == null ? BigDecimal.ZERO : request.taxAmount();
        var subtotalAmount = request.subtotalAmount() == null
            ? request.totalAmount().subtract(taxAmount).max(BigDecimal.ZERO)
            : request.subtotalAmount();
        return new PettyCashSettlementLineCommand(
            request.pettyCashStatementId(), request.expenseId(), request.providerId(),
            request.accountingAccountId(), trim(request.description()), trimToNull(request.receiptReference()),
            subtotalAmount, taxAmount, request.totalAmount(), normalizeCurrency(request.currencyCode()),
            request.expenseDate(), request.attachmentCount() == null ? 0 : request.attachmentCount(),
            request.status() == null ? PettyCashSettlementLineStatus.RECEIPT_ATTACHED : request.status(),
            context.userId(), FinanceJsonSupport.toJson(request.customFields()), FinanceJsonSupport.toJson(request.metadata())
        );
    }

    private List<String> cleanList(List<String> values) {
        if (values == null) {
            return List.of();
        }
        return values.stream()
            .map(this::trim)
            .filter(value -> value != null && !value.isBlank())
            .distinct()
            .toList();
    }

    private List<String> toStringList(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return OBJECT_MAPPER.readValue(json, STRING_LIST_TYPE);
        } catch (JsonProcessingException ex) {
            return List.of();
        }
    }

    private JsonNode toJsonNode(String json) {
        return FinanceJsonSupport.toJsonNode(json);
    }

    private String kioskAccessUrl(String requestedUrl, String kioskPublicToken, boolean kioskEnabled) {
        if (kioskEnabled && kioskPublicToken != null && !kioskPublicToken.isBlank()) {
            return "/petty-cash/kiosk/" + kioskPublicToken;
        }
        return trimToNull(requestedUrl);
    }

    private Long nullableLong(ResultSet rs, String column) throws SQLException {
        var value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    private Instant instant(ResultSet rs, String column) throws SQLException {
        Timestamp timestamp = rs.getTimestamp(column);
        return timestamp == null ? null : timestamp.toInstant();
    }

    private String normalizeCurrency(String value) {
        var trimmed = trim(value);
        if (trimmed == null || trimmed.length() != 3) {
            throw FinanceApiException.badRequest("currencyCode must be an ISO 4217 code.");
        }
        return trimmed.toUpperCase(Locale.ROOT);
    }

    private String trim(String value) {
        return value == null ? null : value.trim();
    }

    private String trimToNull(String value) {
        var trimmed = trim(value);
        return trimmed == null || trimmed.isBlank() ? null : trimmed;
    }
}
