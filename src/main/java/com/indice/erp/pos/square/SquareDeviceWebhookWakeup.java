package com.indice.erp.pos.square;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import org.springframework.stereotype.Component;

@Component
class SquareDeviceWebhookWakeup {
    private final SquareSetupDependencies d;
    private final SquarePaymentEvidenceGateway gateway;
    private final SquareWebhookEventRepository events;
    SquareDeviceWebhookWakeup(SquareSetupDependencies dependencies, SquarePaymentEvidenceGateway gateway, SquareWebhookEventRepository events) {
        this.d = dependencies;
        this.gateway = gateway;
        this.events = events;
    }
    void process(long eventId, SquareWebhookEventClaims.Lease lease, long companyId, String codeId) {
        var terminal = d.terminals().findByDeviceCode(companyId, codeId).orElseThrow();
        var code = d.tokens().withCompanyToken(companyId, token -> gateway.device(token, codeId));
        if (!codeId.equals(code.path("id").asText()) || !"PAIRED".equals(code.path("status").asText())
                || !terminal.squareLocationId().equals(code.path("location_id").asText())
                || !"TERMINAL_API".equals(code.path("product_type").asText()) || code.path("device_id").asText().isBlank())
            throw new IllegalStateException("Square pairing verification failed.");
        d.pairingPersistence().paired(companyId, codeId, code.path("device_id").asText());
        d.audit().recordTerminal(new PosContext(null, companyId, "Square webhook", "system", true, PosScope.corporateOffice()),
            terminal.id(), "TERMINAL_PAIRED", "OK", "Square Terminal pairing verified.");
        events.markProcessed(eventId, lease, companyId, null, terminal.id());
    }
}
