package com.indice.erp.finance.payablekiosk;

import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.payablekiosk.dto.PublicPayableRequest;
import com.indice.erp.finance.shared.FinanceValidationSupport;

final class PayableKioskSubmissionValidator {

    private PayableKioskSubmissionValidator() {
    }

    static PublicPayableRequest validateAndNormalize(
            PayableKioskRow kiosk,
            PublicPayableRequest request) {
        if (request == null) {
            throw FinanceApiException.badRequest("Payable submission is required.");
        }
        var subtotal = FinanceValidationSupport.requireNonNegative(
            request.subtotalAmount(), "subtotalAmount");
        var tax = FinanceValidationSupport.requireNonNegative(
            request.taxAmount(), "taxAmount");
        var submittedTotal = FinanceValidationSupport.requireNonNegative(
            request.totalAmount(), "totalAmount");
        var currency = FinanceValidationSupport.requireCurrencyCode(request.currencyCode());
        var kioskCurrency = FinanceValidationSupport.requireCurrencyCode(kiosk.currencyCode());
        if (!kioskCurrency.equals(currency)) {
            throw FinanceApiException.badRequest(
                "currencyCode must match the payable kiosk currency.");
        }
        var authoritativeTotal = subtotal.add(tax);
        if (authoritativeTotal.compareTo(submittedTotal) != 0) {
            throw FinanceApiException.badRequest(
                "totalAmount must equal subtotalAmount plus taxAmount.");
        }
        if (authoritativeTotal.signum() <= 0) {
            throw FinanceApiException.badRequest("totalAmount must be greater than zero.");
        }
        return new PublicPayableRequest(
            request.providerId(), request.concept(), request.description(),
            subtotal, tax, authoritativeTotal, kioskCurrency,
            request.dueDate(), request.externalReference());
    }
}
