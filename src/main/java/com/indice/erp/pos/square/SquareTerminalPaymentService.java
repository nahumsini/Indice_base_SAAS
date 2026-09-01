package com.indice.erp.pos.square;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import java.time.Clock;
import org.springframework.stereotype.Service;

@Service
public class SquareTerminalPaymentService {

    private final SquareTerminalProperties properties;
    private final SquareTerminalSecretProvider secrets;
    private final SquareConnectionTokenService tokenService;
    private final SquareTerminalGateway gateway;
    private final SquareTerminalRepository terminals;
    private final SquarePaymentIntentRepository intents;
    private final SquareCheckoutStatusMapper statusMapper;
    private final SquarePaymentFinalizer finalizer;
    private final SquarePaymentRequestPreparer preparer;
    private final SquareAuditService audit;
    private final Clock clock;

    public SquareTerminalPaymentService(SquareTerminalProperties properties, SquareTerminalSecretProvider secrets,
            SquareConnectionTokenService tokenService, SquareTerminalGateway gateway, SquareTerminalRepository terminals,
            SquarePaymentIntentRepository intents, SquareCheckoutStatusMapper statusMapper,
            SquarePaymentFinalizer finalizer, SquarePaymentRequestPreparer preparer, SquareAuditService audit,
            Clock clock) {
        this.properties = properties; this.secrets = secrets; this.tokenService = tokenService; this.gateway = gateway;
        this.terminals = terminals; this.intents = intents; this.statusMapper = statusMapper;
        this.finalizer = finalizer; this.preparer = preparer; this.audit = audit; this.clock = clock;
    }

    public SquareTerminalDtos.PaymentIntentResponse create(
            PosContext context, SquareTerminalDtos.CreatePaymentRequest request) {
        secrets.requireEnabled();
        var draft = preparer.prepare(context, request);
        var terminal = terminals.findAssigned(context, request.cashRegisterId())
            .orElseThrow(() -> PosApiException.badRequest("No Square terminal is assigned to this register."));
        requirePaired(terminal);
        var existing = existingRecoverable(context, request.cashRegisterId(), draft.shift().id(), draft.payloadHash());
        if (existing != null) return existing;
        var intent = intents.createOrFind(context, request.cashRegisterId(), draft.shift().id(), terminal,
            draft.idempotencyKey(), draft.amount(), draft.currencyCode(), draft.payloadHash(), draft.checkoutJson(),
            clock.instant().plusSeconds(properties.getPaymentTimeoutSeconds()));
        if (!intent.checkoutPayloadSha256().equals(draft.payloadHash())) {
            throw PosApiException.conflict("Square idempotency key was reused for a different sale.");
        }
        if (intent.squareCheckoutId() != null || intent.status() != SquareTerminalPaymentStatus.WAITING) {
            return status(context, intent.id());
        }
        return sendToSquare(context, intent);
    }

    private SquareTerminalDtos.PaymentIntentResponse existingRecoverable(
            PosContext context, long registerId, long shiftId, String payloadHash) {
        var existing = intents.listRecoverable(context, registerId, shiftId, 10);
        for (var intent : existing) {
            if (!intent.checkoutPayloadSha256().equals(payloadHash)) {
                throw PosApiException.conflict(
                    "Recover or cancel the pending Square Terminal payment before charging another ticket.");
            }
            return intent.squareCheckoutId() == null ? sendToSquare(context, intent) : recover(context, intent.id());
        }
        return null;
    }

    public SquareTerminalDtos.PaymentIntentResponse status(PosContext context, long intentId) {
        var intent = intents.findById(context, intentId)
            .orElseThrow(() -> PosApiException.notFound("Square payment intent was not found."));
        return finalizer.response(intent, null);
    }

    public SquareTerminalDtos.PaymentIntentListResponse recoverable(
            PosContext context, Long registerId, Long shiftId, int limit) {
        var items = intents.listRecoverable(context, registerId, shiftId, limit).stream()
            .map(intent -> finalizer.response(intent, null)).toList();
        return new SquareTerminalDtos.PaymentIntentListResponse(items);
    }

    public SquareTerminalDtos.PaymentIntentResponse recover(PosContext context, long intentId) {
        var intent = intents.findById(context, intentId)
            .orElseThrow(() -> PosApiException.notFound("Square payment intent was not found."));
        if (intent.squareCheckoutId() == null) {
            return finalizer.response(intent, null);
        }
        recoverFromSquare(context, intent);
        return statusAfterGateway(context, intent.id());
    }

    public SquareTerminalDtos.PaymentIntentResponse cancel(PosContext context, long intentId) {
        var intent = intents.findById(context, intentId)
            .orElseThrow(() -> PosApiException.notFound("Square payment intent was not found."));
        if (intent.status() == SquareTerminalPaymentStatus.APPROVED || intent.posTicketId() != null) {
            throw PosApiException.conflict("Approved Square payment cannot be cancelled from POS.");
        }
        SquareRecords.GatewayStatus status;
        try {
            status = intent.squareCheckoutId() == null
                ? new SquareRecords.GatewayStatus(null, null, SquareTerminalPaymentStatus.CANCELLED, null, null,
                    "Square checkout was cancelled before sending.")
                : statusMapper.map(tokenService.withToken(context,
                    token -> gateway.cancelCheckout(token, intent.squareCheckoutId())));
        } catch (SquareGatewayException ex) {
            status = new SquareRecords.GatewayStatus(intent.squareCheckoutId(), null,
                SquareTerminalPaymentStatus.UNCERTAIN, null, "SQUARE_CANCEL", ex.getMessage());
        }
        intents.markGatewayStatus(intent.id(), status);
        audit.recordIntent(intent, "PAYMENT_CANCELLED", status.status().name(), status.failureMessage());
        return statusAfterGateway(context, intent.id());
    }

