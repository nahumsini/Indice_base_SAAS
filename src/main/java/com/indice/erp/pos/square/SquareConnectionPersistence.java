package com.indice.erp.pos.square;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class SquareConnectionPersistence {
    private final SquareConnectionCredentialWriter writer;
    private final SquareConnectionChangeGuard guard;
    private final SquareMerchantOwnership ownership;
    SquareConnectionPersistence(SquareConnectionCredentialWriter writer, SquareConnectionChangeGuard guard,
            SquareMerchantOwnership ownership) {
        this.writer = writer;
        this.guard = guard;
        this.ownership = ownership;
    }
    @Transactional
    public void save(SquareConnectionRepository.OAuthState state, SquareRecords.Connection connection) {
        var merchant = guard.lock(state.companyId(), state.environment());
        guard.requireReplacementAllowed(state.companyId(), merchant, connection.merchantId());
        ownership.requireAvailable(state.environment(), connection.merchantId(), state.companyId());
        writer.save(state, connection, merchant != null);
    }
}
