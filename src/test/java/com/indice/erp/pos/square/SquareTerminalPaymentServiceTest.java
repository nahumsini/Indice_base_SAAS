package com.indice.erp.pos.square;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import com.indice.erp.pos.shift.ShiftRecord;
import com.indice.erp.pos.status.ShiftStatus;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.function.Function;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SquareTerminalPaymentServiceTest {

    @Mock private SquareTerminalSecretProvider secrets;
    @Mock private SquareConnectionTokenService tokenService;
    @Mock private SquareTerminalGateway gateway;
    @Mock private SquareTerminalRepository terminals;
    @Mock private SquarePaymentIntentRepository intents;
    @Mock private SquarePaymentFinalizer finalizer;
    @Mock private SquarePaymentRequestPreparer preparer;
    @Mock private SquareAuditService audit;

    private SquareTerminalPaymentService service;

    @BeforeEach
    void setUp() {
        var properties = new SquareTerminalProperties();
        properties.setPaymentTimeoutSeconds(300);
        service = new SquareTerminalPaymentService(properties, secrets, tokenService, gateway, terminals, intents,
            new SquareCheckoutStatusMapper(), finalizer, preparer, audit,
            Clock.fixed(Instant.parse("2026-08-28T20:00:00Z"), ZoneOffset.UTC));
    }

    @Test
    void rejectsIdempotencyKeyReuseForDifferentPayload() {
        given(preparer.prepare(context(), request())).willReturn(draft("hash-a"));
        given(terminals.findAssigned(context(), 31L)).willReturn(Optional.of(terminal()));
        given(intents.createOrFind(context(), 31L, 41L, terminal(), "key-1", amount(), "CAD",
            "hash-a", "{}", Instant.parse("2026-08-28T20:05:00Z"))).willReturn(intent("hash-b"));

        assertThatThrownBy(() -> service.create(context(), request()))
            .isInstanceOf(PosApiException.class)
            .hasMessageContaining("idempotency key was reused");

        verify(gateway, never()).createCheckout(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void reusesRecoverableIntentForSamePayloadBeforeCreatingAnotherCheckout() {
        given(preparer.prepare(context(), request())).willReturn(draft("hash-a"));
        given(terminals.findAssigned(context(), 31L)).willReturn(Optional.of(terminal()));
        given(intents.listRecoverable(context(), 31L, 41L, 10))
            .willReturn(List.of(intent("hash-a", "old-key")));
        given(tokenService.withToken(org.mockito.ArgumentMatchers.eq(context()), org.mockito.ArgumentMatchers.any()))
            .willAnswer(invocation -> {
                Function<String, SquareTerminalGateway.Checkout> call = invocation.getArgument(1);
                return call.apply("access-token");
            });
        given(gateway.createCheckout(org.mockito.ArgumentMatchers.eq("access-token"),
            org.mockito.ArgumentMatchers.any())).willReturn(
                new SquareTerminalGateway.Checkout("co-1", "PENDING", null, null, "{}", "{}"));
        given(intents.findById(context(), 91L)).willReturn(Optional.of(waitingSentIntent()));
        given(finalizer.response(waitingSentIntent(), null)).willReturn(response("waiting"));

        var response = service.create(context(), request());

        var command = ArgumentCaptor.forClass(SquareTerminalGateway.CheckoutCommand.class);
        verify(gateway).createCheckout(org.mockito.ArgumentMatchers.eq("access-token"), command.capture());
        assertThat(command.getValue().idempotencyKey()).isEqualTo("old-key");
        assertThat(response.status()).isEqualTo("waiting");
    }

    @Test
    void blocksAnotherSquareCheckoutWhenDifferentPendingPaymentExistsForTheShift() {
        given(preparer.prepare(context(), request())).willReturn(draft("hash-a"));
        given(terminals.findAssigned(context(), 31L)).willReturn(Optional.of(terminal()));
        given(intents.listRecoverable(context(), 31L, 41L, 10))
            .willReturn(List.of(intent("hash-other", "old-key")));

        assertThatThrownBy(() -> service.create(context(), request()))
            .isInstanceOf(PosApiException.class)
            .hasMessageContaining("Recover or cancel the pending Square Terminal payment");

        verify(gateway, never()).createCheckout(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void approvedSquareCheckoutIsFinalizedByTheBackend() {
        given(preparer.prepare(context(), request())).willReturn(draft("hash-a"));
        given(terminals.findAssigned(context(), 31L)).willReturn(Optional.of(terminal()));
        given(intents.createOrFind(context(), 31L, 41L, terminal(), "key-1", amount(), "CAD",
            "hash-a", "{}", Instant.parse("2026-08-28T20:05:00Z"))).willReturn(intent("hash-a"));
        given(tokenService.withToken(org.mockito.ArgumentMatchers.eq(context()), org.mockito.ArgumentMatchers.any()))
            .willAnswer(invocation -> {
                Function<String, SquareTerminalGateway.Checkout> call = invocation.getArgument(1);
                return call.apply("access-token");
            });
        given(gateway.createCheckout(org.mockito.ArgumentMatchers.eq("access-token"),
            org.mockito.ArgumentMatchers.any())).willReturn(
                new SquareTerminalGateway.Checkout("co-1", "COMPLETED", "pay-1", null, "{}", "{}"));
        given(intents.findById(context(), 91L)).willReturn(Optional.of(approvedIntent()));
        given(finalizer.finalizeIfApproved(7L, 91L)).willReturn(response("approved"));

        service.create(context(), request());

        verify(finalizer).finalizeIfApproved(7L, 91L);
    }

    @Test
    void gatewayUncertaintyKeepsIntentRecoverableWithoutCompletingSale() {
        given(preparer.prepare(context(), request())).willReturn(draft("hash-a"));
        given(terminals.findAssigned(context(), 31L)).willReturn(Optional.of(terminal()));
        given(intents.createOrFind(context(), 31L, 41L, terminal(), "key-1", amount(), "CAD",
            "hash-a", "{}", Instant.parse("2026-08-28T20:05:00Z"))).willReturn(intent("hash-a"));
        given(tokenService.withToken(org.mockito.ArgumentMatchers.eq(context()), org.mockito.ArgumentMatchers.any()))
            .willAnswer(invocation -> {
                Function<String, SquareTerminalGateway.Checkout> call = invocation.getArgument(1);
                return call.apply("access-token");
            });
        given(gateway.createCheckout(org.mockito.ArgumentMatchers.eq("access-token"),
            org.mockito.ArgumentMatchers.any())).willThrow(new SquareGatewayException("timeout", true, null));
        given(intents.findById(context(), 91L)).willReturn(Optional.of(uncertainIntent()));
        given(finalizer.response(uncertainIntent(), null)).willReturn(response("uncertain"));

        service.create(context(), request());

        var captor = ArgumentCaptor.forClass(SquareRecords.GatewayStatus.class);
        verify(intents).markGatewayStatus(org.mockito.ArgumentMatchers.eq(91L), captor.capture());
        assertThat(captor.getValue().status()).isEqualTo(SquareTerminalPaymentStatus.UNCERTAIN);
        verify(finalizer, never()).finalizeIfApproved(org.mockito.ArgumentMatchers.anyLong(),
            org.mockito.ArgumentMatchers.anyLong());
    }

    @Test
    void listsRecoverablePaymentsForTheCurrentRegisterAndShift() {
        given(intents.listRecoverable(context(), 31L, 41L, 5)).willReturn(List.of(uncertainIntent()));
        given(finalizer.response(uncertainIntent(), null)).willReturn(response("uncertain"));

        var response = service.recoverable(context(), 31L, 41L, 5);

        assertThat(response.items()).hasSize(1);
        assertThat(response.items().getFirst().status()).isEqualTo("uncertain");
        verify(intents).listRecoverable(context(), 31L, 41L, 5);
    }

    @Test
    void explicitRecoveryChecksSquareAndFinalizesApprovedCheckout() {
        given(intents.findById(context(), 91L))
            .willReturn(Optional.of(waitingSentIntent()), Optional.of(approvedIntent()));
        given(tokenService.withToken(org.mockito.ArgumentMatchers.eq(context()), org.mockito.ArgumentMatchers.any()))
            .willAnswer(invocation -> {
                Function<String, SquareTerminalGateway.Checkout> call = invocation.getArgument(1);
                return call.apply("access-token");
            });
        given(gateway.getCheckout("access-token", "co-1")).willReturn(
            new SquareTerminalGateway.Checkout("co-1", "COMPLETED", "pay-1", null, "{}", "{}"));
        given(finalizer.finalizeIfApproved(7L, 91L)).willReturn(response("approved"));

        var response = service.recover(context(), 91L);

        assertThat(response.status()).isEqualTo("approved");
        verify(gateway).getCheckout("access-token", "co-1");
        verify(finalizer).finalizeIfApproved(7L, 91L);
    }

    private PosContext context() {
        return new PosContext(11L, 7L, "Cashier", "admin", true, PosScope.corporateOffice());
    }

    private SquareTerminalDtos.CreatePaymentRequest request() {
        return new SquareTerminalDtos.CreatePaymentRequest("key-1", 31L, null, null, null, "CAD",
            List.of(new com.indice.erp.pos.checkout.dto.PosCheckoutItemRequest(
                77L, "Test Product", "SKU-77", "Product", BigDecimal.ONE, amount(), BigDecimal.ZERO, BigDecimal.ZERO)),
            null);
    }

    private SquarePaymentRequestPreparer.Draft draft(String hash) {
        return new SquarePaymentRequestPreparer.Draft(shift(), "{}", hash, amount(), "CAD", "key-1");
    }

    private ShiftRecord shift() {
        return new ShiftRecord(41L, 7L, 1L, 2L, 3L, 31L, "Register", 11L, null, ShiftStatus.OPEN,
            BigDecimal.ZERO, BigDecimal.ZERO, null, null, "CAD", Instant.now(), null, null, null,
            11L, null, Instant.now(), Instant.now(), 0L, null, null);
    }

    private SquareRecords.Terminal terminal() {
        return new SquareRecords.Terminal(51L, 7L, 61L, "loc-1", "code-1", "device-1", "Front", "PAIRED", 31L);
    }

    private SquareRecords.PaymentIntent intent(String hash) {
        return intent(hash, "key-1");
    }

    private SquareRecords.PaymentIntent intent(String hash, String idempotencyKey) {
        return new SquareRecords.PaymentIntent(91L, 7L, 31L, 41L, 51L, "loc-1", "device-1",
            idempotencyKey, null, null, SquareTerminalPaymentStatus.WAITING, amount(), "CAD", hash, "{}",
            null, null, 11L, "admin", "CORPORATE_OFFICE", null, null,
            Instant.parse("2026-08-28T20:00:00Z"), Instant.parse("2026-08-28T20:00:00Z"),
            Instant.parse("2026-08-28T20:05:00Z"));
    }

    private SquareRecords.PaymentIntent approvedIntent() {
        return new SquareRecords.PaymentIntent(91L, 7L, 31L, 41L, 51L, "loc-1", "device-1",
            "key-1", "co-1", "pay-1", SquareTerminalPaymentStatus.APPROVED, amount(), "CAD", "hash-a",
            "{}", null, null, 11L, "admin", "CORPORATE_OFFICE", null, null,
            Instant.parse("2026-08-28T20:00:00Z"), Instant.parse("2026-08-28T20:00:00Z"),
            Instant.parse("2026-08-28T20:05:00Z"));
    }

    private SquareRecords.PaymentIntent waitingSentIntent() {
        return new SquareRecords.PaymentIntent(91L, 7L, 31L, 41L, 51L, "loc-1", "device-1",
            "key-1", "co-1", null, SquareTerminalPaymentStatus.WAITING, amount(), "CAD", "hash-a",
            "{}", null, null, 11L, "admin", "CORPORATE_OFFICE", null, null,
            Instant.parse("2026-08-28T20:00:00Z"), Instant.parse("2026-08-28T20:00:00Z"),
            Instant.parse("2026-08-28T20:05:00Z"));
    }

    private SquareRecords.PaymentIntent uncertainIntent() {
        return new SquareRecords.PaymentIntent(91L, 7L, 31L, 41L, 51L, "loc-1", "device-1",
            "key-1", null, null, SquareTerminalPaymentStatus.UNCERTAIN, amount(), "CAD", "hash-a",
            "{}", "timeout", null, 11L, "admin", "CORPORATE_OFFICE", null, null,
            Instant.parse("2026-08-28T20:00:00Z"), Instant.parse("2026-08-28T20:00:00Z"),
            Instant.parse("2026-08-28T20:05:00Z"));
    }

    private SquareTerminalDtos.PaymentIntentResponse response(String status) {
        return new SquareTerminalDtos.PaymentIntentResponse(91L, status, amount(), "CAD", null, null, null, null, null);
    }

    private BigDecimal amount() { return new BigDecimal("10.50"); }
}
