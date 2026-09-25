package com.indice.erp.pos.mercadopago;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MpRefundReviewLeaseTest {
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final MpRefundRequestMapper mapper = mock(MpRefundRequestMapper.class);
    private final MpRefundReviewLease leases = new MpRefundReviewLease(jdbc, mapper);
    @Test void locksAndAcceptsOnlyTheUnexpiredClaimVersion() {
        var observed = MpRefundTestFixtures.record("PENDING");
        var claimed = change(change(change(observed, "workLeaseId", "lease"),
            "workLeaseUntil", MpTestFixtures.NOW.plusSeconds(1)), "version", 1L);
        when(jdbc.query(anyString(), same(mapper), eq(42L), eq(19L))).thenReturn(List.of(claimed));
        assertSame(claimed, leases.lockOwned(observed, "lease", MpTestFixtures.NOW).orElseThrow());
        verify(jdbc).query(contains("company_id=? AND id=? FOR UPDATE"), same(mapper), eq(42L), eq(19L));
    }
    @Test void rejectsExpiredOrReplacedClaim() {
        var observed = MpRefundTestFixtures.record("PENDING");
        var expired = change(change(change(observed, "workLeaseId", "other"),
            "workLeaseUntil", MpTestFixtures.NOW), "version", 1L);
        when(jdbc.query(anyString(), same(mapper), eq(42L), eq(19L))).thenReturn(List.of(expired));
        assertTrue(leases.lockOwned(observed, "lease", MpTestFixtures.NOW).isEmpty());
    }
    private MpRefundRecord change(MpRefundRecord refund, String field, Object value) {
        return MpRefundTestFixtures.change(refund, field, value);
    }
}
