package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosContext;
import java.time.Clock;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
@lombok.RequiredArgsConstructor
public class MpPaymentPreparation {
    private final MpSecrets secrets;
    private final MpTerminalStore terminals;
    private final MpMerchantTokens tokens;
    private final MpLiveActivationPolicy activation;
    private final MpPaymentPreflight preflight;
    private final MpOrderPayload payload;
    private final Clock clock;
    public MpPaymentPrepared prepare(PosContext context, MpCreatePayment request, MpTerminalVerificationProof proof) {
        secrets.requireEnabled();
        var terminal = terminals.requireVerified(context, request.cashRegisterId(), proof);
        var connection = tokens.chargeConnection(context.companyId());
        activation.requireChargeAllowed(connection);
        var draft = preflight.prepare(context, request);
        var reference = "indice_" + UUID.randomUUID().toString().replace("-", "");
        return new MpPaymentPrepared(terminal, connection, draft, reference,
            payload.create(reference, terminal.providerTerminalId(), draft.amount()),
            clock.instant().plusSeconds(payload.timeoutSeconds()));
    }
}
