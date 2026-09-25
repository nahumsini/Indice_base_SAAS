package com.indice.erp.pos.checkout;

import com.indice.erp.pos.cashregister.CashRegisterService;
import com.indice.erp.pos.discount.DiscountRuleService;
import com.indice.erp.pos.payment.PaymentMapper;
import com.indice.erp.pos.payment.PaymentRepository;
import com.indice.erp.pos.shift.ShiftRepository;
import com.indice.erp.pos.selfservice.SelfServiceKioskRepository;
import com.indice.erp.pos.restaurant.RestaurantOrderService;
import com.indice.erp.pos.settlement.SettlementPolicyService;
import com.indice.erp.pos.ticket.TicketMapper;
import com.indice.erp.pos.ticket.TicketRepository;
import org.springframework.stereotype.Component;

@Component
public record CheckoutDependencies(
        CashRegisterService cashRegisters, ShiftRepository shifts,
        CheckoutLookupRepository lookup, SalesRecordSummaryRepository sales,
        TicketRepository tickets, PaymentRepository payments,
        InventoryDeductionService inventory, TicketMapper ticketMapper,
        PaymentMapper paymentMapper, CheckoutCalculator calculator,
        CheckoutValidator validator, DiscountRuleService discounts,
        SelfServiceKioskRepository pretickets, RestaurantOrderService restaurants,
        SettlementPolicyService settlement) {
}
