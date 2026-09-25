package com.indice.erp.pos.mercadopago;
import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import java.sql.Timestamp;
import java.time.Clock;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service
@RequiredArgsConstructor
class MpConnectionWriter {
    private final JdbcTemplate jdbc;
    private final MpConnectionStore connections;
    private final MpTokenCodec codec;
    private final Clock clock;
    private final MpPaymentAudit audit;
    @Transactional
    public void save(PosContext context, String environment, MpProviderDtos.Tokens tokens) {
        jdbc.queryForObject("SELECT id FROM companies WHERE id=? FOR UPDATE", Long.class, context.companyId());
        var existing = connections.find(context.companyId(), environment, true);
        if (existing.isPresent() && !existing.get().sellerId().equals(tokens.userId())) {
            throw PosApiException.conflict("Reconnect the original merchant account before resolving its payments.");
        }
        String purpose = environment + ":" + tokens.userId() + ":";
        String access = codec.protect(context.companyId(), purpose + "access", tokens.accessToken());
        String refresh = codec.protect(context.companyId(), purpose + "refresh", tokens.refreshToken());
        var expiry = Timestamp.from(clock.instant().plusSeconds(tokens.expiresIn()));
        try {
            if (existing.isEmpty()) jdbc.update("""
                INSERT INTO pos_mercado_pago_connections
                (company_id,seller_id,environment,state,country_code,site_id,live_mode,
                 access_token_ciphertext,refresh_token_ciphertext,expires_at,scopes)
                VALUES (?,?,?,'CONNECTED','MX','MLM',?,?,?,?,?)
                """, context.companyId(), tokens.userId(), environment, tokens.liveMode(), access, refresh, expiry, tokens.scope());
            else jdbc.update("""
                UPDATE pos_mercado_pago_connections SET state='CONNECTED',access_token_ciphertext=?,
                refresh_token_ciphertext=?,expires_at=?,scopes=?,live_mode=?,version=version+1,
                refresh_lease_id=NULL,refresh_lease_until=NULL,updated_at=CURRENT_TIMESTAMP(6)
                WHERE company_id=? AND id=? AND environment=? AND seller_id=?
                """, access, refresh, expiry, tokens.scope(), tokens.liveMode(), context.companyId(),
                existing.get().id(), environment, tokens.userId());
            audit.record(context.companyId(), context.userId(), null, "OAUTH_CONNECTED", "CONNECTED");
        } catch (DataIntegrityViolationException exception) {
            throw PosApiException.conflict("Merchant account cannot be linked to this company.");
        }
    }
}
