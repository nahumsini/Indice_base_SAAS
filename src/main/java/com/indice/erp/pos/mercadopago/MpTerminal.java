package com.indice.erp.pos.mercadopago;

import java.time.Instant;

public record MpTerminal(long id, long companyId, long connectionId, String providerTerminalId,
    String storeId, String posId, String name, String status, String operatingMode, Long cashRegisterId,
    Instant providerLastSeenAt, Instant providerVerifiedAt, String verificationStatus,
    String verificationFailureCode, long version, String verificationLeaseId, Instant verificationLeaseUntil) {
    public MpSetupDtos.Terminal response() {
        return new MpSetupDtos.Terminal(id, name, providerTerminalId, storeId, posId, status,
            operatingMode, cashRegisterId, verificationStatus, providerLastSeenAt,
            providerVerifiedAt, verificationFailureCode, version);
    }
}
