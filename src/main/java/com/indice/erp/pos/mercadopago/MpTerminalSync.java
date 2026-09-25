package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosContext;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MpTerminalSync {
    private final MpMerchantTokens tokens;
    private final MpMerchantGateway gateway;
    private final MpTerminalSynchronizationStore synchronization;
    private final MpTerminalStore terminals;
    private final MpPaymentAudit audit;

    public List<MpSetupDtos.Terminal> sync(PosContext context) {
        var connection = tokens.connection(context.companyId());
        var found = tokens.withToken(context, gateway::terminals);
        synchronization.complete(connection, found);
        audit.record(context.companyId(), context.userId(), null, "TERMINALS_DISCOVERED", "OK");
        return terminals.list(context).stream().map(MpTerminal::response).toList();
    }
}
