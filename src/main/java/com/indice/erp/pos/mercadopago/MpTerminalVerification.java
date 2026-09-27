package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MpTerminalVerification {
    private final MpTerminalStore terminals;
    private final MpTerminalVerificationLeaseStore leases;
    private final MpMerchantTokens tokens;
    private final MpMerchantGateway gateway;
    private final MpTerminalSynchronizationStore synchronization;
    public MpTerminalVerificationProof verify(PosContext context, long registerId) {
        var initial = terminals.requireBinding(context, registerId);
        try { return MpTerminalEligibility.requireReady(initial, registerId); }
        catch (PosApiException ignored) { }
        var claim = leases.claim(context, initial);
        if (!claim.ownsLease()) return MpTerminalEligibility.requireReady(claim.terminal(), registerId);
        try {
            var connection = tokens.connection(context.companyId());
            if (connection.id() != initial.connectionId()) throw PosApiException.conflict("Point terminal connection changed.");
            var response = tokens.withToken(context, gateway::terminals);
            synchronization.complete(connection, response);
        } catch (RuntimeException failure) {
            leases.failed(claim);
            throw PosApiException.serviceUnavailable("Point terminal verification is temporarily unavailable.");
        }
        leases.complete(claim);
        return MpTerminalEligibility.requireReady(terminals.requireBinding(context, registerId), registerId);
    }
}
