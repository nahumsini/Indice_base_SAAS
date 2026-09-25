package com.indice.erp.pos.mercadopago;

import java.util.LinkedHashMap;
import java.util.List;

final class MpTerminalFeed {
    static List<MpProviderDtos.Terminal> supported(MpConnection connection,
            List<MpProviderDtos.Terminal> reported) {
        var unique = new LinkedHashMap<String, MpProviderDtos.Terminal>();
        for (var terminal : reported) {
            if (!MpTerminalDiscovery.supported(terminal.id())) continue;
            if (connection.liveMode() && terminal.id().contains("__SBX")) continue;
            if (unique.putIfAbsent(terminal.id(), terminal) != null) throw new MpGatewayException(0, true);
        }
        return List.copyOf(unique.values());
    }
    private MpTerminalFeed() {}
}
