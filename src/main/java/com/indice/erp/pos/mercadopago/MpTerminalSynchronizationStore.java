package com.indice.erp.pos.mercadopago;
import java.sql.Timestamp;
import java.time.Clock;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
@Repository
@RequiredArgsConstructor
public class MpTerminalSynchronizationStore {
    private final JdbcTemplate jdbc;
    private final Clock clock;
    @Transactional public void complete(MpConnection connection, List<MpProviderDtos.Terminal> response) {
        var terminals = MpTerminalFeed.supported(connection, response);
        terminals.forEach(terminal -> seen(connection, terminal));
        missing(connection, terminals.stream().map(MpProviderDtos.Terminal::id).toList());
    }
    private void seen(MpConnection connection, MpProviderDtos.Terminal terminal) {
        boolean ready = MpTerminalEligibility.ready(terminal);
        var now = Timestamp.from(clock.instant());
        jdbc.update("""
            INSERT INTO pos_mercado_pago_terminals
            (company_id,connection_id,provider_terminal_id,store_id,pos_id,name,status,operating_mode,
             provider_last_seen_at,provider_verified_at,verification_status,verification_failure_code,version)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,0) ON DUPLICATE KEY UPDATE
            provider_verified_at=IF(verification_failure_code='BINDING_CHANGED' OR
            NOT(store_id <=> VALUES(store_id)) OR NOT(pos_id <=> VALUES(pos_id)),NULL,
            VALUES(provider_verified_at)),verification_status=IF(status='CONFIGURING','CONFIGURING',IF(
            verification_failure_code='BINDING_CHANGED' OR NOT(store_id <=> VALUES(store_id)) OR NOT(pos_id <=> VALUES(pos_id)),'STALE',VALUES(verification_status))),
            verification_failure_code=IF(status='CONFIGURING',verification_failure_code,IF(
            verification_failure_code='BINDING_CHANGED' OR NOT(store_id <=> VALUES(store_id)) OR NOT(pos_id <=> VALUES(pos_id)),'BINDING_CHANGED',VALUES(verification_failure_code))),
            status=IF(status='CONFIGURING',status,IF(verification_failure_code='BINDING_CHANGED','STALE',VALUES(status))),
            store_id=VALUES(store_id),pos_id=VALUES(pos_id),operating_mode=VALUES(operating_mode),
            provider_last_seen_at=VALUES(provider_last_seen_at),version=version+1
            """, connection.companyId(), connection.id(), terminal.id(), trim(terminal.storeId()),
            trim(terminal.posId()), terminal.id(), ready ? "READY" : "DISCOVERED", terminal.operatingMode(),
            now, ready ? now : null, ready ? "READY" : "DISCOVERED", MpTerminalEligibility.failure(terminal));
    }
    private void missing(MpConnection connection, List<String> ids) {
        var params = new ArrayList<Object>(List.of(connection.companyId(), connection.id()));
        String except = "";
        if (!ids.isEmpty()) { except = " AND provider_terminal_id NOT IN (" + String.join(",", Collections.nCopies(ids.size(), "?")) + ")"; params.addAll(ids); }
        jdbc.update("UPDATE pos_mercado_pago_terminals SET status='UNAVAILABLE',verification_status='UNAVAILABLE',"
            + "verification_failure_code='NOT_RETURNED',version=version+1,updated_at=CURRENT_TIMESTAMP(6) "
            + "WHERE company_id=? AND connection_id=?" + except, params.toArray());
    }
    private String trim(String value) { return value == null ? null : value.trim(); }
}
