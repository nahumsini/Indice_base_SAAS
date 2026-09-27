package com.indice.erp.pos.square;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.*;

final class SquareWebhookIngressFixture {
    final SquareWebhookSignatureVerifier verifier=mock(SquareWebhookSignatureVerifier.class);
    final SquareWebhookEventRepository events=mock(SquareWebhookEventRepository.class);
    final SquareWebhookEventClaims claims=mock(SquareWebhookEventClaims.class);
    final SquareMerchantOwnership ownership=mock(SquareMerchantOwnership.class);
    final SquareConnectionTokenService tokens=mock(SquareConnectionTokenService.class);
    final SquareTerminalGateway gateway=mock(SquareTerminalGateway.class);
    final SquarePaymentIntentRepository intents=mock(SquarePaymentIntentRepository.class);
    final SquarePaymentFinalizer finalizer=mock(SquarePaymentFinalizer.class);
    final SquareVerifiedPaymentStatus evidence=mock(SquareVerifiedPaymentStatus.class);
    final SquareWebhookIngressService service;
    SquareWebhookIngressFixture() {
        var properties=new SquareTerminalProperties(); var mapper=new ObjectMapper();
        var d=new SquarePaymentDependencies(properties,mock(SquareTerminalSecretProvider.class),tokens,gateway,
            mock(SquareTerminalRepository.class),intents,new SquareCheckoutStatusMapper(),finalizer,
            mock(SquarePaymentRequestPreparer.class),mock(SquareAuditService.class),Clock.systemUTC(),evidence,
            mock(SquarePaymentMerchantGuard.class));
        var responses=new SquarePaymentResponses(d,mock(SquarePaymentAccess.class));
        var checkouts=new SquareCheckoutWebhookWakeup(d,responses,new SquareCheckoutIdentityPolicy(),events,mapper);
        var refunds=new SquareRefundWebhookWakeup(null,null,null,null);
        var processor=new SquareWebhookProcessor(ownership,checkouts,mock(SquareDeviceWebhookWakeup.class),refunds,events);
        service=new SquareWebhookIngressService(verifier,new SquareWebhookPayloadParser(mapper,properties),events,claims,processor);
    }
    void checkout() {
        when(tokens.withCompanyToken(eq(7L),any())).thenAnswer(call ->
            ((java.util.function.Function<String,?>)call.getArgument(1)).apply("token"));
        var checkout=new SquareTerminalGateway.Checkout("co-1","COMPLETED","pay-1",null,
            "{\"checkout\":{\"id\":\"co-1\",\"status\":\"COMPLETED\",\"reference_id\":\"INDICE-POS-91\",\"amount_money\":{\"amount\":1050,\"currency\":\"CAD\"},\"device_options\":{\"device_id\":\"device-1\"},\"payment_ids\":[\"pay-1\"]}}",null);
        when(gateway.getCheckout("token","co-1")).thenReturn(checkout);
        when(evidence.verify(isNull(),any(),eq(checkout))).thenReturn(new SquareCheckoutStatusMapper().map(checkout));
    }
    String payload() { return "{\"event_id\":\"event-1\",\"type\":\"terminal.checkout.updated\",\"merchant_id\":\"merchant-1\",\"data\":{\"object\":{\"checkout\":{\"id\":\"co-1\"}}}}"; }
    SquareWebhookEventClaims.Lease lease() { return new SquareWebhookEventClaims.Lease("lease"); }
    SquareRecords.PaymentIntent intent(SquareTerminalPaymentStatus status,Long ticket) { return new SquareRecords.PaymentIntent(91,7,31,41,51,
        "loc-1","device-1","key","co-1","pay-1",status,new BigDecimal("10.50"),"CAD","hash","{}",null,ticket,
        11,"admin","CORPORATE_OFFICE",null,null,Instant.now(),Instant.now(),Instant.now()); }
}
