package com.indice.erp.meetings;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Locale;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/** Internal availability contract for an owner-validated member identity; never returns meeting data. */
@Service
public class MeetingBusyWindowService {
    private final JdbcTemplate db;
    public MeetingBusyWindowService(JdbcTemplate db){this.db=db;}
    public boolean busy(String validatedEmail,Instant from,Instant to){
        String lock=TransactionSynchronizationManager.isActualTransactionActive()
            &&!TransactionSynchronizationManager.isCurrentTransactionReadOnly()?" FOR UPDATE":"";
        return !db.query("""
            SELECT m.id FROM meeting_records m WHERE m.status IN ('PLANNED','IN_PROGRESS')
              AND m.start_at<? AND m.end_at>? AND (
                EXISTS(SELECT 1 FROM users u WHERE u.id=m.owner_id AND LOWER(u.email)=?) OR
                EXISTS(SELECT 1 FROM meeting_participants p JOIN users u ON u.id=p.user_id
                  WHERE p.company_id=m.company_id AND p.meeting_id=m.id AND LOWER(u.email)=?))
            """+lock,(r,n)->r.getLong(1),Timestamp.from(to),Timestamp.from(from),
            validatedEmail.toLowerCase(Locale.ROOT),validatedEmail.toLowerCase(Locale.ROOT)).isEmpty();
    }
}
