package com.indice.erp.finance.budgetlines;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.expenses.ExpenseService;
import com.indice.erp.finance.expenses.ExpenseType;
import com.indice.erp.finance.expenses.dto.CreateExpenseRequest;
import com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceJsonSupport;
import com.indice.erp.finance.status.BudgetStatus;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** One transaction per scheduled line; the expense owner remains the sole writer of expenses/payments. */
@Service
public class BudgetExpenseMaterializer {
    private final BudgetLineRepository lines;
    private final BudgetExpenseOccurrenceRepository occurrences;
    private final ExpenseService expenses;
    private final FinanceBusinessTimeZoneResolver timeZones;

    BudgetExpenseMaterializer(BudgetLineRepository lines, BudgetExpenseOccurrenceRepository occurrences,
            ExpenseService expenses, FinanceBusinessTimeZoneResolver timeZones) {
        this.lines = lines; this.occurrences = occurrences; this.expenses = expenses; this.timeZones = timeZones;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean materialize(FinanceContext context, long lineId) {
        occurrences.lockCompany(context);
        var zone = timeZones.resolve(context.companyId());
        return materializeAt(context, lineId, LocalDate.now(zone));
    }

    // Package visibility permits deterministic month/timezone regression without a client-controlled date.
    boolean materializeAt(FinanceContext context, long lineId, LocalDate today) {
        occurrences.lockCompany(context);
        var line = lines.findByIdForUpdate(context, lineId)
            .orElseThrow(() -> FinanceApiException.notFound("Budget line not found."));
        if (occurrences.resolved(context, lineId) || line.status() != BudgetStatus.ACTIVE) return false;
        var metadata = FinanceJsonSupport.toJsonNode(line.metadataJson());
        if (metadata == null || !"expenses-frontend".equals(metadata.path("source").asText())) return false;
        var fields = FinanceJsonSupport.toJsonNode(line.customFieldsJson());
        var due = scheduledDate(fields);
        if (due == null) return review(context, line, null, "INVALID_SCHEDULE");
        if (due.isAfter(YearMonth.from(today).atEndOfMonth())) return false;
        if (!occurrences.validParent(line, due) || !occurrences.strictAssignment(line))
            return review(context, line, due, "INVALID_BUDGET_SCOPE");

        var existing = occurrences.existingExpense(line);
        if (existing != null) {
            occurrences.record(context, line, due, existing, "EXISTING", "LINKED_EXPENSE");
            return false;
        }
        if (line.actualExpenseAmount().signum() > 0 || line.committedAmount().signum() > 0
                || line.pettyCashIssuedAmount().signum() > 0 || line.pettyCashSettledAmount().signum() > 0
                || decimal(fields, "amountPaid").signum() > 0
                || "paid".equals(fields.path("legacyStatus").asText())
                || "audited".equals(fields.path("legacyStatus").asText()))
            return review(context, line, due, "EXISTING_FINANCIAL_ACTIVITY");

        var activation = occurrences.activation();
        var activationMonth = YearMonth.from(activation.atZone(timeZones.resolve(context.companyId())));
        if (line.createdAt().isBefore(activation) && YearMonth.from(due).isBefore(activationMonth))
            return review(context, line, due, "HISTORICAL_RECONCILIATION");

        var concept = fields.path("concept").asText(line.name()).trim();
        if (concept.isEmpty() || concept.length() > 220) return review(context, line, due, "INVALID_CONCEPT");
        if (occurrences.possibleManualExpense(line, due, concept))
            return review(context, line, due, "POSSIBLE_MANUAL_EXPENSE");
        var total = line.plannedAmount().setScale(2, RoundingMode.HALF_UP);
        var tax = decimal(fields, "taxes").setScale(2, RoundingMode.HALF_UP);
        if (total.signum() <= 0 || tax.signum() < 0 || tax.compareTo(total) > 0)
            return review(context, line, due, "INVALID_AMOUNTS");

        var expenseFields = JsonNodeFactory.instance.objectNode();
        for (var key : new String[]{"providerName", "taxCountry", "taxIncluded", "taxMode", "taxName",
                "taxProfileId", "taxRate", "taxRegion", "taxSpecialAmount"}) {
            if (fields.hasNonNull(key)) expenseFields.set(key, fields.get(key));
        }
        expenseFields.put("entryType", "payable").put("legacyStatus", "pending")
            .put("budgetFolio", fields.path("folio").asText()).put("paymentMethod", "transfer");
        var provenance = JsonNodeFactory.instance.objectNode().put("source", "budget-monthly-obligation")
            .put("budgetLineId", line.id()).put("scheduledDate", due.toString());
        var created = expenses.createDraft(context, new CreateExpenseRequest(
            line.unitId(), line.businessId(), reference(fields, "providerId"), line.id(),
            occurrences.accountingAccount(line, fields.path("accountingAccount").asText("")), null, null, "AUTO-CXP", concept, line.description(),
            ExpenseType.FIXED, total.subtract(tax), tax, total, line.currencyCode(), due, due,
            null, null, null, false, expenseFields, provenance));
        occurrences.record(context, line, due, created.id(), "GENERATED", null);
        return true;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordInvalidReference(FinanceContext context, long lineId) {
        occurrences.lockCompany(context);
        var line = lines.findByIdForUpdate(context, lineId).orElse(null);
        if (line != null && !occurrences.resolved(context, lineId))
            review(context, line, scheduledDate(FinanceJsonSupport.toJsonNode(line.customFieldsJson())), "INVALID_REFERENCE");
    }

    private boolean review(FinanceContext context, BudgetLineRecord line, LocalDate due, String reason) {
        occurrences.record(context, line, due, null, "REVIEW", reason);
        return false;
    }

    private LocalDate scheduledDate(JsonNode fields) {
        if (fields == null) return null;
        var text = fields.path("dueDate").asText();
        if (!text.matches("\\d{4}-\\d{2}-\\d{2}")) return null;
        try { return LocalDate.parse(text); } catch (java.time.DateTimeException ex) { return null; }
    }

    private BigDecimal decimal(JsonNode fields, String key) {
        var value = fields.path(key);
        if (value.isMissingNode() || value.isNull() || value.asText().isBlank()) return BigDecimal.ZERO;
        try { return new BigDecimal(value.asText()); }
        catch (NumberFormatException ex) { throw FinanceApiException.badRequest("Invalid budget amount."); }
    }

    private Long reference(JsonNode fields, String key) {
        var value = fields.path(key).asText("").trim();
        if (value.isEmpty()) return null;
        try {
            long id = Long.parseLong(value);
            if (id > 0) return id;
        } catch (NumberFormatException ignored) { }
        throw FinanceApiException.badRequest("Invalid budget reference.");
    }
}
