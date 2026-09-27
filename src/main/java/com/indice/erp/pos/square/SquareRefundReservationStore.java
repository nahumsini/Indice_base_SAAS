package com.indice.erp.pos.square;

import com.indice.erp.pos.PosContext;
import java.math.BigDecimal;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
class SquareRefundReservationStore {
    private final JdbcTemplate jdbc;
    private final SquareRefundQueries queries;
    SquareRefundRecord save(PosContext c, SquareRecords.PaymentIntent intent, SquareRefundRequest request,
            BigDecimal amount, BigDecimal baseline, SquareRefundPayload payload,
            String environment, String merchant) {
        jdbc.update("""
            INSERT INTO pos_square_refund_requests
              (company_id,intent_id,request_key,amount,baseline_amount,currency_code,request_json,
               payload_hash,reason,environment,merchant_id,requested_by_user_id,requested_by_role,
               requested_scope_type,requested_scope_unit_id,requested_scope_business_id)
            VALUES (?,?,?,?,?,?,CAST(? AS JSON),SHA2(CAST(CAST(? AS JSON) AS CHAR CHARACTER SET utf8mb4),256),
                ?,?,?,?,?,?,?,?)
            ON DUPLICATE KEY UPDATE id=id
            """, intent.companyId(), intent.id(), request.idempotencyKey(), amount, baseline,
            intent.currencyCode(), payload.json(), payload.json(), request.reason().trim(), environment,
            merchant, c.userId(), c.role(), c.scope().type().name(), c.scope().unitId(), c.scope().businessId());
        return queries.byKey(intent.companyId(), request.idempotencyKey())
            .orElseThrow(() -> com.indice.erp.pos.PosApiException.conflict(
                "Recover the unresolved Square refund before submitting another refund."));
    }
}
