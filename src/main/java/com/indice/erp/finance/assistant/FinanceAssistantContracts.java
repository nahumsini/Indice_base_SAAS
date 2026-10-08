package com.indice.erp.finance.assistant;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.indice.erp.finance.expenses.*;
import com.indice.erp.finance.expenses.dto.*;
import com.indice.erp.finance.pettycash.*;
import com.indice.erp.finance.pettycash.dto.*;
import com.indice.erp.finance.accountingaccounts.*;
import com.indice.erp.finance.accountingaccounts.dto.*;
import com.indice.erp.finance.paymentaccounts.*;
import com.indice.erp.finance.paymentaccounts.dto.*;
import com.indice.erp.finance.providers.*;
import com.indice.erp.finance.providers.dto.*;
import com.indice.erp.finance.status.*;
import com.indice.erp.finance.budgets.dto.*;
import com.indice.erp.finance.budgetlines.dto.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

/** Whitelisted business DTOs; no credentials or private storage URLs. */
public final class FinanceAssistantContracts {
    private FinanceAssistantContracts() {}
    public record Query(
        Long id,
        Long fundId,
        Long statementId,
        Long unitId,
        Long businessId,
        Long providerId,
        String query,
        String status,
        String paymentStatus,
        String fundType,
        String currencyCode,
        LocalDate from,
        LocalDate to,
        Boolean overdueOnly,
        Integer limit,
        String cursor
    ) {
        public Query() { this(null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null); }
        @JsonAnySetter public void unknown(String key, Object value) { throw new IllegalArgumentException("Unknown finance query field."); }
    }
    public record AccountingData(
        Long unitId,
        Long businessId,
        String code,
        String name,
        AccountingAccountGroup groupKey,
        String description,
        AccountingAccountStatus status
    ) { @JsonAnySetter public void unknown(String key,Object value) { throw new IllegalArgumentException("Unknown finance data field."); } }
    public record AccountData(
        Long unitId,
        Long businessId,
        String name,
        PaymentAccountType type,
        String currencyCode,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal openingBalance,
        String description,
        PaymentAccountStatus status
    ) { @JsonAnySetter public void unknown(String key,Object value) { throw new IllegalArgumentException("Unknown finance data field."); } }
    public record ProviderData(
        Long unitId,
        Long businessId,
        String name,
        String legalName,
        String email,
        String phone,
        String contactName,
        Integer paymentTermsDays,
        ProviderStatus status,
        String notes
    ) { @JsonAnySetter public void unknown(String key,Object value) { throw new IllegalArgumentException("Unknown finance data field."); } }
    public record BudgetData(
        Long unitId,
        Long businessId,
        String name,
        String description,
        LocalDate periodStart,
        LocalDate periodEnd,
        String currencyCode,
        BudgetStatus status
    ) { @JsonAnySetter public void unknown(String key,Object value) { throw new IllegalArgumentException("Unknown finance data field."); } }
    public record BudgetLineData(
        Long unitId,
        Long businessId,
        Long budgetId,
        String name,
        String categoryKey,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal plannedAmount,
        String currencyCode,
        BudgetStatus status,
        String description,
        LocalDate scheduledDate,
        Long providerId,
        Long accountingAccountId,
        Boolean includesTax,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal taxRate
    ) { @JsonAnySetter public void unknown(String key,Object value) { throw new IllegalArgumentException("Unknown finance data field."); } }
    public record ExpenseData(
        Long unitId,
        Long businessId,
        Long providerId,
        Long budgetLineId,
        Long accountingAccountId,
        Long paymentAccountId,
        String concept,
        String description,
        ExpenseType expenseType,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal subtotalAmount,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal taxAmount,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal totalAmount,
        String currencyCode,
        LocalDate expenseDate,
        LocalDate dueDate,
        Boolean paid,
        Boolean includesTax,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal taxRate
    ) { @JsonAnySetter public void unknown(String key,Object value) { throw new IllegalArgumentException("Unknown finance data field."); } }
    public record FundData(
        Long unitId,
        Long businessId,
        Long budgetId,
        Long budgetLineId,
        Long paymentAccountId,
        Long responsibleUserId,
        PettyCashFundType fundType,
        String name,
        String currencyCode,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal limitAmount,
        Integer cutOffDay,
        String externalOwnerType,
        String externalOwnerName,
        String externalOwnerRelationship,
        String statementRecipientEmail,
        List<PettyCashManagedAsset> managedAssets
    ) { @JsonAnySetter public void unknown(String key,Object value) { throw new IllegalArgumentException("Unknown finance data field."); } }
    public record ReceiptData(
        Long providerId,
        Long accountingAccountId,
        String description,
        String receiptReference,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal subtotalAmount,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal taxAmount,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal totalAmount,
        String currencyCode,
        LocalDate expenseDate
    ) { @JsonAnySetter public void unknown(String key,Object value) { throw new IllegalArgumentException("Unknown finance data field."); } }
    public record DepositData(
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal amount,
        String currencyCode,
        LocalDate movementDate,
        Long sourcePaymentAccountId,
        String externalSourceName,
        String reference
    ) { @JsonAnySetter public void unknown(String key,Object value) { throw new IllegalArgumentException("Unknown finance data field."); } }
    public record PaymentData(@JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal amount, Long paymentAccountId, LocalDate paymentDate) { @JsonAnySetter public void unknown(String key,Object value) { throw new IllegalArgumentException("Unknown finance data field."); } }
    public record CloseData(
        PettyCashStatementCloseAction action,
        LocalDate closeDate,
        Long destinationPaymentAccountId,
        String externalDestinationName,
        String reference
    ) { @JsonAnySetter public void unknown(String key,Object value) { throw new IllegalArgumentException("Unknown finance data field."); } }
    public record ScheduleData(LocalDate startDate, LocalDate endDate, Integer everyMonths) { @JsonAnySetter public void unknown(String key,Object value) { throw new IllegalArgumentException("Unknown finance data field."); } }
    public record Selection(long id, Long expectedVersion) { @JsonAnySetter public void unknown(String key,Object value){throw new IllegalArgumentException("Unknown selection field.");} }
    public record Change(
        Long id,
        Long fundId,
        Long statementId,
        Long paymentId,
        Long attachmentId,
        Long targetId,
        String reason,
        String classification,
        String dueStatus,
        LocalDate effectiveDate,
        String locale,
        AccountingData accounting,
        AccountData account,
        ProviderData provider,
        BudgetData budget,
        BudgetLineData budgetLine,
        ExpenseData expense,
        FundData fund,
        ReceiptData receipt,
        DepositData deposit,
        PaymentData payment,
        CloseData closing,
        ScheduleData schedule,
        List<Selection> rows,
        List<ExpenseData> expenses
    ) {
        @JsonAnySetter public void unknown(String key, Object value) { throw new IllegalArgumentException("Unknown finance action field."); }
    }
    public record Metric(
        String name,
        String currencyCode,
        String fundType,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal amount
    ) {}
    public record Responsible(
        long userId,
        long userCompanyId,
        String name,
        Long unitId,
        Long businessId
    ) {}
    public record Review(long budgetLineId, String folio, String reason) {}
    public record Records(
        List<Expense> expenses,
        List<Payment> payments,
        List<Fund> funds,
        List<Statement> statements,
        List<Receipt> receipts,
        List<Movement> movements,
        List<Accounting> accountingAccounts,
        List<Account> paymentAccounts,
        List<Provider> providers,
        List<Budget> budgets,
        List<BudgetLine> budgetLines,
        List<PettyCashTypeChangeResponse> typeChanges,
        List<Responsible> responsibles,
        List<Review> reviews
    ) {
        public Records() { this(List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of()); }
        @SuppressWarnings("unchecked")
        public static Records of(String kind,List<?> items) {
            return switch(kind) {
                case "expense" -> new Records((List<Expense>)items,List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of());
                case "payment" -> new Records(List.of(),(List<Payment>)items,List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of());
                case "fund" -> new Records(List.of(),List.of(),(List<Fund>)items,List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of());
                case "statement" -> new Records(List.of(),List.of(),List.of(),(List<Statement>)items,List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of());
                case "receipt" -> new Records(List.of(),List.of(),List.of(),List.of(),(List<Receipt>)items,List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of());
                case "movement" -> new Records(List.of(),List.of(),List.of(),List.of(),List.of(),(List<Movement>)items,List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of());
                case "accounting_account" -> new Records(List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),(List<Accounting>)items,List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of());
                case "payment_account" -> new Records(List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),(List<Account>)items,List.of(),List.of(),List.of(),List.of(),List.of(),List.of());
                case "provider" -> new Records(List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),(List<Provider>)items,List.of(),List.of(),List.of(),List.of(),List.of());
                case "budget" -> new Records(List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),(List<Budget>)items,List.of(),List.of(),List.of(),List.of());
                case "budget_line" -> new Records(List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),(List<BudgetLine>)items,List.of(),List.of(),List.of());
                case "type_change" -> new Records(List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),(List<PettyCashTypeChangeResponse>)items,List.of(),List.of());
                case "responsible" -> new Records(List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),(List<Responsible>)items,List.of());
                case "review" -> new Records(List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),(List<Review>)items);
                default -> throw new IllegalArgumentException("Unknown finance record kind.");
            };
        }
        public List<?> items(String kind) { return switch(kind) {
            case "expense" -> expenses; case "payment" -> payments; case "fund" -> funds; case "statement" -> statements; case "receipt" -> receipts; case "movement" -> movements;
            case "accounting_account" -> accountingAccounts; case "payment_account" -> paymentAccounts; case "provider" -> providers; case "budget" -> budgets; case "budget_line" -> budgetLines;
            case "type_change" -> typeChanges; case "responsible" -> responsibles; case "review" -> reviews; default -> throw new IllegalArgumentException("Unknown finance record kind.");
        }; }
        public Records merge(Records r) {
            return new Records(join(expenses,r.expenses),join(payments,r.payments),join(funds,r.funds),join(statements,r.statements),join(receipts,r.receipts),join(movements,r.movements),join(accountingAccounts,r.accountingAccounts),join(paymentAccounts,r.paymentAccounts),join(providers,r.providers),join(budgets,r.budgets),join(budgetLines,r.budgetLines),join(typeChanges,r.typeChanges),join(responsibles,r.responsibles),join(reviews,r.reviews));
        }
        private static <T> List<T> join(List<T> a,List<T> b){return java.util.stream.Stream.concat(a.stream(),b.stream()).distinct().toList();}
    }
    public record Page(
        Records records,
        int totalCount,
        int returnedCount,
        boolean hasMore,
        String nextCursor,
        String scope,
        LocalDate asOfDate,
        String timeZone,
        List<Metric> totals
    ) {}
    public record Effect(
        String currencyCode,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal amount,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal treasuryDelta,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal fundDelta,
        boolean createsCompanyExpense,
        boolean recordsPayment,
        boolean queuesPayrollDeduction,
        String description,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal subtotalAmount,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal taxAmount
    ) {
        public Effect withAmounts(BigDecimal subtotal,BigDecimal tax){return new Effect(currencyCode,amount,treasuryDelta,fundDelta,createsCompanyExpense,recordsPayment,queuesPayrollDeduction,description,subtotal,tax);}
    }
    public record Prepared(
        String action,
        Change change,
        Records before,
        List<Effect> effects,
        String version
    ) {}
    public record Result(
        String action,
        Records records,
        List<Effect> effects,
        List<String> nextActions
    ) {}
    public record Preview(
        String action,
        String confirmationToken,
        Instant expiresAt,
        boolean requiresConfirmation,
        Records before,
        Change changes,
        List<Effect> effects
    ) {}
    public record CommitRequest(String confirmationToken, String idempotencyKey) {
        @JsonAnySetter public void unknown(String key,Object value) { throw new IllegalArgumentException("Unknown finance confirmation field."); }
    }
    public record Committed(
        String action,
        boolean replayed,
        String correlationId,
        Result result
    ) {}
    public static final class Conflict extends RuntimeException {
        private final String code;
        public Conflict(String code) { super("Prepare and confirm the current finance operation again."); this.code=code; }
        public String code() { return code; }
    }
    public record Expense(
        Long id,
        Long unitId,
        Long businessId,
        Long providerId,
        Long budgetLineId,
        Long accountingAccountId,
        Long paymentAccountId,
        Long purchaseOrderId,
        String folio,
        String concept,
        String description,
        ExpenseType expenseType,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal subtotalAmount,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal taxAmount,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal totalAmount,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal paidAmount,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal balanceAmount,
        String currencyCode,
        LocalDate expenseDate,
        LocalDate dueDate,
        LocalDate paymentDate,
        LocalDate closeDate,
        ExpenseStatus status,
        PaymentStatus paymentStatus,
        String auditStatus,
        Integer attachmentCount,
        Long version,
        boolean accountingPosted,
        boolean purchaseOrderReceived,
        Long originFundId,
        String originFundName
    ) {
        public static Expense from(ExpenseResponse v) { return new Expense(v.id(), v.unitId(), v.businessId(), v.providerId(), v.budgetLineId(), v.accountingAccountId(), v.paymentAccountId(), v.purchaseOrderId(), v.folio(), v.concept(), v.description(), v.expenseType(), v.subtotalAmount(), v.taxAmount(), v.totalAmount(), v.paidAmount(), v.balanceAmount(), v.currencyCode(), v.expenseDate(), v.dueDate(), v.paymentDate(), v.closeDate(), v.status(), v.paymentStatus(), v.auditStatus(), v.attachmentCount(), v.version(), v.accountingPosted(), v.purchaseOrderReceived(), v.originFund() == null ? null : v.originFund().id(), v.originFund() == null ? null : v.originFund().name()); }
    }
    public record Payment(
        Long id,
        Long expenseId,
        Long paymentAccountId,
        String paymentAccountName,
        String paymentAccountType,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal amount,
        String currencyCode,
        LocalDate paymentDate,
        String source,
        Long registeredByUserId,
        String registeredByName,
        Instant reversedAt
    ) {
        public static Payment from(ExpensePaymentResponse v) { return new Payment(v.id(), v.expenseId(), v.paymentAccountId(), v.paymentAccountName(), v.paymentAccountType(), v.amount(), v.currencyCode(), v.paymentDate(), v.source(), v.registeredByUserId(), v.registeredByName(), v.reversedAt()); }
    }
    public record Fund(
        Long id,
        Long unitId,
        Long businessId,
        Long budgetId,
        Long budgetLineId,
        Long paymentAccountId,
        Long responsibleUserId,
        PettyCashFundType fundType,
        String name,
        String currencyCode,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal limitAmount,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal currentBalanceAmount,
        Integer cutOffDay,
        String externalOwnerType,
        String externalOwnerName,
        String externalOwnerRelationship,
        Boolean externalIdentityPending,
        Boolean budgetLinkPending,
        Boolean kioskEnabled,
        PettyCashFundStatus status,
        Long version,
        List<PettyCashManagedAsset> managedAssets,
        Long pendingTypeChangeId,
        PettyCashFundType pendingFundType,
        LocalDate pendingTypeEffectiveDate
    ) {
        public static Fund from(PettyCashFundResponse v) { return new Fund(v.id(), v.unitId(), v.businessId(), v.budgetId(), v.budgetLineId(), v.paymentAccountId(), v.responsibleUserId(), v.fundType(), v.name(), v.currencyCode(), v.limitAmount(), v.currentBalanceAmount(), v.cutOffDay(), v.externalOwnerType(), v.externalOwnerName(), v.externalOwnerRelationship(), v.externalIdentityPending(), v.budgetLinkPending(), v.kioskEnabled(), v.status(), v.version(), v.managedAssets(), v.pendingTypeChangeId(), v.pendingFundType(), v.pendingTypeEffectiveDate()); }
    }
    public record Statement(
        Long id,
        Long pettyCashFundId,
        PettyCashFundType fundTypeSnapshot,
        String folio,
        String periodKey,
        LocalDate periodStart,
        LocalDate periodEnd,
        LocalDate cutOffDate,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal openingBalanceAmount,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal assignedAmount,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal additionalDepositAmount,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal declaredClosingBalanceAmount,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal estimatedUsageAmount,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal verifiedExpenseAmount,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal returnedAmount,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal shortageAmount,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal carryForwardAmount,
        String currencyCode,
        PettyCashStatementStatus status,
        Long responsibleUserId,
        String externalOwnerTypeSnapshot,
        String externalOwnerNameSnapshot,
        String externalOwnerRelationshipSnapshot,
        Integer attachmentCount,
        Long version,
        java.util.List<PettyCashManagedAsset> managedAssetsSnapshot
    ) {
        public static Statement from(PettyCashStatementResponse v) { return new Statement(v.id(), v.pettyCashFundId(), v.fundTypeSnapshot(), v.folio(), v.periodKey(), v.periodStart(), v.periodEnd(), v.cutOffDate(), v.openingBalanceAmount(), v.assignedAmount(), v.additionalDepositAmount(), v.declaredClosingBalanceAmount(), v.estimatedUsageAmount(), v.verifiedExpenseAmount(), v.returnedAmount(), v.shortageAmount(), v.carryForwardAmount(), v.currencyCode(), v.status(), v.responsibleUserId(), v.externalOwnerTypeSnapshot(), v.externalOwnerNameSnapshot(), v.externalOwnerRelationshipSnapshot(), v.attachmentCount(), v.version(), v.managedAssetsSnapshot()); }
    }
    public record Receipt(
        Long id,
        Long pettyCashFundId,
        Long pettyCashStatementId,
        Long expenseId,
        Long providerId,
        Long accountingAccountId,
        String description,
        String receiptReference,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal subtotalAmount,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal taxAmount,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal totalAmount,
        String currencyCode,
        LocalDate expenseDate,
        Integer attachmentCount,
        PettyCashSettlementLineStatus status,
        String cancellationReason,
        Instant cancelledAt,
        Long version
    ) {
        public static Receipt from(PettyCashSettlementLineResponse v) { return new Receipt(v.id(), v.pettyCashFundId(), v.pettyCashStatementId(), v.expenseId(), v.providerId(), v.accountingAccountId(), v.description(), v.receiptReference(), v.subtotalAmount(), v.taxAmount(), v.totalAmount(), v.currencyCode(), v.expenseDate(), v.attachmentCount(), v.status(), v.cancellationReason(), v.cancelledAt(), v.version()); }
    }
    public record Movement(
        Long id,
        Long pettyCashFundId,
        Long pettyCashStatementId,
        Long fromPaymentAccountId,
        Long toPaymentAccountId,
        String externalSourceName,
        String entryCategory,
        String counterpartyName,
        String statementDescription,
        String fundingMethod,
        PettyCashMovementType type,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal amount,
        String currencyCode,
        LocalDate movementDate,
        String reference,
        Long version
    ) {
        public static Movement from(PettyCashMovementResponse v) { return new Movement(v.id(), v.pettyCashFundId(), v.pettyCashStatementId(), v.fromPaymentAccountId(), v.toPaymentAccountId(), v.externalSourceName(), v.entryCategory(), v.counterpartyName(), v.statementDescription(), v.fundingMethod(), v.type(), v.amount(), v.currencyCode(), v.movementDate(), v.reference(), v.version()); }
    }
    public record Accounting(
        Long id,
        Long unitId,
        Long businessId,
        String code,
        String name,
        AccountingAccountGroup groupKey,
        String description,
        AccountingAccountStatus status,
        Long version
    ) {
        public static Accounting from(AccountingAccountResponse v) { return new Accounting(v.id(), v.unitId(), v.businessId(), v.code(), v.name(), v.groupKey(), v.description(), v.status(), v.version()); }
    }
    public record Account(
        Long id,
        Long unitId,
        Long businessId,
        String name,
        PaymentAccountType type,
        String currencyCode,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal openingBalance,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal currentBalance,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal pendingBalance,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal totalBalance,
        PaymentAccountStatus status,
        String description,
        String systemKey,
        boolean systemManaged,
        Long version
    ) {
        public static Account from(PaymentAccountResponse v) { return new Account(v.id(), v.unitId(), v.businessId(), v.name(), v.type(), v.currencyCode(), v.openingBalance(), v.currentBalance(), v.pendingBalance(), v.totalBalance(), v.status(), v.description(), v.systemKey(), v.systemManaged(), v.version()); }
    }
    public record Provider(
        Long id,
        Long unitId,
        Long businessId,
        String name,
        String legalName,
        Integer paymentTermsDays,
        ProviderStatus status,
        String notes,
        Long version
    ) {
        public static Provider from(ProviderResponse v) { return new Provider(v.id(), v.unitId(), v.businessId(), v.name(), v.legalName(), v.paymentTermsDays(), v.status(), v.notes(), v.version()); }
    }
    public record Budget(
        Long id,
        Long unitId,
        Long businessId,
        String name,
        String description,
        LocalDate periodStart,
        LocalDate periodEnd,
        String currencyCode,
        BudgetStatus status,
        Long version
    ) {
        public static Budget from(BudgetResponse v) { return new Budget(v.id(), v.unitId(), v.businessId(), v.name(), v.description(), v.periodStart(), v.periodEnd(), v.currencyCode(), v.status(), v.version()); }
    }
    public record BudgetLine(
        Long id,
        Long unitId,
        Long businessId,
        Long budgetId,
        String name,
        String categoryKey,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal plannedAmount,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal committedAmount,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal actualExpenseAmount,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal pettyCashIssuedAmount,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal pettyCashSettledAmount,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal availableAmount,
        BudgetHealthStatus healthStatus,
        String currencyCode,
        BudgetStatus status,
        String description,
        Integer attachmentCount,
        Long version,
        LocalDate scheduledDate,
        Long providerId,
        Long accountingAccountId,
        String accountingAccountName,
        Boolean includesTax,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal taxRate,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal taxAmount
    ) {
        public static BudgetLine from(BudgetLineResponse v) { return new BudgetLine(v.id(), v.unitId(), v.businessId(), v.budgetId(), v.name(), v.categoryKey(), v.plannedAmount(), v.committedAmount(), v.actualExpenseAmount(), v.pettyCashIssuedAmount(), v.pettyCashSettledAmount(), v.availableAmount(), v.healthStatus(), v.currencyCode(), v.status(), v.description(), v.attachmentCount(), v.version(), date(v.customFields(), "dueDate"), reference(v.customFields(), "providerId"), reference(v.customFields(), "accountingAccountId"), label(v.customFields(), "accountingAccount"), v.customFields()==null||!v.customFields().has("taxIncluded")?null:v.customFields().path("taxIncluded").asBoolean(), decimal(v.customFields(), "taxRate"), decimal(v.customFields(), "taxes")); }
    }

    private static String label(com.fasterxml.jackson.databind.JsonNode fields,String name) { return fields==null||fields.path(name).isNull()||fields.path(name).isMissingNode()?null:fields.path(name).asText(); }
    private static LocalDate date(com.fasterxml.jackson.databind.JsonNode fields,String name) { var value=label(fields,name);try{return value==null?null:LocalDate.parse(value);}catch(java.time.format.DateTimeParseException ignored){return null;} }
    private static Long reference(com.fasterxml.jackson.databind.JsonNode fields,String name) { var value=label(fields,name);try{return value==null?null:Long.valueOf(value);}catch(NumberFormatException ignored){return null;} }
    private static BigDecimal decimal(com.fasterxml.jackson.databind.JsonNode fields,String name) { var value=label(fields,name);try{return value==null?null:new BigDecimal(value);}catch(NumberFormatException ignored){return null;} }
}
