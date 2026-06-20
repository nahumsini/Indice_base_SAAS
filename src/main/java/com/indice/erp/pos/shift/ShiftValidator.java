package com.indice.erp.pos.shift;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.cashregister.CashRegisterRecord;
import com.indice.erp.pos.cashregister.CashRegisterValidator;
import com.indice.erp.pos.status.ShiftStatus;
import org.springframework.stereotype.Component;

@Component
public class ShiftValidator {

    private final CashRegisterValidator cashRegisterValidator;

    public ShiftValidator(CashRegisterValidator cashRegisterValidator) {
        this.cashRegisterValidator = cashRegisterValidator;
    }

    public void validateOpen(
            CashRegisterRecord register,
            boolean registerHasBlockingShift,
            boolean userHasBlockingShift) {
        cashRegisterValidator.requireOperable(register);
        if (registerHasBlockingShift) {
            throw PosApiException.conflict("Cash register already has an open shift.");
        }
        if (userHasBlockingShift) {
            throw PosApiException.conflict("User already has an open shift.");
        }
    }

    public void requireClosable(PosContext context, ShiftRecord shift) {
        if (shift.status() != ShiftStatus.OPEN && shift.status() != ShiftStatus.CLOSING) {
            throw PosApiException.conflict("Only open shifts can be closed.");
        }
        requireOwnShiftOrAdmin(context, shift);
    }

    public void requireCancelable(PosContext context, ShiftRecord shift) {
        if (shift.status() != ShiftStatus.OPEN) {
            throw PosApiException.conflict("Only open shifts can be cancelled.");
        }
        requireOwnShiftOrAdmin(context, shift);
    }

    private void requireOwnShiftOrAdmin(PosContext context, ShiftRecord shift) {
        if (!shift.openedByUserId().equals(context.userId()) && !context.canManageOtherUsers()) {
            throw PosApiException.forbidden("Shift belongs to another user.");
        }
    }
}
