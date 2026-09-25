package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosContext;
import java.sql.Timestamp;
import java.time.Instant;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@lombok.RequiredArgsConstructor
public class MpIntentCreator {
    private final JdbcTemplate jdbc;
    private final MpIntentReader reader;
    public MpIntent create(PosContext context, MpCreatePayment request, MpPaymentDraft draft,
            MpTerminal terminal, MpConnection connection, String hash, String reference,
            String providerJson, Instant expiresAt) {
        jdbc.update("""
            INSERT INTO pos_mercado_pago_payment_intents
            (company_id,cash_register_id,shift_id,terminal_id,connection_id,
             provider_terminal_id,seller_id,environment,idempotency_key,external_reference,
             amount,currency_code,payload_hash,checkout_json,provider_request_json,
             created_by_user_id,created_by_role,scope_type,scope_unit_id,scope_business_id,expires_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,'MXN',?,?,?,?,?,?,?,?,?)
            """, context.companyId(), request.cashRegisterId(), draft.shift().id(), terminal.id(),
            connection.id(), terminal.providerTerminalId(), connection.sellerId(), connection.environment(),
            request.idempotencyKey(), reference, draft.amount(), hash, draft.checkoutJson(), providerJson,
            context.userId(), context.role(), context.scope().type().name(), context.scope().unitId(),
            context.scope().businessId(), Timestamp.from(expiresAt));
        return reader.byKey(context, request.idempotencyKey()).orElseThrow();
    }
}
