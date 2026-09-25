package com.indice.erp.pos.checkout;

import com.indice.erp.pos.cashregister.CashRegisterRecord;
import com.indice.erp.pos.shift.ShiftRecord;
import java.util.List;

record CheckoutDraft(CashRegisterRecord register, ShiftRecord shift, String currency,
        CustomerSnapshot customer, List<CheckoutLine> lines,
        List<CheckoutPayment> payments, CheckoutTotals totals) {
}
