package com.indice.erp.meetings;

import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.access.tab.*;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.notifications.*;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Meeting-owned durable signal receipts; delivery uses the existing notification owner contract. */
@Service
public class MeetingReminderService {
    private final MeetingRepository repository;
    private final ModuleAccessService modules;
    private final TabPermissionAccessService tabs;
    private final AppNotificationService notifications;
    public MeetingReminderService(MeetingRepository repository,ModuleAccessService modules,TabPermissionAccessService tabs,AppNotificationService notifications){this.repository=repository;this.modules=modules;this.tabs=tabs;this.notifications=notifications;}
    @Transactional
    public void dispatch(long company,long meeting){
        var db=repository.jdbc();
        db.queryForObject("SELECT id FROM companies WHERE id=? FOR UPDATE",Long.class,company);
        if(!modules.companyCanAccessForMutation(company,"control_minutas"))return;
        var rows=db.query("SELECT m.*,COALESCE(s.reminders_paused,0) paused FROM meeting_records m LEFT JOIN meeting_series s ON s.company_id=m.company_id AND s.id=m.series_id WHERE m.company_id=? AND m.id=? FOR UPDATE",
            (r,n)->new Pending(r.getString("status"),r.getTimestamp("start_at").toInstant(),r.getTimestamp("end_at").toInstant(),r.getString("timezone"),r.getLong("owner_id"),r.getObject("minutes_owner_id")==null?r.getLong("owner_id"):r.getLong("minutes_owner_id"),r.getInt("reminder_minutes"),r.getString("minutes").isBlank(),r.getBoolean("paused")),company,meeting);
        if(rows.isEmpty())return;var m=rows.getFirst();if(m.paused()||m.status().equals("CANCELLED"))return;
        var now=Instant.now();String date=m.start().atZone(ZoneId.of(m.zone())).toLocalDate().toString();
        String link="/minutes-control/meetings?meeting="+meeting+"&from="+date+"&to="+date+"&q=&owner=0&status=&attention=";
        if(m.reminder()>0&&m.status().equals("PLANNED")&&m.start().isAfter(now)&&!m.start().minusSeconds(m.reminder()*60L).isAfter(now)){
            var people=new TreeSet<Long>();people.add(m.owner());people.add(m.minutesOwner());people.addAll(db.queryForList("SELECT user_id FROM meeting_participants WHERE company_id=? AND meeting_id=?",Long.class,company,meeting));
            for(long user:people)deliver(company,meeting,user,"upcoming_meeting",m.start().toString()+":"+m.reminder(),"meetings",link);
        }
        if(m.reminder()>0&&m.emptyMinutes()&&m.end().isBefore(now)&&!m.status().equals("COMPLETED")){
            for(long user:new TreeSet<>(List.of(m.owner(),m.minutesOwner())))deliver(company,meeting,user,"missing_minutes",m.end().toString(),"meetings",link);
        }
        if(m.reminder()>0){
            var today=LocalDate.now(ZoneId.of(m.zone()));
            var agreements=db.query("SELECT id,assignee_id,due_date FROM meeting_agreements WHERE company_id=? AND meeting_id=? AND status='OPEN' AND due_date<? ORDER BY id LIMIT 200",
                (r,n)->new Late(r.getLong(1),r.getLong(2),r.getDate(3).toLocalDate()),company,meeting,java.sql.Date.valueOf(today));
            for(var a:agreements)deliver(company,meeting,a.user(),"overdue_agreement",a.id()+":"+a.due(),"agreements","/minutes-control/agreements?from="+a.due()+"&to="+a.due()+"&q=&assignee=0&status=OPEN&attention=overdueAgreements");
        }
    }
    private void deliver(long company,long meeting,long user,String signal,String key,String tab,String link){
        var db=repository.jdbc();
        var actors=db.query("SELECT id,role FROM user_companies WHERE company_id=? AND user_id=? AND status='active' ORDER BY id DESC LIMIT 1 FOR SHARE",(r,n)->new AuthSessionUser(user,company,r.getLong(1),"Meeting recipient",r.getString(2)),company,user);
        if(actors.isEmpty())return;var actor=actors.getFirst();
        if(!modules.canAccess(actor,"control_minutas")||!tabs.canAccess(actor,new TabPermissionRequirement(List.of("control_minutas."+tab))))return;
        if(db.queryForObject("SELECT COUNT(*) FROM meeting_reminder_receipts WHERE company_id=? AND meeting_id=? AND recipient_user_id=? AND signal_type=? AND signal_key=?",Integer.class,company,meeting,user,signal,key)>0)return;
        // No meeting title, minutes, participants or agreement content is copied to the global inbox.
        notifications.publish(new AppNotificationEvent(company,actor.userCompanyId(),"control_minutas","meeting",meeting,signal,
            "meeting:"+meeting+":"+signal+":"+key,"Control de juntas","",link));
        db.update("INSERT INTO meeting_reminder_receipts(company_id,meeting_id,recipient_user_id,signal_type,signal_key) VALUES(?,?,?,?,?)",company,meeting,user,signal,key);
    }
    private record Pending(String status,Instant start,Instant end,String zone,long owner,long minutesOwner,int reminder,boolean emptyMinutes,boolean paused) { }
    private record Late(long id,long user,LocalDate due) { }
}
