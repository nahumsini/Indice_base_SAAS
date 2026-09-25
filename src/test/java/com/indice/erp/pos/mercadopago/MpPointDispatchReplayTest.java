package com.indice.erp.pos.mercadopago;
import java.util.function.Function;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MpPointDispatchReplayTest {
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final MpMerchantTokens tokens = mock(MpMerchantTokens.class);
    private final MpPointGateway gateway = mock(MpPointGateway.class);
    private final MpIntentReviewWriter review = mock(MpIntentReviewWriter.class);
    private final MpPaymentDispatchAdmission admission = mock(MpPaymentDispatchAdmission.class);
    private final MpPaymentDispatch service = new MpPaymentDispatch(new MpDispatchStore(jdbc), tokens,
        gateway, new MpIntentWriter(jdbc), review, new MpPaymentAudit(jdbc), admission, MpTestFixtures.CLOCK);
    private MpIntent undispatched() { return MpPaymentTestFixtures.change(MpPaymentTestFixtures.intent(), "orderId", null); }
    @BeforeEach void prepare() {
        when(jdbc.update(contains("dispatch_lease_until=?"), any(Object[].class))).thenReturn(1);
        when(jdbc.update(contains("order_id=COALESCE"), any(Object[].class))).thenReturn(1);
        when(tokens.connection(42)).thenReturn(MpTestFixtures.connection());
        when(tokens.withCompanyToken(eq(42L), any())).thenAnswer(call ->
            ((Function<String, ?>) call.getArgument(1)).apply("synthetic-token"));
    }
    @Test void lostCreationReplaysOriginalImmutableBodyAndSameKey() {
        var intent = undispatched();
        when(gateway.createOrder(anyString(), anyString(), anyString())).thenThrow(new IllegalStateException("lost response"))
            .thenReturn(MpPaymentTestFixtures.JSON.read("{\"id\":\"ORDcreated\"}", com.fasterxml.jackson.databind.JsonNode.class));
        service.send(intent); service.send(intent);
        verify(gateway, times(2)).createOrder("synthetic-token", intent.providerRequestJson(), intent.idempotencyKey());
        verify(jdbc).update(contains("status=CASE"), eq("Order submission is uncertain. Recover this payment before retrying."), eq(42L), eq(17L));
    }
    @Test void localOrderExpirationNeverConvertsUnknownPaymentIntoCancellation() {
        var intent = MpPaymentTestFixtures.change(undispatched(), "expiresAt", MpTestFixtures.NOW.minusSeconds(1));
        when(gateway.createOrder(anyString(), anyString(), anyString())).thenThrow(new IllegalStateException("lost response"));
        service.send(intent);
        verify(gateway).createOrder("synthetic-token", intent.providerRequestJson(), intent.idempotencyKey());
        verify(gateway, never()).cancelOrder(anyString(), anyString(), anyString());
    }
    @Test void replayBeyondTwentyHoursRequiresMerchantReviewWithoutAnotherPost() {
        service.send(MpPaymentTestFixtures.change(undispatched(), "createdAt", MpTestFixtures.NOW.minusSeconds(72001)));
        verifyNoInteractions(gateway, tokens);
        verify(review).requireReview(any(), contains("authenticated merchant review"));
    }
    @Test void refusedDispatchLeaseDoesNotContactProvider() {
        when(jdbc.update(contains("dispatch_lease_until=?"), any(Object[].class))).thenReturn(0);
        service.send(undispatched()); verifyNoInteractions(gateway, tokens);
    }
}
