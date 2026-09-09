package com.indice.erp.finance.expenses;

import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.expenses.dto.CreateExpenseRequest;
import java.math.BigDecimal;
import java.math.RoundingMode;

/** Import totals are gross amounts. The selected rate is explicit transaction evidence. */
final class ExpenseImportTax {
    private ExpenseImportTax() {}

    static CreateExpenseRequest normalize(CreateExpenseRequest row) {
        var fields = row.customFields();
        // Older integrations retain their explicit tax breakdown.
        if (fields == null || !fields.has("bulkTaxIncluded")) return row;
        if (!fields.path("bulkTaxIncluded").isBoolean())
            throw FinanceApiException.badRequest("Includes tax must be true or false.");
        var total = row.totalAmount();
        if (total == null || total.signum() <= 0 || total.stripTrailingZeros().scale() > 2)
            throw FinanceApiException.badRequest("Import amount must be positive with at most two decimal places.");
        var included = fields.path("bulkTaxIncluded").booleanValue();
        BigDecimal tax = BigDecimal.ZERO;
        if (included) {
            var rateNode = fields.path("taxRate");
            if (!rateNode.isNumber()) throw FinanceApiException.badRequest("Select the included tax rate.");
            var rate = rateNode.decimalValue();
            if (rate.signum() <= 0 || rate.compareTo(BigDecimal.ONE) > 0)
                throw FinanceApiException.badRequest("Included tax rate must be greater than zero and at most 100 percent.");
            var subtotal = total.divide(BigDecimal.ONE.add(rate), 2, RoundingMode.HALF_UP);
            tax = total.subtract(subtotal);
        }
        return new CreateExpenseRequest(row.unitId(), row.businessId(), row.providerId(), row.budgetLineId(),
            row.accountingAccountId(), row.paymentAccountId(), row.purchaseOrderId(), row.folio(), row.concept(),
            row.description(), row.expenseType(), total.subtract(tax), tax, total, row.currencyCode(), row.expenseDate(),
            row.dueDate(), row.requestedByUserId(), row.approvedByUserId(), row.performedByUserId(), row.settleOnCreate(),
            row.customFields(), row.metadata());
    }
}
