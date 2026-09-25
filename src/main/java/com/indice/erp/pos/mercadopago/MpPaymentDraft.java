package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.shift.ShiftRecord;
import java.math.BigDecimal;

public record MpPaymentDraft(ShiftRecord shift, BigDecimal amount, String checkoutJson) {
}
