package com.indice.erp.pos.square;

import com.indice.erp.pos.PosContext;
import java.sql.Timestamp;
import java.time.Instant;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class SquareTerminalPairingPersistence {
    private final JdbcTemplate jdbc;
    SquareTerminalPairingPersistence(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    void paired(long company, String code, String device) {
        jdbc.update("""
            UPDATE pos_square_terminals SET square_device_id=?,status='PAIRED',
              verification_status='READY',provider_verified_at=CURRENT_TIMESTAMP(6),
              version=version+1,updated_at=CURRENT_TIMESTAMP
            WHERE company_id=? AND square_device_code_id=?
            """, device, company, code);
    }
    boolean replace(PosContext context, long terminal, String codeId, String code, Instant pairBy) {
        return jdbc.update("""
            UPDATE pos_square_terminals SET square_device_code_id=?,square_device_id=NULL,
              pairing_code_hint=?,pair_by=?,status='UNPAIRED',verification_status='STALE',
              version=version+1,updated_by_user_id=?,updated_at=CURRENT_TIMESTAMP
            WHERE company_id=? AND id=? AND status<>'DISABLED'
            """, codeId, hint(code), Timestamp.from(pairBy), context.userId(),
            context.companyId(), terminal) == 1;
    }
    private String hint(String value) {
        if (value == null || value.isBlank()) return null;
        var clean = value.trim();
        return clean.substring(Math.max(0, clean.length() - 4));
    }
}