    public int reconcilePendingBatch(int limit) {
        if (!properties.isEnabled()) return 0;
        var candidates = intents.findRecoveryBatch(clock.instant().minusSeconds(30), limit);
        for (var intent : candidates) {
            if (intent.squareCheckoutId() == null) continue;
            try {
                recoverFromSquare(intent.companyId(), intent);
                statusAfterGateway(intent.companyId(), intent.id());
            } catch (RuntimeException ex) {
                intents.markGatewayStatus(intent.id(), new SquareRecords.GatewayStatus(
                    intent.squareCheckoutId(), null, SquareTerminalPaymentStatus.UNCERTAIN,
                    null, "SQUARE_RECONCILE", ex.getMessage()));
                audit.recordIntent(intent, "PAYMENT_RECONCILE_FAILED", "UNCERTAIN", ex.getMessage());
            }
        }
        return candidates.size();
    }

    private SquareTerminalDtos.PaymentIntentResponse sendToSquare(
            PosContext context, SquareRecords.PaymentIntent intent) {
        try {
            var checkout = tokenService.withToken(context, token -> gateway.createCheckout(token, new SquareTerminalGateway.CheckoutCommand(
                intent.idempotencyKey(), "INDICE-POS-" + intent.id(), intent.squareDeviceId(),
                intent.amount(), intent.currencyCode(), "Indice POS sale " + intent.id())));
            intents.markSquareCreated(intent.id(), checkout.id(), checkout.requestJson(), checkout.rawJson());
            intents.markGatewayStatus(intent.id(), statusMapper.map(checkout));
            audit.recordIntent(intent, "PAYMENT_REQUEST_SENT", "WAITING", "Square checkout created.");
        } catch (SquareGatewayException ex) {
            var status = ex.uncertain() ? SquareTerminalPaymentStatus.UNCERTAIN : SquareTerminalPaymentStatus.CANCELLED;
            intents.markGatewayStatus(intent.id(), new SquareRecords.GatewayStatus(
                null, null, status, null, "SQUARE_GATEWAY", ex.getMessage()));
            audit.recordIntent(intent, "PAYMENT_REQUEST_FAILED", status.name(), ex.getMessage());
        }
        return statusAfterGateway(context, intent.id());
    }

    private void recoverFromSquare(PosContext context, SquareRecords.PaymentIntent intent) {
        try {
            var checkout = tokenService.withToken(context,
                token -> gateway.getCheckout(token, intent.squareCheckoutId()));
            markRecovered(intent, checkout);
        } catch (SquareGatewayException ex) {
            markRecoveryFailed(intent, ex);
        }
    }

    private void recoverFromSquare(long companyId, SquareRecords.PaymentIntent intent) {
        try {
            var checkout = tokenService.withCompanyToken(companyId,
                token -> gateway.getCheckout(token, intent.squareCheckoutId()));
            markRecovered(intent, checkout);
        } catch (SquareGatewayException ex) {
            markRecoveryFailed(intent, ex);
        }
    }

    private void markRecovered(SquareRecords.PaymentIntent intent, SquareTerminalGateway.Checkout checkout) {
        var status = statusMapper.map(checkout);
        intents.markGatewayStatus(intent.id(), status);
        audit.recordIntent(intent, "PAYMENT_RECOVERED", status.status().name(), status.failureMessage());
    }

    private void markRecoveryFailed(SquareRecords.PaymentIntent intent, SquareGatewayException ex) {
        intents.markGatewayStatus(intent.id(), new SquareRecords.GatewayStatus(
            intent.squareCheckoutId(), null, SquareTerminalPaymentStatus.UNCERTAIN,
            null, "SQUARE_GATEWAY", ex.getMessage()));
        audit.recordIntent(intent, "PAYMENT_RECOVERY_FAILED", "UNCERTAIN", ex.getMessage());
    }

    private SquareTerminalDtos.PaymentIntentResponse statusAfterGateway(PosContext context, long intentId) {
        var fresh = intents.findById(context, intentId).orElseThrow();
        if (fresh.status() != SquareTerminalPaymentStatus.APPROVED || fresh.posTicketId() != null) {
            return finalizer.response(fresh, null);
        }
        try {
            return finalizer.finalizeIfApproved(context.companyId(), fresh.id());
        } catch (RuntimeException ex) {
            intents.markFinalizationFailed(fresh.id(), ex.getMessage());
            return finalizer.response(intents.findById(context, intentId).orElseThrow(), null);
        }
    }

    private SquareTerminalDtos.PaymentIntentResponse statusAfterGateway(long companyId, long intentId) {
        var fresh = intents.lockById(companyId, intentId).orElseThrow();
        if (fresh.status() != SquareTerminalPaymentStatus.APPROVED || fresh.posTicketId() != null) {
            return finalizer.response(fresh, null);
        }
        try {
            return finalizer.finalizeIfApproved(companyId, intentId);
        } catch (RuntimeException ex) {
            intents.markFinalizationFailed(intentId, ex.getMessage());
            return finalizer.response(intents.lockById(companyId, intentId).orElseThrow(), null);
        }
    }

    private void requirePaired(SquareRecords.Terminal terminal) {
        if (!"PAIRED".equalsIgnoreCase(terminal.status()) || terminal.deviceId() == null || terminal.deviceId().isBlank()) {
            throw PosApiException.badRequest("Assigned Square terminal is not paired.");
        }
    }
}
