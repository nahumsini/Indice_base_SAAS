package com.indice.erp.pos.mercadopago;

import java.sql.ResultSet;
import java.sql.Timestamp;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class MpTerminalMapperTest {
    @Test void expiredProviderVerificationIsExposedAsStale() throws Exception {
        var row = mock(ResultSet.class);
        when(row.getLong("id")).thenReturn(5L);
        when(row.getLong("company_id")).thenReturn(42L);
        when(row.getLong("connection_id")).thenReturn(3L);
        when(row.getString("provider_terminal_id")).thenReturn("NEWLAND_N950__TEST1");
        when(row.getString("store_id")).thenReturn("store");
        when(row.getString("pos_id")).thenReturn("pos");
        when(row.getString("status")).thenReturn("READY");
        when(row.getString("operating_mode")).thenReturn("PDV");
        when(row.getString("verification_status")).thenReturn("READY");
        when(row.getTimestamp("provider_verified_at"))
            .thenReturn(Timestamp.from(MpTestFixtures.NOW.minusSeconds(61)));
        var mapped = new MpTerminalMapper(new MpProperties(), MpTestFixtures.CLOCK).map(row, 0);
        assertEquals("STALE", mapped.verificationStatus());
    }
}
