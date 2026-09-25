package com.indice.erp.pos.square;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class SquarePaymentMerchantGuardTest {
    @Test
    void rejectsJpyBeforeCurrencyExponentCanOvercharge() {
        var context = new PosContext(10L, 1L, "Cashier", "admin", true, PosScope.corporateOffice());
        var connections = mock(SquareConnectionRepository.class);
        var ownership = mock(SquareMerchantOwnership.class);
        var changeGuard = mock(SquareConnectionChangeGuard.class);
        var properties = new SquareTerminalProperties();
        properties.setEnvironment("sandbox");
        when(changeGuard.lock(1L, "sandbox")).thenReturn("merchant1");
        when(connections.findConnection(context, "sandbox"))
            .thenReturn(Optional.of(new SquareRecords.Connection(2L, 1L, "merchant1", "synthetic", null, null, 0)));
        when(ownership.company("sandbox", "merchant1")).thenReturn(1L);
        when(connections.findLocation(context, "loc1"))
            .thenReturn(Optional.of(new SquareRecords.Location(3L, 1L, "loc1", "Synthetic", "JPY", "JP")));
        var guard = new SquarePaymentMerchantGuard(connections, ownership, properties, changeGuard);
        assertThatThrownBy(() -> guard.require(context, "loc1", "JPY"))
            .isInstanceOf(PosApiException.class).hasMessageContaining("currency exponent");
        verify(changeGuard).lock(1L, "sandbox");
    }
}
