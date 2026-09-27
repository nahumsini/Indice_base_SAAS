package com.indice.erp.pos.square;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.shift.ShiftRepository;
import org.springframework.stereotype.Component;

@Component
class SquarePaymentAccess {
    private final ShiftRepository shifts;
    SquarePaymentAccess(ShiftRepository shifts) {
        this.shifts = shifts;
    }
    void require(PosContext context, SquareRecords.PaymentIntent intent) {
        var shift = shifts.findById(context, intent.shiftId())
            .orElseThrow(() -> PosApiException.notFound("Square payment intent was not found."));
        if (!context.companyId().equals(shift.companyId()) || intent.companyId() != shift.companyId()
                || intent.cashRegisterId() != shift.cashRegisterId())
            throw PosApiException.notFound("Square payment intent was not found.");
        if (!context.canManageOtherUsers() && !context.userId().equals(intent.createdByUserId())) {
            throw PosApiException.notFound("Square payment intent was not found.");
        }
    }
    boolean allowed(PosContext context, SquareRecords.PaymentIntent intent) {
        try {
            require(context, intent);
            return true;
        } catch (PosApiException denied) {
            return false;
        }
    }
}
