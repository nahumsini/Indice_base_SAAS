package com.indice.erp.meetings;

import java.util.concurrent.atomic.AtomicBoolean;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class MeetingReminderScheduler {
    private static final Logger LOG=LoggerFactory.getLogger(MeetingReminderScheduler.class);
    private final JdbcTemplate db;private final MeetingReminderService reminders;
    private final AtomicBoolean running=new AtomicBoolean();private long cursor;
    public MeetingReminderScheduler(JdbcTemplate db,MeetingReminderService reminders){this.db=db;this.reminders=reminders;}
    @Scheduled(initialDelayString="${app.meetings.reminder-initial-delay-ms:60000}",fixedDelayString="${app.meetings.reminder-delay-ms:60000}")
    public void dispatch(){
        if(!running.compareAndSet(false,true))return;
        try{
            var candidates=db.query("SELECT m.id,m.company_id FROM meeting_records m LEFT JOIN meeting_series s ON s.company_id=m.company_id AND s.id=m.series_id WHERE m.id>? AND m.reminder_minutes>0 AND m.status<>'CANCELLED' AND COALESCE(s.reminders_paused,0)=0 AND ((m.status='PLANNED' AND m.start_at>UTC_TIMESTAMP(6) AND TIMESTAMPADD(MINUTE,-m.reminder_minutes,m.start_at)<=UTC_TIMESTAMP(6)) OR (m.status IN ('PLANNED','IN_PROGRESS') AND m.end_at<UTC_TIMESTAMP(6) AND TRIM(m.minutes)='') OR EXISTS(SELECT 1 FROM meeting_agreements a WHERE a.company_id=m.company_id AND a.meeting_id=m.id AND a.status='OPEN')) ORDER BY m.id LIMIT 100",(r,n)->new Candidate(r.getLong(1),r.getLong(2)),cursor);
            for(var c:candidates){try{reminders.dispatch(c.company(),c.id());}catch(RuntimeException failure){LOG.warn("meeting_reminder_retry companyId={} meetingId={} failureType={}",c.company(),c.id(),failure.getClass().getSimpleName());}cursor=c.id();}
            if(candidates.size()<100)cursor=0;
        }finally{running.set(false);}
    }
    private record Candidate(long id,long company) { }
}
