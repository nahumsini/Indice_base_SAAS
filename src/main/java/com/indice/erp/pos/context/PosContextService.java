package com.indice.erp.pos.context;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.cashregister.CashRegisterRepository;
import com.indice.erp.pos.cashregister.CashRegisterService;
import com.indice.erp.pos.context.dto.PosContextResponse;
import com.indice.erp.pos.context.dto.PosScopeResponse;
import com.indice.erp.pos.shift.ShiftService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PosContextService {

    private final CashRegisterRepository cashRegisterRepository;
    private final CashRegisterService cashRegisterService;
    private final ShiftService shiftService;

    public PosContextService(
            CashRegisterRepository cashRegisterRepository,
            CashRegisterService cashRegisterService,
            ShiftService shiftService) {
        this.cashRegisterRepository = cashRegisterRepository;
        this.cashRegisterService = cashRegisterService;
        this.shiftService = shiftService;
    }

    @Transactional(readOnly = true)
    public PosContextResponse context(PosContext context) {
        return new PosContextResponse(
            cashRegisterRepository.listWarehouses(context),
            cashRegisterService.activeRegisters(context),
            shiftService.currentOpenShift(context),
            new PosScopeResponse(context.scope().type(), context.scope().unitId(), context.scope().businessId()),
            context.canManageOtherUsers()
        );
    }
}
