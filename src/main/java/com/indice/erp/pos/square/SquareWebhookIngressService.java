package com.indice.erp.pos.square;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

@Service
public class SquareWebhookIngressService {

    private final SquareTerminalProperties properties;
    private final SquareWebhookSignatureVerifier verifier;
    private final SquareWebhookEventRepository events;
    private final SquareConnectionRepository connections;
    private final SquareTerminalRepository terminals;
    private final SquarePaymentIntentRepository intents;
    private final SquareCheckoutStatusMapper statusMapper;
    private final SquarePaymentFinalizer finalizer;
    private final SquareAuditService audit;
    private final ObjectMapper objectMapper;

    public SquareWebhookIngressService(SquareTerminalProperties properties,
            SquareWebhookSignatureVerifier verifier, SquareWebhookEventRepository events,
            SquareConnectionRepository connections, SquareTerminalRepository terminals,
            SquarePaymentIntentRepository intents, SquareCheckoutStatusMapper statusMapper,
            SquarePaymentFinalizer finalizer, SquareAuditService audit, ObjectMapper objectMapper) {
        this.properties = properties; this.verifier = verifier; this.events = events;
        this.connections = connections; this.terminals = terminals; this.intents = intents;
        this.statusMapper = statusMapper; this.finalizer = finalizer; this.audit = audit;
        this.objectMapper = objectMapper;
    }

    public Response receive(String rawPayload, String signature, String environmentHeader) {
        verifier.verify(rawPayload, signature);
        var root = json(rawPayload);
        var eventId = required(text(root, "event_id"), "Square event id is missing.");
        var eventType = required(text(root, "type"), "Square event type is missing.");
        var environment = environment(environmentHeader);
        var merchantId = text(root, "merchant_id");
        var objectId = objectId(root);
        var result = events.ingest(new SquareWebhookEventRepository.SquareWebhookEnvelope(
            eventId, eventType, environment, merchantId, objectId, SquareHashing.sha256(rawPayload), rawPayload));
        if (result.duplicate()) return new Response(eventId, true, true, "duplicate");
        var companyId = merchantId == null ? null
            : connections.findCompanyIdByMerchant(environment, merchantId).orElse(null);
        if (companyId == null) {
            events.markIgnored(result.id(), null, "Square merchant is not connected to an Indice company.");
            return new Response(eventId, false, true, "ignored");
        }
        process(result.id(), companyId, eventType, root);
        return new Response(eventId, false, true, "processed");
    }

    private void process(long eventRowId, long companyId, String eventType, JsonNode root) {
        try {
            if ("device.code.paired".equals(eventType)) {
                processDevicePaired(eventRowId, companyId, root);
            } else if (eventType.startsWith("terminal.checkout.")) {
                processCheckout(eventRowId, companyId, root);
            } else {
                events.markIgnored(eventRowId, companyId, "Square event type is not used by POS.");
            }
        } catch (RuntimeException exception) {
            events.markFailed(eventRowId, companyId, exception.getMessage());
        }
    }

    private void processDevicePaired(long eventRowId, long companyId, JsonNode root) {
        var code = root.path("data").path("object").path("device_code");
        var codeId = required(text(code, "id"), "Square device code id is missing.");
        var deviceId = required(text(code, "device_id"), "Square device id is missing.");
        terminals.markPaired(companyId, codeId, deviceId);
        var terminal = terminals.findByDeviceCode(companyId, codeId).orElse(null);
        if (terminal != null) {
            audit.recordTerminal(nullContext(companyId), terminal.id(), "TERMINAL_PAIRED", "OK",
                "Square Terminal paired.");
        }
        events.markProcessed(eventRowId, companyId, null, terminal == null ? null : terminal.id());
    }

    private void processCheckout(long eventRowId, long companyId, JsonNode root) {
        var checkout = root.path("data").path("object").path("checkout");
        var checkoutId = required(text(checkout, "id"), "Square checkout id is missing.");
        var intent = intents.findByCheckout(companyId, checkoutId)
            .orElseThrow(() -> new IllegalArgumentException("Square checkout is not linked to a POS intent."));
        var gatewayStatus = statusMapper.map(checkout(checkout, root.toString()));
        intents.markGatewayStatus(intent.id(), gatewayStatus);
        audit.recordIntent(intent, "PAYMENT_WEBHOOK", gatewayStatus.status().name(), gatewayStatus.failureMessage());
        var fresh = intents.findByCheckout(companyId, checkoutId).orElseThrow();
        if (fresh.status() == SquareTerminalPaymentStatus.APPROVED && fresh.posTicketId() == null) {
            try {
                finalizer.finalizeIfApproved(companyId, fresh.id());
            } catch (RuntimeException ex) {
                intents.markFinalizationFailed(fresh.id(), ex.getMessage());
                audit.recordIntent(fresh, "PAYMENT_FINALIZE_FAILED", "UNCERTAIN", ex.getMessage());
            }
        }
        events.markProcessed(eventRowId, companyId, fresh.id(), fresh.terminalId());
    }

    private com.indice.erp.pos.PosContext nullContext(long companyId) {
        return new com.indice.erp.pos.PosContext(null, companyId, "Square webhook", "system", true,
            com.indice.erp.pos.PosScope.corporateOffice());
    }

    private SquareTerminalGateway.Checkout checkout(JsonNode node, String rawJson) {
        var payment = node.path("payment_ids").isArray() && !node.path("payment_ids").isEmpty()
            ? node.path("payment_ids").get(0).asText() : null;
        return new SquareTerminalGateway.Checkout(
            text(node, "id"), text(node, "status"), payment, text(node, "cancel_reason"), rawJson, null);
    }

    private String objectId(JsonNode root) {
        var data = root.path("data");
        var checkoutId = text(data.path("object").path("checkout"), "id");
        if (checkoutId != null) return checkoutId;
        var codeId = text(data.path("object").path("device_code"), "id");
        return codeId == null ? text(data, "id") : codeId;
    }

    private JsonNode json(String payload) {
        try { return objectMapper.readTree(payload); }
        catch (Exception ex) { throw new IllegalArgumentException("Square webhook payload is not valid JSON."); }
    }

    private String environment(String header) {
        if ("Production".equalsIgnoreCase(header)) return "production";
        if ("Sandbox".equalsIgnoreCase(header)) return "sandbox";
        return properties.getEnvironment();
    }

    private String required(String value, String message) {
        if (value == null || value.isBlank()) throw new IllegalArgumentException(message);
        return value;
    }

    private String text(JsonNode node, String field) {
        var value = node.path(field);
        return value.isTextual() && !value.asText().isBlank() ? value.asText() : null;
    }

    public record Response(String eventId, boolean duplicate, boolean durablyStored, String status) {
    }
}
