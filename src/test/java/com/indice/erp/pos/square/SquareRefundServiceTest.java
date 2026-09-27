package com.indice.erp.pos.square;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import com.indice.erp.pos.*;
import com.indice.erp.pos.returns.PosReturnService.SquareCommand;
import java.math.BigDecimal;
import java.util.function.Function;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class SquareRefundServiceTest {
    final SquareConnectionTokenService tokens = mock(SquareConnectionTokenService.class);
    final SquareTerminalGateway gateway = mock(SquareTerminalGateway.class);
    final SquareRefundService service = new SquareRefundService(tokens, gateway);
    final PosContext context = new PosContext(1L, 2L, "Test", "admin", true, PosScope.corporateOffice());
    @BeforeEach @SuppressWarnings("unchecked") void setup() {
        when(tokens.withToken(eq(context), any())).thenAnswer(call ->
                ((Function<String, Object>) call.getArgument(1)).apply("synthetic-test-token"));
    }
    @Test void retryUsesTheSameProviderIdentityAndOriginalPayment() {
        var command = command(null);
        var pending = new SquareTerminalGateway.Refund("refund-test", "payment-original", "PENDING", new BigDecimal("12.34"), "MXN");
        when(gateway.refundPayment(anyString(), eq("stable-request-key"), eq("payment-original"), eq(command.amount()), eq("MXN"))).thenReturn(pending);
        assertThat(service.refundOrRecover(context, command).status()).isEqualTo("PENDING");
        service.refundOrRecover(context, command);
        verify(gateway, times(2)).refundPayment(anyString(), eq(command.requestKey()), eq(command.paymentId()), eq(command.amount()), eq(command.currency()));
    }
    @Test void knownRefundIsRetrievedNotIssuedAgain() {
        when(gateway.getRefund(anyString(), eq("refund-test"))).thenReturn(
                new SquareTerminalGateway.Refund("refund-test", "payment-original", "COMPLETED", new BigDecimal("12.34"), "MXN"));
        assertThat(service.refundOrRecover(context, command("refund-test")).status()).isEqualTo("COMPLETED");
        verify(gateway, never()).refundPayment(any(), any(), any(), any(), any());
    }
    @Test void mismatchedPaymentCurrencyOrAmountCannotConfirmARefund() {
        for (var response : java.util.List.of(
                new SquareTerminalGateway.Refund("refund-test", "other-payment", "COMPLETED", new BigDecimal("12.34"), "MXN"),
                new SquareTerminalGateway.Refund("refund-test", "payment-original", "COMPLETED", new BigDecimal("1"), "MXN"),
                new SquareTerminalGateway.Refund("refund-test", "payment-original", "COMPLETED", new BigDecimal("12.34"), "USD"))) {
            when(gateway.getRefund(anyString(), anyString())).thenReturn(response);
            assertThatThrownBy(() -> service.refundOrRecover(context, command("refund-test"))).isInstanceOf(PosApiException.class);
        }
    }
    @Test void networkUncertaintyStaysPendingAndDoesNotOfferAnotherPaymentMethod() {
        when(gateway.getRefund(anyString(), anyString())).thenThrow(new SquareGatewayException("Timeout", true, null));
        assertThatThrownBy(() -> service.refundOrRecover(context, command("refund-test")))
                .isInstanceOf(PosApiException.class).hasMessageContaining("misma solicitud");
    }
    private SquareCommand command(String refundId) {
        return new SquareCommand("payment-original", "stable-request-key", refundId, new BigDecimal("12.34"), "MXN");
    }
}
