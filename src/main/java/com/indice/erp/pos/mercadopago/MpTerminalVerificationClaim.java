package com.indice.erp.pos.mercadopago;

record MpTerminalVerificationClaim(MpTerminal terminal, String leaseId) {
    boolean ownsLease() { return leaseId != null; }
}
