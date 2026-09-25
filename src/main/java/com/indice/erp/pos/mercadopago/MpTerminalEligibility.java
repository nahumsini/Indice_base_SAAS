package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;

final class MpTerminalEligibility {
    static boolean ready(MpProviderDtos.Terminal terminal) {
        return terminal != null && MpTerminalDiscovery.supported(terminal.id())
            && present(terminal.storeId()) && present(terminal.posId())
            && "PDV".equals(terminal.operatingMode());
    }
    static String failure(MpProviderDtos.Terminal terminal) {
        if (terminal == null || !MpTerminalDiscovery.supported(terminal.id())) return "UNSUPPORTED_TERMINAL";
        if (!present(terminal.storeId())) return "STORE_MISSING";
        if (!present(terminal.posId())) return "POS_MISSING";
        return "PDV".equals(terminal.operatingMode()) ? null : "MODE_MISMATCH";
    }
    static MpTerminalVerificationProof requireReady(MpTerminal terminal, long registerId) {
        if (!Long.valueOf(registerId).equals(terminal.cashRegisterId()) || !configured(terminal)) {
            throw PosApiException.conflict("Point terminal requires fresh provider verification.");
        }
        return MpTerminalVerificationProof.from(terminal);
    }
    static boolean configured(MpTerminal terminal) {
        return "READY".equals(terminal.status()) && "READY".equals(terminal.verificationStatus())
            && present(terminal.storeId()) && present(terminal.posId()) && "PDV".equals(terminal.operatingMode())
            && MpTerminalDiscovery.supported(terminal.providerTerminalId());
    }
    private static boolean present(String value) { return value != null && !value.isBlank(); }
    private MpTerminalEligibility() {}
}
