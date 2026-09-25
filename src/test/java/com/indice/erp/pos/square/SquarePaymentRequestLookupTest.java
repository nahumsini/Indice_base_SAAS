package com.indice.erp.pos.square;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class SquarePaymentRequestLookupTest {
    private final SquarePaymentIntentRepository intents = mock(SquarePaymentIntentRepository.class);
    private final SquarePaymentAccess access = mock(SquarePaymentAccess.class);
    private final SquarePaymentFinalizer finalizer = mock(SquarePaymentFinalizer.class);
    private final SquarePaymentRequestLookup lookup = new SquarePaymentRequestLookup(intents, access, finalizer);
    private final PosContext tenant = context(7L, PosScope.corporateOffice());
    @Test void returnsReceiptFromTenantScopedIntent() {
        var intent = SquarePaymentAccessFixtures.completed();
        var response = new SquareTerminalDtos.PaymentIntentResponse(91,"approved",null,"CAD",null,null,null,100L,null);
        when(intents.findByIdempotency(tenant, "indice-safe-key")).thenReturn(Optional.of(intent));
        when(finalizer.response(intent, null)).thenReturn(response);
        assertThat(lookup.find(tenant, "indice-safe-key")).isSameAs(response);
        verify(access).require(tenant, intent);
    }
    @Test void hidesOtherTenantAndOriginalScopeWithTheSameNotFoundResult() {
        var otherTenant = context(8L, PosScope.corporateOffice());
        var scoped = context(7L, PosScope.businessOffice(5L, 99L));
        var intent = SquarePaymentAccessFixtures.completed();
        when(intents.findByIdempotency(otherTenant, "indice-safe-key")).thenReturn(Optional.empty());
        when(intents.findByIdempotency(scoped, "indice-safe-key")).thenReturn(Optional.of(intent));
        doThrow(PosApiException.notFound("Square payment intent was not found.")).when(access).require(scoped, intent);
        assertHidden(otherTenant);
        assertHidden(scoped);
    }
    @Test void rejectsUnsafeKeysBeforeQuerying() {
        assertThatThrownBy(() -> lookup.find(tenant, "../../unsafe"))
            .isInstanceOfSatisfying(PosApiException.class, ex -> assertThat(ex.status()).isEqualTo(HttpStatus.BAD_REQUEST));
        verifyNoInteractions(intents);
    }
    private void assertHidden(PosContext context) {
        assertThatThrownBy(() -> lookup.find(context, "indice-safe-key"))
            .isInstanceOfSatisfying(PosApiException.class, ex -> assertThat(ex.status()).isEqualTo(HttpStatus.NOT_FOUND))
            .hasMessage("Square payment intent was not found.");
    }
    private static PosContext context(long company, PosScope scope) {
        return new PosContext(11L, company, "User", "cashier", false, scope);
    }
}
