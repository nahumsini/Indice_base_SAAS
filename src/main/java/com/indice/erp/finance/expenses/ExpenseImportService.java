package com.indice.erp.finance.expenses;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.expenses.dto.ExpenseListResponse;
import com.indice.erp.finance.expenses.dto.ExpenseResponse;
import com.indice.erp.finance.expenses.dto.ImportExpensesRequest;
import com.indice.erp.finance.expenses.dto.UpdateExpensesBatchRequest;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver;
import java.time.LocalDate;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ExpenseImportService {
    private final ExpenseRepository repository;
    private final ExpenseService expenses;
    private final ExpenseReferenceValidator references;
    private final ExpenseImportRepository batches;
    private final ObjectMapper json;
    private final FinanceBusinessTimeZoneResolver timeZones;

    public ExpenseImportService(ExpenseRepository repository, ExpenseService expenses,
            ExpenseReferenceValidator references, ExpenseImportRepository batches, ObjectMapper json,
            FinanceBusinessTimeZoneResolver timeZones) {
        this.repository = repository;
        this.expenses = expenses;
        this.references = references;
        this.batches = batches;
        this.json = json;
        this.timeZones = timeZones;
    }

    @Transactional
    public ExpenseListResponse importExpenses(FinanceContext context, ImportExpensesRequest request) {
        if (request.requestKey() == null || request.requestKey().isBlank() || request.requestKey().length() > 80
                || request.expenses() == null || request.expenses().isEmpty() || request.expenses().size() > 200) {
            throw FinanceApiException.badRequest("An import requires a request key and between 1 and 200 rows.");
        }
        repository.lockCompanyForCreation(context);
        var hash = fingerprint(request.expenses());
        var previous = batches.findForUpdate(context, request.requestKey().trim());
        if (!previous.isEmpty()) {
            var batch = previous.orElseThrow();
            if (batch.actor() != context.userId() || !batch.hash().equals(hash)) {
                throw FinanceApiException.conflict("This import was already saved. Reload Expenses before importing another batch.");
            }
            var saved = readIds(batch.ids()).stream().map(id -> expenses.get(context, id)).toList();
            return new ExpenseListResponse(saved, saved.size());
        }
        var saved = new ArrayList<ExpenseResponse>();
        for (var index = 0; index < request.expenses().size(); index++) {
            var row = request.expenses().get(index);
            try {
                if (row == null) throw FinanceApiException.badRequest("Expense row is required.");
                if (row.purchaseOrderId() != null || row.budgetLineId() != null) {
                    throw FinanceApiException.badRequest("Use the source workflow for purchase orders and budget-linked expenses.");
                }
                if (!"AUTO-EXP".equals(row.folio())) {
                    throw FinanceApiException.badRequest("Imported expense numbers are assigned by the system.");
                }
                references.validateImportPaymentAccount(context, row.paymentAccountId(), row.currencyCode());
                references.validateImportAccountingAccount(context, row.accountingAccountId());
                if (Boolean.TRUE.equals(row.settleOnCreate())) {
                    if (row.paymentAccountId() == null)
                        throw FinanceApiException.badRequest("Paid imports require a payment account on every row.");
                    if (row.expenseDate() == null || row.expenseDate().isAfter(LocalDate.now(timeZones.resolve(context.companyId()))))
                        throw FinanceApiException.badRequest("Paid imports require an expense date no later than today.");
                }
                row = ExpenseImportTax.normalize(row);
                saved.add(expenses.createDraft(context, row));
            } catch (FinanceApiException ex) {
                throw new FinanceApiException(ex.status(), "Row " + (index + 1) + ": " + ex.getMessage());
            }
        }
        batches.insert(context, request.requestKey().trim(), hash, serialize(saved.stream().map(ExpenseResponse::id).toList()));
        return new ExpenseListResponse(List.copyOf(saved), saved.size());
    }

    private String fingerprint(Object value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(serialize(value).getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 unavailable", ex);
        }
    }

    @Transactional
    public ExpenseListResponse updateExpenses(FinanceContext context, UpdateExpensesBatchRequest request) {
        repository.lockCompanyForCreation(context);
        var rows = request.expenses();
        if (rows == null || rows.isEmpty() || rows.size() > 200
                || rows.stream().map(UpdateExpensesBatchRequest.Row::id).distinct().count() != rows.size()) {
            throw FinanceApiException.badRequest("A batch requires between 1 and 200 distinct expenses.");
        }
        var saved = new ArrayList<ExpenseResponse>();
        for (var index = 0; index < rows.size(); index++) {
            var row = rows.get(index);
            try {
                var existing = repository.findByIdForUpdate(context, row.id())
                    .orElseThrow(() -> FinanceApiException.notFound("Expense not found."));
                if (!java.util.Objects.equals(row.expectedVersion(), existing.version())) {
                    throw FinanceApiException.conflict("The expense changed. Reload it before editing.");
                }
                if (existing.purchaseOrderId() != null || existing.budgetLineId() != null || existing.originFund() != null
                        || existing.accountingPosted()) {
                    throw FinanceApiException.conflict("This expense is protected and cannot be edited in a batch.");
                }
                references.validateImportPaymentAccount(context, row.expense().paymentAccountId(), row.expense().currencyCode());
                references.validateImportAccountingAccount(context, row.expense().accountingAccountId());
                saved.add(expenses.updateDraft(context, row.id(), row.expense()));
            } catch (FinanceApiException ex) {
                throw new FinanceApiException(ex.status(), "Row " + (index + 1) + ": " + ex.getMessage());
            }
        }
        return new ExpenseListResponse(List.copyOf(saved), saved.size());
    }
    private String serialize(Object value) {
        try { return json.writeValueAsString(value); }
        catch (JsonProcessingException ex) { throw new IllegalStateException("Import could not be serialized", ex); }
    }
    private List<Long> readIds(String value) {
        try { return json.readValue(value, new TypeReference<List<Long>>() {}); }
        catch (JsonProcessingException ex) { throw new IllegalStateException("Import evidence could not be read", ex); }
    }
}
