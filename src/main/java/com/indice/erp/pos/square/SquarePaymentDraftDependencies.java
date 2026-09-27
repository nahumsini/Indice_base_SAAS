package com.indice.erp.pos.square;

import com.indice.erp.pos.cashregister.CashRegisterService;
import com.indice.erp.pos.checkout.CheckoutCalculator;
import com.indice.erp.pos.checkout.CheckoutLookupRepository;
import com.indice.erp.pos.checkout.CheckoutService;
import com.indice.erp.pos.checkout.CheckoutValidator;
import com.indice.erp.pos.shift.ShiftRepository;
import org.springframework.stereotype.Component;

@Component
record SquarePaymentDraftDependencies(CashRegisterService cashRegisters, ShiftRepository shifts,
    CheckoutLookupRepository lookup, CheckoutCalculator calculator, CheckoutValidator validator, CheckoutService checkout) {}
