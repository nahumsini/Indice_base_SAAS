package com.indice.erp.pos.checkout;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.checkout.dto.PosCheckoutRequest;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
class TerminalCheckoutSnapshotPolicy {
    private final ObjectMapper mapper;
    TerminalCheckoutSnapshotPolicy(ObjectMapper mapper) {
        this.mapper = mapper;
    }
    void validate(TerminalCheckoutEvidence evidence, PosCheckoutRequest request) {
        try {
            var saved = mapper.readTree(evidence.checkoutJson());
            var submitted = mapper.readTree(mapper.writeValueAsString(request));
            for (var field : List.of("cashRegisterId", "customerId", "preticketId", "restaurantOrderId", "items", "notes")) {
                if (!saved.path(field).equals(submitted.path(field))) throw new IllegalArgumentException();
            }
            if (!evidence.currency().equals(CheckoutCalculator.normalizeCurrency(request.currencyCode()))
                    || request.payments() == null || request.payments().size() != 1) throw new IllegalArgumentException();
            var payment = request.payments().getFirst();
            if (!"CARD".equals(payment.paymentMethod()) || payment.paymentAccountId() != null || payment.amount() == null
                    || payment.amount().compareTo(evidence.amount()) != 0
                    || evidence.paymentId() == null || evidence.paymentId().isBlank()) throw new IllegalArgumentException();
        } catch (Exception invalid) {
            throw PosApiException.conflict("Terminal checkout must match its approved sale snapshot.");
        }
    }
}
