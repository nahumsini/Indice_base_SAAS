package com.indice.erp.pos.mercadopago;
import com.indice.erp.pos.PosApiException;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
class MpRefundReviewServiceTest {
    private final MpIntentReader intents = mock(MpIntentReader.class);
    private final MpRefundRequestStore requests = mock(MpRefundRequestStore.class);
    private final MpRefundWorkClaims claims = mock(MpRefundWorkClaims.class);
    private final MpRefundProviderRecheck recheck = mock(MpRefundProviderRecheck.class);
    private final MpRefundReviewCompletion completion = mock(MpRefundReviewCompletion.class);
    private final MpRefundReviewService service = new MpRefundReviewService(intents, requests, claims,
        recheck, completion, MpTestFixtures.CLOCK);
    @Test void userRecheckOnlyRefreshesAuthenticatedProviderEvidence() {
        var intent = MpPaymentTestFixtures.intent(); var refund = MpRefundTestFixtures.record("UNCERTAIN");
        var reviewed = MpRefundTestFixtures.change(refund, "status", "RECONCILIATION_REQUIRED");
        var request = new MpRefundReviewRequest("provider evidence rechecked", 0L);
        var verified = new MpVerifiedOrder(null, null);
        when(intents.find(intent.context(), 17)).thenReturn(Optional.of(intent));
        when(requests.find(42, 19)).thenReturn(Optional.of(refund));
        when(claims.review(eq(refund), anyString(), any())).thenReturn(true);
        when(recheck.read(intent)).thenReturn(verified);
        when(completion.complete(eq(intent.context()), eq(intent), eq(refund), anyString(), eq(request), eq(verified)))
            .thenReturn(reviewed);
        assertSame(reviewed, service.recheck(intent.context(), 17, 19, request));
        verify(recheck).read(intent);
    }
    @Test void staleVersionCannotClaimOrContactProvider() {
        var intent = MpPaymentTestFixtures.intent(); var refund = MpRefundTestFixtures.record("DEAD_LETTER");
        when(intents.find(intent.context(), 17)).thenReturn(Optional.of(intent));
        when(requests.find(42, 19)).thenReturn(Optional.of(refund));
        assertThrows(PosApiException.class, () -> service.recheck(intent.context(), 17, 19,
            new MpRefundReviewRequest("provider evidence rechecked", 9L)));
        verifyNoInteractions(claims, recheck);
    }
}
