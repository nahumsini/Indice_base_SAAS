package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MpTerminalConfigure {
    private final MpTerminalStore terminals;
    private final MpTerminalConfigurationStore configurations;
    private final MpMerchantTokens tokens;
    private final MpMerchantGateway gateway;
    private final MpPaymentAudit audit;
    private final MpSecrets secrets;

    public MpSetupDtos.Terminal configure(PosContext context, long id) {
        secrets.requireEnabled();
        var terminal = terminals.require(context, id, false);
        if (terminal.storeId() == null || terminal.storeId().isBlank()
            || terminal.posId() == null || terminal.posId().isBlank()) {
            throw PosApiException.conflict("Associate the terminal with a merchant store and POS first.");
        }
        var claimed = configurations.claim(context, terminal);
        MpProviderDtos.Terminal verified;
        try {
            verified = tokens.withToken(context, token -> gateway.configure(token, claimed.providerTerminalId()));
        } catch (RuntimeException exception) {
            configurations.failed(claimed);
            audit.record(context.companyId(), context.userId(), null, "TERMINAL_PDV_UNVERIFIED", "UNCERTAIN");
            throw exception;
        }
        configurations.complete(claimed, verified);
        if (!MpTerminalEligibility.ready(verified)) {
            audit.record(context.companyId(), context.userId(), null, "TERMINAL_PDV_UNVERIFIED", "REJECTED");
            throw PosApiException.conflict("Point terminal store, POS, or PDV mode was not verified.");
        }
        audit.record(context.companyId(), context.userId(), null, "TERMINAL_PDV_CONFIGURED", "READY");
        return terminals.require(context, id, false).response();
    }
}
