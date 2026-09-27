package com.indice.erp.pos.square;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import com.indice.erp.pos.checkout.dto.PosCheckoutPaymentRequest;
import com.indice.erp.pos.checkout.dto.PosCheckoutRequest;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
class SquareFinalizationSnapshot {
    private final SquarePaymentIntentRepository intents;
    private final ObjectMapper mapper;
    SquareFinalizationSnapshot(SquarePaymentIntentRepository intents, ObjectMapper mapper) {
        this.intents = intents;
        this.mapper = mapper;
    }
    PosContext context(SquareRecords.PaymentIntent intent) {
        if (intent.scopeType() == null || intent.createdByRole() == null)
            throw PosApiException.conflict("Stored Square operational scope is unavailable.");
        var scope = switch (PosScope.Type.valueOf(intent.scopeType())) {
            case BUSINESS_OFFICE -> PosScope.businessOffice(intent.scopeUnitId(), intent.scopeBusinessId());
            case UNIT_HEADQUARTERS -> PosScope.unitHeadquarters(intent.scopeUnitId());
            case CORPORATE_OFFICE -> PosScope.corporateOffice();
        };
        return new PosContext(intent.createdByUserId(), intent.companyId(), intents.userName(intent.createdByUserId()),
            intent.createdByRole(), true, scope);
    }
    PosCheckoutRequest request(SquareRecords.PaymentIntent intent) {
        try {
            var request = mapper.readValue(intent.checkoutRequestJson(), SquareTerminalDtos.CreatePaymentRequest.class);
            return new PosCheckoutRequest(request.cashRegisterId(), request.customerId(), request.preticketId(),
                request.restaurantOrderId(), request.currencyCode(), request.items(),
                List.of(new PosCheckoutPaymentRequest("CARD", null, intent.amount(), "Square " + intent.squarePaymentId())), request.notes());
        } catch (Exception invalid) {
            throw PosApiException.conflict("Stored Square checkout payload is invalid.");
        }
    }
}
