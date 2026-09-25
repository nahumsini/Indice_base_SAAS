package com.indice.erp.pos.checkout;

import com.indice.erp.pos.terminal.TerminalPaymentGuard;
import static org.mockito.Mockito.mock;

final class CheckoutTestFactory {
    private CheckoutTestFactory() {}
    static CheckoutService create(CheckoutDependencies dependencies) {
        var orders = new CheckoutSourceOrders(new CheckoutPreticketPolicy(dependencies, new PreticketLinePolicy()),
            new CheckoutRestaurantPolicy(dependencies, new RestaurantCheckoutLinePolicy()));
        var discounts = new CheckoutDiscountPolicy(dependencies, new CheckoutAggregateDiscountPolicy(dependencies));
        var persistence = new CheckoutPersistence(dependencies, new CheckoutTicketWriter(dependencies),
            new CheckoutSalesSummaryWriter(dependencies), new CheckoutPaymentWriter(dependencies), orders);
        return new CheckoutService(new CheckoutPreparation(dependencies), orders, discounts, persistence,
            new CheckoutPreflightValidation(dependencies, new CheckoutPreparation(dependencies),
                new CheckoutTerminalSourceOrders(mock(com.indice.erp.pos.selfservice.SelfServiceTerminalCheckoutReader.class),
                    mock(com.indice.erp.pos.restaurant.RestaurantTerminalCheckoutReader.class), new PreticketLinePolicy(), new RestaurantCheckoutLinePolicy()), discounts,
                new CheckoutTerminalPayments(dependencies, mock(com.indice.erp.pos.settlement.TerminalSettlementPaymentPolicy.class))),
            new CheckoutLegacyValidation(dependencies, new CheckoutPreparation(dependencies), orders, discounts), mock(TerminalPaymentGuard.class));
    }
}
