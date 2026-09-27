package com.indice.erp.pos.checkout;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import java.math.BigDecimal;

record TerminalCheckoutEvidence(long registerId, long shiftId, long userId, String role,
        String scopeType, Long unitId, Long businessId, BigDecimal amount, String currency,
        String paymentId, String checkoutJson) {
    boolean matches(PosContext context) {
        return userId == context.userId() && java.util.Objects.equals(role, context.role())
            && java.util.Objects.equals(scopeType, context.scope().type().name())
            && java.util.Objects.equals(unitId, context.scope().unitId())
            && java.util.Objects.equals(businessId, context.scope().businessId());
    }
}
