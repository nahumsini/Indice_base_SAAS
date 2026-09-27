package com.indice.erp.pos.shift;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.cashregister.CashRegisterService;
import com.indice.erp.pos.shift.dto.ShiftOpenRequest;
import com.indice.erp.pos.shift.dto.ShiftResponse;
import com.indice.erp.pos.terminal.TerminalPaymentGuard;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class ShiftOpeningService {
    private final ShiftRepository repository;
    private final CashRegisterService registers;
    private final ShiftMapper mapper;
    private final ShiftValidator validator;
    private final TerminalPaymentGuard guard;
    ShiftOpeningService(ShiftRepository repository, CashRegisterService registers,
            ShiftMapper mapper, ShiftValidator validator, TerminalPaymentGuard guard) {
        this.repository = repository;
        this.registers = registers;
        this.mapper = mapper;
        this.validator = validator;
        this.guard = guard;
    }
    @Transactional
    public ShiftResponse open(PosContext context, ShiftOpenRequest request) {
        guard.lockRegister(context, request.cashRegisterId());
        guard.assertNoPending(context, request.cashRegisterId());
        var register = registers.requireOperationalRegister(context, request.cashRegisterId());
        validator.validateOpen(register, repository.hasBlockingShiftForRegister(context, register.id()),
            repository.hasBlockingShiftForUser(context, context.userId()));
        return mapper.toResponse(repository.insertOpen(context, mapper.toOpenCommand(context, register, request)));
    }
}
