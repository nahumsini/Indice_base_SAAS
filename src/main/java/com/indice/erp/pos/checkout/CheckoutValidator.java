package com.indice.erp.pos.checkout;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.checkout.dto.PosCheckoutRequest;
import com.indice.erp.pos.shift.ShiftRecord;
import com.indice.erp.pos.status.ShiftStatus;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class CheckoutValidator {

    public void requireOpenShift(PosContext context, ShiftRecord shift, long cashRegisterId) {
        if (shift == null) {
            throw PosApiException.badRequest("Open shift required for checkout.");
        }
        if (!shift.openedByUserId().equals(context.userId())) {
            throw PosApiException.forbidden("Open shift belongs to another user.");
        }
        if (!shift.cashRegisterId().equals(cashRegisterId)) {
            throw PosApiException.badRequest("Open shift does not belong to the selected cash register.");
        }
        if (shift.status() != ShiftStatus.OPEN) {
            throw PosApiException.conflict("Checkout requires an OPEN shift.");
        }
    }

    public void validateRequest(PosCheckoutRequest request) {
        if (request.items() == null || request.items().isEmpty()) {
            throw PosApiException.badRequest("Checkout requires at least one item.");
        }
        if (request.payments() == null || request.payments().isEmpty()) {
            throw PosApiException.badRequest("Checkout requires at least one payment.");
        }
        if (CheckoutCalculator.normalizeCurrency(request.currencyCode()).length() != 3) {
            throw PosApiException.badRequest("currencyCode must be a 3-letter code.");
        }
    }

    public void validateLines(List<CheckoutLine> lines) {
        lines.forEach(line -> {
            if (line.quantity().compareTo(BigDecimal.ZERO) <= 0) {
                throw PosApiException.badRequest("Item quantity must be greater than zero.");
            }
            if (line.unitPrice().compareTo(BigDecimal.ZERO) < 0) {
                throw PosApiException.badRequest("Item unitPrice cannot be negative.");
            }
            if (line.discountAmount().compareTo(BigDecimal.ZERO) < 0 || line.taxAmount().compareTo(BigDecimal.ZERO) < 0) {
                throw PosApiException.badRequest("Item discounts and taxes cannot be negative.");
            }
            if (line.lineTotalAmount().compareTo(BigDecimal.ZERO) < 0) {
                throw PosApiException.badRequest("Item line total cannot be negative.");
            }
        });
    }

    public void validatePayments(List<CheckoutPayment> payments) {
        payments.forEach(payment -> {
            if (payment.amount().compareTo(BigDecimal.ZERO) <= 0) {
                throw PosApiException.badRequest("Payment amount must be greater than zero.");
            }
        });
    }

    public void validateTotals(CheckoutTotals totals) {
        if (totals.totalAmount().compareTo(BigDecimal.ZERO) < 0) {
            throw PosApiException.badRequest("Ticket total cannot be negative.");
        }
        if (totals.balanceAmount().compareTo(BigDecimal.ZERO) != 0) {
            throw PosApiException.badRequest("Paid amount must equal total amount.");
        }
    }
}
