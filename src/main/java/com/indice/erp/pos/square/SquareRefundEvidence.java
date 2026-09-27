package com.indice.erp.pos.square;

import java.math.BigDecimal;

record SquareRefundEvidence(String id, String paymentId, String status,
        BigDecimal amount, String currency, String safeJson) {
}
