package com.indice.erp.pos.cashmovement;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.shift.ShiftRecord;
import com.indice.erp.pos.status.ShiftStatus;
import java.math.BigDecimal;
import org.springframework.stereotype.Component;

@Component
public class CashMovementValidator {

    public void validate(PosContext context, ShiftRecord shift, CashMovementCommand command) {
        if (shift.status() != ShiftStatus.OPEN) {
            throw PosApiException.conflict("Cash movements require an OPEN shift.");
        }
        if (!shift.openedByUserId().equals(context.userId()) && !context.canManageOtherUsers()) {
            throw PosApiException.forbidden("Shift belongs to another user.");
        }
        if (!shift.cashRegisterId().equals(command.cashRegisterId())) {
            throw PosApiException.badRequest("Cash register does not match the shift.");
        }
        if (!shift.currencyCode().equalsIgnoreCase(command.currencyCode())) {
            throw PosApiException.badRequest("Cash movement currency must match the shift currency.");
        }
        if (command.reason() == null) {
            throw PosApiException.badRequest("Cash movement reason is required.");
        }
        validateAmount(command);
        if (shift.expectedCashAmount().add(delta(command)).compareTo(BigDecimal.ZERO) < 0) {
            throw PosApiException.badRequest("Cash movement cannot make expected cash negative.");
        }
    }

    public BigDecimal delta(CashMovementCommand command) {
        return switch (command.movementType()) {
            case CASH_IN -> command.amount();
            case CASH_OUT, SAFE_DROP -> command.amount().negate();
            case CORRECTION -> command.amount();
        };
    }

    private void validateAmount(CashMovementCommand command) {
        if (command.amount() == null || command.amount().compareTo(BigDecimal.ZERO) == 0) {
            throw PosApiException.badRequest("Cash movement amount cannot be zero.");
        }
        if (command.movementType() != CashMovementType.CORRECTION
                && command.amount().compareTo(BigDecimal.ZERO) < 0) {
            throw PosApiException.badRequest("Cash movement amount must be positive.");
        }
    }
}
