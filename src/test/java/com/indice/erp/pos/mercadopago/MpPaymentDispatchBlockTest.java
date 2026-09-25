package com.indice.erp.pos.mercadopago;
import com.indice.erp.pos.PosApiException;
import java.util.function.Function;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
class MpPaymentDispatchBlockTest {
    @Test void changedEligibilityImmediatelyBeforeCreateNeverContactsOrderEndpoint() {
        var jdbc = mock(JdbcTemplate.class); var tokens = mock(MpMerchantTokens.class);
        var gateway = mock(MpPointGateway.class); var admission = mock(MpPaymentDispatchAdmission.class);
        var intent = MpPaymentTestFixtures.change(MpPaymentTestFixtures.intent(), "orderId", null);
        when(jdbc.update(contains("dispatch_lease_until=?"), any(Object[].class))).thenReturn(1);
        when(tokens.withCompanyToken(eq(42L), any())).thenAnswer(call ->
            ((Function<String, ?>) call.getArgument(1)).apply("token"));
        doThrow(PosApiException.conflict("suspended")).when(admission).require(eq(intent), anyString());
        var service = new MpPaymentDispatch(new MpDispatchStore(jdbc), tokens, gateway,
            new MpIntentWriter(jdbc), mock(MpIntentReviewWriter.class), new MpPaymentAudit(jdbc),
            admission, MpTestFixtures.CLOCK);
        service.send(intent, MpAuditActor.user(11));
        verifyNoInteractions(gateway);
        verify(jdbc).update(contains("SET message=?"),
            eq("Payment was not submitted because dispatch eligibility changed."), eq(42L), eq(17L));
        verify(jdbc, never()).update(contains("status=CASE"), any(Object[].class));
    }
    @Test void failedTerminalRefreshNeverContactsOrderEndpoint() {
        var jdbc = mock(JdbcTemplate.class); var tokens = mock(MpMerchantTokens.class);
        var gateway = mock(MpPointGateway.class); var lease = mock(MpDispatchStore.class);
        var verification = mock(MpTerminalVerification.class);
        var intent = MpPaymentTestFixtures.change(MpPaymentTestFixtures.intent(), "orderId", null);
        when(jdbc.update(contains("dispatch_lease_until=?"), any(Object[].class))).thenReturn(1);
        when(tokens.withCompanyToken(eq(42L), any())).thenAnswer(call ->
            ((Function<String, ?>) call.getArgument(1)).apply("token"));
        when(lease.owns(eq(intent), anyString())).thenReturn(true);
        doThrow(PosApiException.serviceUnavailable("provider unavailable"))
            .when(verification).verify(intent.context(), intent.cashRegisterId());
        var admission = new MpPaymentDispatchAdmission(lease, tokens,
            new MpLiveActivationPolicy(true), mock(MpTerminalStore.class), verification);
        var service = new MpPaymentDispatch(new MpDispatchStore(jdbc), tokens, gateway,
            new MpIntentWriter(jdbc), mock(MpIntentReviewWriter.class), new MpPaymentAudit(jdbc),
            admission, MpTestFixtures.CLOCK);
        service.send(intent, MpAuditActor.user(11));
        verifyNoInteractions(gateway);
    }
}
