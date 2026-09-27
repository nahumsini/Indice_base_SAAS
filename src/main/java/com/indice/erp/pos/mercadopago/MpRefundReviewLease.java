package com.indice.erp.pos.mercadopago;

import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
class MpRefundReviewLease {
    private static final Set<String> REVIEWABLE = Set.of(
        "PENDING", "UNCERTAIN", "RECONCILIATION_REQUIRED", "DEAD_LETTER");
    private final JdbcTemplate jdbc;
    private final MpRefundRequestMapper mapper;
    Optional<MpRefundRecord> lockOwned(MpRefundRecord observed, String lease, Instant now) {
        return jdbc.query("SELECT * FROM pos_mercado_pago_refund_requests "
                + "WHERE company_id=? AND id=? FOR UPDATE", mapper,
                observed.companyId(), observed.id()).stream()
            .filter(current -> Objects.equals(current.workLeaseId(), lease))
            .filter(current -> current.workLeaseUntil() != null && current.workLeaseUntil().isAfter(now))
            .filter(current -> current.version() == observed.version() + 1)
            .filter(current -> REVIEWABLE.contains(current.status())).findFirst();
    }
}
