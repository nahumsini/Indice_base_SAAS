package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;

public record MpTerminalVerificationProof(long terminalId, long connectionId, String providerTerminalId,
        long registerId, long version) {
    static MpTerminalVerificationProof from(MpTerminal terminal) {
        return new MpTerminalVerificationProof(terminal.id(), terminal.connectionId(),
            terminal.providerTerminalId(), terminal.cashRegisterId(), terminal.version());
    }
    void requireSame(MpTerminal terminal) {
        if (terminal.id() != terminalId || terminal.connectionId() != connectionId
            || !providerTerminalId.equals(terminal.providerTerminalId())
            || !Long.valueOf(registerId).equals(terminal.cashRegisterId()) || terminal.version() != version) {
            throw PosApiException.conflict("Point terminal changed after provider verification; retry.");
        }
    }
}
