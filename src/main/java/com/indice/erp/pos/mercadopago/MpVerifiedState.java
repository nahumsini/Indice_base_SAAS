package com.indice.erp.pos.mercadopago;

import java.math.BigDecimal;

public record MpVerifiedState(String status, BigDecimal refundedAmount, boolean blocksFinalization) {
}
