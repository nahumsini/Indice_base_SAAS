package com.indice.erp.pos.checkout;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.payment.PaymentInsertCommand;
import com.indice.erp.pos.payment.PaymentRecord;
import com.indice.erp.pos.status.PaymentStatus;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
class CheckoutPaymentWriter {
    private final CheckoutDependencies dependencies;
    CheckoutPaymentWriter(CheckoutDependencies dependencies) {
        this.dependencies = dependencies;
    }
    List<PaymentRecord> insert(PosContext context, CheckoutDraft draft, long ticketId) {
        var shift = draft.shift();
        var commands = draft.payments().stream().map(payment -> new PaymentInsertCommand(
            shift.id(), shift.cashRegisterId(), payment.paymentMethod(), payment.paymentAccountId(), payment.amount(),
            payment.currencyCode(), CheckoutText.truncate(payment.reference(), 160), PaymentStatus.CAPTURED, context.userId(), null)).toList();
        var records = dependencies.payments().insertAll(context, ticketId, commands);
        if (draft.totals().cashPaidAmount().compareTo(BigDecimal.ZERO) > 0
                && !dependencies.shifts().increaseExpectedCash(context, shift.id(), draft.totals().cashPaidAmount())) {
            throw PosApiException.conflict("Open shift cash total could not be updated.");
        }
        return records;
    }
}
