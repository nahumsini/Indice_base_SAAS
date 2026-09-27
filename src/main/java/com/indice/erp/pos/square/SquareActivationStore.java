package com.indice.erp.pos.square;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class SquareActivationStore {
    private final JdbcTemplate jdbc;
    SquareActivationStore(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    Optional<Record> find(long company, String environment) {
        return jdbc.query("""
            SELECT c.company_id,c.environment,c.status,c.merchant_id,c.live_activation_state,
              c.live_activation_changed_at,c.live_activated_at,c.live_suspended_at,
              c.live_activation_reason,c.live_activation_version,
              EXISTS(SELECT 1 FROM pos_square_locations l WHERE l.company_id=c.company_id AND l.status='ACTIVE'
                AND ((l.country_code='US' AND l.currency_code='USD') OR (l.country_code='CA' AND l.currency_code='CAD')
                  OR (l.country_code='AU' AND l.currency_code='AUD') OR (l.country_code='GB' AND l.currency_code='GBP')
                  OR (l.country_code IN ('IE','FR','ES') AND l.currency_code='EUR'))) eligible_location
            FROM pos_square_connections c WHERE c.company_id=? AND c.environment=?
            """, (rs, row) -> new Record(rs.getLong(1),rs.getString(2),rs.getString(3),rs.getString(4),rs.getString(5),
                instant(rs,6),instant(rs,7),instant(rs,8),rs.getString(9),rs.getLong(10),rs.getBoolean(11)),
            company, environment).stream().findFirst();
    }
    Record change(Record current, SquareActivationState state, long actor, String reason, long expected, Instant now) {
        var activated = state.allowsCharges() && current.state()!=state ? now : current.activatedAt();
        var suspended = state==SquareActivationState.SUSPENDED && current.state()!=state ? now : current.suspendedAt();
        int changed = jdbc.update("""
            UPDATE pos_square_connections SET live_activation_state=?,live_activation_actor_user_id=?,
              live_activation_reason=?,live_activation_changed_at=?,live_activated_at=?,live_suspended_at=?,
              live_activation_version=live_activation_version+1 WHERE company_id=? AND environment='production'
                AND live_activation_version=?
            """, state.name(),actor,reason,Timestamp.from(now),sql(activated),sql(suspended),current.companyId(),expected);
        if (changed!=1) throw new IllegalStateException("Square activation changed concurrently.");
        return new Record(current.companyId(),current.environment(),current.connectionState(),current.merchantId(),
            state.name(),now,activated,suspended,reason,expected+1,current.eligibleLocation());
    }
    private Instant instant(java.sql.ResultSet rs,int column) throws java.sql.SQLException { var value=rs.getTimestamp(column); return value==null?null:value.toInstant(); }
    private Timestamp sql(Instant value) { return value==null?null:Timestamp.from(value); }
    record Record(long companyId,String environment,String connectionState,String merchantId,String activationState,
        Instant changedAt,Instant activatedAt,Instant suspendedAt,String reason,long version,boolean eligibleLocation) {
        SquareActivationState state() { return SquareActivationState.parse(activationState); }
    }
}
