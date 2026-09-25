package com.indice.erp.pos.mercadopago;
import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.terminal.TerminalPaymentGuard;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
@Repository
@RequiredArgsConstructor
class MpTerminalConfigurationStore {
    private final MpTerminalStore terminals;
    private final TerminalPaymentGuard guard;
    private final JdbcTemplate jdbc;
    @Transactional
    public MpTerminal claim(PosContext context, MpTerminal initial) {
        if (initial.cashRegisterId() != null) {
            guard.lockRegister(context, initial.cashRegisterId());
            guard.assertNoPending(context, initial.cashRegisterId());
        }
        var current = terminals.require(context, initial.id(), true);
        if (!Objects.equals(current.cashRegisterId(), initial.cashRegisterId()) || "CONFIGURING".equals(current.status())) {
            throw PosApiException.conflict("Point terminal assignment or configuration changed; retry.");
        }
        jdbc.update("UPDATE pos_mercado_pago_terminals SET status='CONFIGURING',verification_status='CONFIGURING',"
            + "verification_failure_code=NULL,version=version+1,updated_at=CURRENT_TIMESTAMP(6) WHERE company_id=? AND id=?",
            context.companyId(), initial.id());
        return current;
    }
    @Transactional public void complete(MpTerminal terminal, MpProviderDtos.Terminal provider) {
        boolean ready = terminal.providerTerminalId().equals(provider.id()) && MpTerminalEligibility.ready(provider);
        jdbc.update("""
            UPDATE pos_mercado_pago_terminals SET status=?,store_id=?,pos_id=?,operating_mode=?,
            provider_last_seen_at=CURRENT_TIMESTAMP(6),provider_verified_at=IF(?,CURRENT_TIMESTAMP(6),NULL),
            verification_status=?,verification_failure_code=?,version=version+1,updated_at=CURRENT_TIMESTAMP(6)
            WHERE company_id=? AND id=? AND connection_id=? AND status='CONFIGURING'
            """, ready ? "READY" : "DISCOVERED", trim(provider.storeId()), trim(provider.posId()),
            provider.operatingMode(), ready, ready ? "READY" : "DISCOVERED", MpTerminalEligibility.failure(provider),
            terminal.companyId(), terminal.id(), terminal.connectionId());
    }
    @Transactional public void failed(MpTerminal terminal) {
        jdbc.update("UPDATE pos_mercado_pago_terminals SET status='DISCOVERED',verification_status='STALE',"
            + "verification_failure_code='PROVIDER_UNAVAILABLE',version=version+1,updated_at=CURRENT_TIMESTAMP(6) "
            + "WHERE company_id=? AND id=? AND connection_id=? AND status='CONFIGURING'",
            terminal.companyId(), terminal.id(), terminal.connectionId());
    }
    private String trim(String value) { return value == null ? null : value.trim(); }
}
