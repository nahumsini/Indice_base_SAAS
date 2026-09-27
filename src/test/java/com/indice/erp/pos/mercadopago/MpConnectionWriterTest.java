package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MpConnectionWriterTest {
    @Test void sellerUniqueConflictCannotUpdateAnotherCompanyConnection() {
        var jdbc = mock(JdbcTemplate.class);
        var store = mock(MpConnectionStore.class);
        var codec = mock(MpTokenCodec.class);
        when(store.find(42, "sandbox", true)).thenReturn(Optional.empty());
        when(codec.protect(anyLong(), anyString(), anyString())).thenReturn("encrypted-synthetic");
        when(jdbc.update(contains("INSERT INTO"), any(Object[].class))).thenThrow(new DuplicateKeyException("synthetic-conflict"));
        var writer = new MpConnectionWriter(jdbc, store, codec, MpTestFixtures.CLOCK, mock(MpPaymentAudit.class));
        assertThrows(PosApiException.class, () -> writer.save(MpTestFixtures.context(), "sandbox", MpTestFixtures.tokens()));
        verify(jdbc, never()).update(contains("UPDATE pos_mercado_pago_connections"), any(Object[].class));
    }
    @Test void reconnectUsesTenantAndExistingSellerBoundary() {
        var jdbc = mock(JdbcTemplate.class);
        var store = mock(MpConnectionStore.class);
        var codec = mock(MpTokenCodec.class);
        when(store.find(42, "sandbox", true)).thenReturn(Optional.of(MpTestFixtures.connection()));
        when(codec.protect(anyLong(), anyString(), anyString())).thenReturn("encrypted-synthetic");
        var writer = new MpConnectionWriter(jdbc, store, codec, MpTestFixtures.CLOCK, mock(MpPaymentAudit.class));
        writer.save(MpTestFixtures.context(), "sandbox", MpTestFixtures.tokens());
        verify(jdbc).update(contains("WHERE company_id=? AND id=? AND environment=? AND seller_id=?"),
            eq("encrypted-synthetic"), eq("encrypted-synthetic"), any(), eq("read write offline_access"),
            eq(false), eq(42L), eq(3L), eq("sandbox"), eq("12345"));
        verify(jdbc, never()).update(contains("ON DUPLICATE KEY"), any(Object[].class));
    }
}
