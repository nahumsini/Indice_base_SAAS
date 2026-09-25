package com.indice.erp.pos.square;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import java.util.Objects;
import org.springframework.stereotype.Component;

@Component
class SquareDispatchAuthorization {
    private final SquareTerminalRepository terminals;
    private final SquareTerminalVerificationStore verification;
    private final SquareConnectionTokenService tokens;
    private final SquarePaymentEvidenceGateway evidence;
    SquareDispatchAuthorization(SquareTerminalRepository terminals, SquareTerminalVerificationStore verification,
            SquareConnectionTokenService tokens, SquarePaymentEvidenceGateway evidence) {
        this.terminals = terminals; this.verification = verification; this.tokens = tokens; this.evidence = evidence;
    }
    void require(PosContext context, SquareRecords.PaymentIntent intent) {
        var terminal = current(context, intent);
        var provider = verify(context, terminal, intent);
        if (!Objects.equals(terminal.deviceCodeId(), provider.path("id").asText())
                || !"PAIRED".equals(provider.path("status").asText())
                || !Objects.equals(terminal.squareLocationId(), provider.path("location_id").asText())
                || !"TERMINAL_API".equals(provider.path("product_type").asText())
                || !Objects.equals(terminal.deviceId(), provider.path("device_id").asText())) {
            verification.unavailable(context.companyId(), intent.terminalId());
            throw PosApiException.conflict("Square terminal provider verification failed.");
        }
        verification.verified(context.companyId(), terminal.id());
        var refreshed = current(context, intent);
        if (!terminal.equals(refreshed)) throw PosApiException.conflict("Square terminal binding changed before payment dispatch.");
    }
    private SquareRecords.Terminal current(PosContext context, SquareRecords.PaymentIntent intent) {
        var terminal = terminals.findById(context, intent.terminalId())
            .orElseThrow(() -> PosApiException.conflict("Square terminal is no longer available."));
        if (!"PAIRED".equals(terminal.status()) || terminal.assignedRegisterId() == null
                || terminal.assignedRegisterId() != intent.cashRegisterId()
                || !Objects.equals(terminal.squareLocationId(), intent.squareLocationId())
                || !Objects.equals(terminal.deviceId(), intent.squareDeviceId())) {
            throw PosApiException.conflict("Square terminal binding changed before payment dispatch.");
        }
        return terminal;
    }
    private com.fasterxml.jackson.databind.JsonNode verify(PosContext context, SquareRecords.Terminal terminal,
            SquareRecords.PaymentIntent intent) {
        try { return tokens.withToken(context, token -> evidence.device(token, terminal.deviceCodeId())); }
        catch (RuntimeException failure) { verification.unavailable(context.companyId(), intent.terminalId()); throw failure; }
    }
}
