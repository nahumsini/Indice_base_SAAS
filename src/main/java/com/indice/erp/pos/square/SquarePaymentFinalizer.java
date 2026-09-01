package com.indice.erp.pos.square;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import com.indice.erp.pos.checkout.CheckoutService;
import com.indice.erp.pos.checkout.dto.PosCheckoutPaymentRequest;
import com.indice.erp.pos.checkout.dto.PosCheckoutRequest;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SquarePaymentFinalizer {

    private final SquarePaymentIntentRepository intents;
    private final CheckoutService checkoutService;
    private final ObjectMapper objectMapper;

    public SquarePaymentFinalizer(
            SquarePaymentIntentRepository intents,
            CheckoutService checkoutService,
            ObjectMapper objectMapper) {
        this.intents = intents;
        this.checkoutService = checkoutService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public SquareTerminalDtos.PaymentIntentResponse finalizeIfApproved(long companyId, long intentId) {
        var intent = intents.lockById(companyId, intentId)
            .orElseThrow(() -> PosApiException.notFound("Square payment intent was not found."));
        if (intent.posTicketId() != null || intent.status() != SquareTerminalPaymentStatus.APPROVED) {
            return response(intent, null);
        }
        if (blank(intent.squarePaymentId()) == null) {
            return response(intent, null);
        }
        intents.incrementFinalizeAttempt(intent.id());
        var checkout = checkoutService.checkout(context(intent), checkoutRequest(intent));
        if (!intents.markFinalized(intent.id(), checkout.ticket().id())) {
            return response(intents.lockById(intent.companyId(), intent.id()).orElseThrow(), null);
        }
        return response(intent, checkout);
    }

    private PosContext context(SquareRecords.PaymentIntent intent) {
        return new PosContext(
            intent.createdByUserId(), intent.companyId(), intents.userName(intent.createdByUserId()),
            blank(intent.createdByRole()) == null ? "user" : intent.createdByRole(), true, scope(intent));
    }

    private PosScope scope(SquareRecords.PaymentIntent intent) {
        var type = intent.scopeType() == null ? PosScope.Type.CORPORATE_OFFICE
            : PosScope.Type.valueOf(intent.scopeType());
        return switch (type) {
            case BUSINESS_OFFICE -> PosScope.businessOffice(intent.scopeUnitId(), intent.scopeBusinessId());
            case UNIT_HEADQUARTERS -> PosScope.unitHeadquarters(intent.scopeUnitId());
            case CORPORATE_OFFICE -> PosScope.corporateOffice();
        };
    }

    private PosCheckoutRequest checkoutRequest(SquareRecords.PaymentIntent intent) {
        try {
            var request = objectMapper.readValue(
                intent.checkoutRequestJson(), SquareTerminalDtos.CreatePaymentRequest.class);
            return new PosCheckoutRequest(
                request.cashRegisterId(), request.customerId(), request.preticketId(),
                request.restaurantOrderId(), request.currencyCode(), request.items(),
                List.of(new PosCheckoutPaymentRequest(
                    "CARD", null, intent.amount(), "Square " + intent.squarePaymentId())),
                request.notes());
        } catch (Exception exception) {
            throw PosApiException.conflict("Stored Square checkout payload is invalid.");
        }
    }

    SquareTerminalDtos.PaymentIntentResponse response(
        SquareRecords.PaymentIntent intent,
        com.indice.erp.pos.checkout.dto.PosCheckoutResponse checkout) {
        return new SquareTerminalDtos.PaymentIntentResponse(
            intent.id(), intent.status().wireName(), intent.amount(), intent.currencyCode(),
            intent.squareCheckoutId(), intent.squarePaymentId(), intent.failureMessage(),
            checkout == null ? intent.posTicketId() : checkout.ticket().id(), checkout);
    }

    private String blank(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
