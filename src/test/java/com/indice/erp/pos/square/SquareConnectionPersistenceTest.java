package com.indice.erp.pos.square;

import static org.mockito.Mockito.*;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class SquareConnectionPersistenceTest {
    @Test void validatesGlobalMerchantOwnershipBeforeSaving() {
        var writer = mock(SquareConnectionCredentialWriter.class);
        var guard = mock(SquareConnectionChangeGuard.class);
        var ownership = mock(SquareMerchantOwnership.class);
        var state = new SquareConnectionRepository.OAuthState(1, 7, 11, "production");
        var connection = new SquareRecords.Connection(0, 7, "merchant-7", "access", "refresh", Instant.now(), 0);
        when(guard.lock(7, "production")).thenReturn(null);
        new SquareConnectionPersistence(writer, guard, ownership).save(state, connection);
        var order = inOrder(guard, ownership, writer);
        order.verify(guard).lock(7, "production");
        order.verify(guard).requireReplacementAllowed(7, null, "merchant-7");
        order.verify(ownership).requireAvailable("production", "merchant-7", 7);
        order.verify(writer).save(state, connection, false);
    }
}
