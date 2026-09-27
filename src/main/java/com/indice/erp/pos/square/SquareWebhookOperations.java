package com.indice.erp.pos.square;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class SquareWebhookOperations {
    private final JdbcTemplate jdbc;
    SquareWebhookOperations(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    List<SquareWebhookDtos.DeadLetterResponse> deadLetters(PosContext context,int limit) {
        requireCorporate(context);
        return jdbc.query("""
            SELECT id,square_event_id,event_type,lifetime_attempt_count,replay_count,received_at,
              dead_lettered_at,last_error_message FROM pos_square_webhook_events
            WHERE company_id=? AND status='DEAD_LETTER' ORDER BY dead_lettered_at,id LIMIT ?
            """,(rs,row)->new SquareWebhookDtos.DeadLetterResponse(rs.getLong(1),rs.getString(2),
                rs.getString(3),rs.getInt(4),rs.getInt(5),rs.getTimestamp(6).toInstant(),
                rs.getTimestamp(7).toInstant(),rs.getString(8)),context.companyId(),Math.clamp(limit,1,100));
    }
    @Transactional
    void replay(PosContext context,long eventId,String reason) {
        requireCorporate(context);
        var clean=reason==null?"":reason.trim();
        if (clean.length()<8 || clean.length()>500) throw PosApiException.badRequest("Replay reason must contain 8 to 500 characters.");
        var rows=jdbc.queryForList("SELECT replay_count FROM pos_square_webhook_events "
            + "WHERE id=? AND company_id=? AND status='DEAD_LETTER' FOR UPDATE",Integer.class,eventId,context.companyId());
        if (rows.isEmpty()) throw PosApiException.notFound("Square webhook dead letter was not found.");
        int replay=rows.getFirst()+1;
        jdbc.update("INSERT INTO pos_square_webhook_replay_events(company_id,webhook_event_id,replay_number,actor_user_id,reason) "
            + "VALUES(?,?,?,?,?)",context.companyId(),eventId,replay,context.userId(),clean);
        int changed=jdbc.update("""
            UPDATE pos_square_webhook_events SET status='FAILED',attempt_count=0,replay_count=?,
              next_attempt_at=CURRENT_TIMESTAMP(6),dead_lettered_at=NULL WHERE id=? AND company_id=? AND status='DEAD_LETTER'
            """,replay,eventId,context.companyId());
        if (changed!=1) throw PosApiException.conflict("Square webhook dead letter changed concurrently.");
    }
    private void requireCorporate(PosContext context) {
        if (context.scope()==null || !context.scope().isCorporateOffice())
            throw PosApiException.forbidden("Corporate office scope is required for company-wide Square webhook operations.");
    }
}
