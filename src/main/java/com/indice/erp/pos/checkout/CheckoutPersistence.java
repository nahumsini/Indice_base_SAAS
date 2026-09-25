package com.indice.erp.pos.checkout;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.checkout.dto.PosCheckoutRequest;
import com.indice.erp.pos.checkout.dto.PosCheckoutResponse;
import com.indice.erp.pos.checkout.dto.PosPrintableSummary;
import com.indice.erp.pos.discount.DiscountDtos.RuleResponse;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
class CheckoutPersistence {
    private final CheckoutDependencies dependencies;
    private final CheckoutTicketWriter tickets;
    private final CheckoutSalesSummaryWriter sales;
    private final CheckoutPaymentWriter payments;
    private final CheckoutSourceOrders orders;
    CheckoutPersistence(CheckoutDependencies dependencies, CheckoutTicketWriter tickets, CheckoutSalesSummaryWriter sales,
            CheckoutPaymentWriter payments, CheckoutSourceOrders orders) {
        this.dependencies = dependencies;
        this.tickets = tickets;
        this.sales = sales;
        this.payments = payments;
        this.orders = orders;
    }
    PosCheckoutResponse save(PosContext context, PosCheckoutRequest request, CheckoutDraft draft, List<RuleResponse> rules) {
        var number = tickets.nextNumber(context);
        var inventory = draft.lines().stream().anyMatch(line -> line.stockTracked() && line.productId() != null);
        var salesId = sales.insert(context, request, draft, number, inventory);
        var ticket = tickets.insert(context, request, draft, salesId, number, inventory);
        var items = dependencies.tickets().insertItems(context, ticket.id(), tickets.items(draft));
        for (var index = 0; index < rules.size(); index++) {
            if (rules.get(index) != null) dependencies.discounts().recordApplication(context, rules.get(index),
                ticket.id(), items.get(index).id(), draft.lines().get(index).discountAmount());
        }
        dependencies.inventory().deduct(context, draft.shift(), ticket, draft.lines(), items);
        var records = payments.insert(context, draft, ticket.id());
        orders.complete(context, request, draft, ticket.id());
        return new PosCheckoutResponse(dependencies.ticketMapper().toResponse(ticket),
            items.stream().map(dependencies.ticketMapper()::toResponse).toList(),
            records.stream().map(dependencies.paymentMapper()::toResponse).toList(),
            new PosPrintableSummary(ticket.ticketNumber(), CheckoutText.customerName(draft.customer()), ticket.currencyCode(),
                ticket.subtotalAmount(), ticket.discountAmount(), ticket.taxAmount(), ticket.totalAmount(), ticket.paidAmount(), ticket.completedAt()));
    }
}
