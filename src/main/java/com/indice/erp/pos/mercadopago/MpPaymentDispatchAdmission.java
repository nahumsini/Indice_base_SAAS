package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class MpPaymentDispatchAdmission {
    private final MpDispatchStore dispatch;
    private final MpMerchantTokens tokens;
    private final MpLiveActivationPolicy activation;
    private final MpTerminalStore terminals;
    private final MpTerminalVerification verification;
    void require(MpIntent intent, String lease) {
        if (!dispatch.owns(intent, lease)) throw PosApiException.conflict("Payment dispatch lease changed.");
        verification.verify(intent.context(), intent.cashRegisterId());
        if (!dispatch.owns(intent, lease)) throw PosApiException.conflict("Payment dispatch lease changed.");
        var connection = tokens.connection(intent.companyId());
        if (connection.id() != intent.connectionId()
                || !connection.sellerId().equals(intent.sellerId())
                || !connection.environment().equals(intent.environment())) {
            throw PosApiException.conflict("Merchant connection changed before dispatch.");
        }
        activation.requireChargeAllowed(connection);
        var terminal = terminals.require(intent.context(), intent.terminalId(), false);
        if (terminal.connectionId() != intent.connectionId()
                || !terminal.providerTerminalId().equals(intent.providerTerminalId())
                || !Long.valueOf(intent.cashRegisterId()).equals(terminal.cashRegisterId())) {
            throw PosApiException.conflict("Point terminal binding changed before dispatch.");
        }
        MpTerminalEligibility.requireReady(terminal, intent.cashRegisterId());
    }
}
