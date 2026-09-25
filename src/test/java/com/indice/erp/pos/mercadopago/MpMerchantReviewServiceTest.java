package com.indice.erp.pos.mercadopago;
import com.indice.erp.pos.PosApiException;
import java.util.Optional;
import java.util.function.Function;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
class MpMerchantReviewServiceTest {
    private final MpIntentReader reader = mock(MpIntentReader.class);
    private final MpMerchantTokens tokens = mock(MpMerchantTokens.class);
    private final MpPointGateway gateway = mock(MpPointGateway.class);
    private final MpOrderVerifier verifier = MpPaymentTestFixtures.verifier();
    private final MpActionRequiredRecovery action = new MpActionRequiredRecovery(
        gateway, new MpOrderOwnership(), MpPaymentTestFixtures.JSON);
    private final MpEvidenceApplication application = mock(MpEvidenceApplication.class);
    private final MpMerchantReviewCompletion completion = mock(MpMerchantReviewCompletion.class);
    private final MpMerchantReviewService service = new MpMerchantReviewService(reader, tokens,
        gateway, verifier, action, application, completion);
    @Test void suppliedOrderIsAuthenticatedVerifiedAndAuditedBeforeResolution() {
        var intent = reviewedIntent(); var order = MpPaymentTestFixtures.order();
        var request = new MpMerchantReviewRequest("ORDtest", "provider order located", 4L);
        when(reader.find(intent.context(), 17)).thenReturn(Optional.of(intent));
        when(tokens.withCompanyToken(eq(42L), any())).thenAnswer(call ->
            ((Function<String, ?>) call.getArgument(1)).apply("token"));
        when(gateway.getOrder("token", "ORDtest")).thenReturn(order);
        when(application.applyReview(eq(intent), any(), any(), anyString())).thenReturn(true);
        service.review(intent.context(), 17, request);
        verify(application).applyReview(eq(intent), any(), eq(MpAuditActor.user(11)),
            eq("provider order located"));
    }
    @Test void staleReviewVersionNeverContactsProvider() {
        var intent = reviewedIntent(); when(reader.find(intent.context(), 17)).thenReturn(Optional.of(intent));
        assertThrows(PosApiException.class, () -> service.review(intent.context(), 17,
            new MpMerchantReviewRequest("ORDtest", "provider order located", 3L)));
        verifyNoInteractions(tokens, gateway);
    }
    @Test void paddingCannotSatisfyReviewReasonMinimum() {
        var intent = reviewedIntent(); when(reader.find(intent.context(), 17)).thenReturn(Optional.of(intent));
        assertThrows(PosApiException.class, () -> service.review(intent.context(), 17,
            new MpMerchantReviewRequest("ORDtest", "a       ", 4L)));
        verifyNoInteractions(tokens, gateway);
    }
    private MpIntent reviewedIntent() { var missing = MpPaymentTestFixtures.change(MpPaymentTestFixtures.intent(), "orderId", null);
        return MpPaymentTestFixtures.change(
            MpPaymentTestFixtures.change(missing, "status", "RECONCILIATION_REQUIRED"), "version", 4L);
    }
}
