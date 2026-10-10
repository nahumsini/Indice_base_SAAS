package com.indice.erp.scheduling;

import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.access.tab.*;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.notifications.*;
import java.time.*;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Internal staff inbox only. Attendee contact details never leave the scheduling owner. */
@Service
public class SchedulingNotificationService {
    private final JdbcTemplate db;
    private final ModuleAccessService modules;
    private final TabPermissionAccessService tabs;
    private final AppNotificationService notifications;
    private final Clock clock;
    public SchedulingNotificationService(JdbcTemplate db,ModuleAccessService modules,TabPermissionAccessService tabs,AppNotificationService notifications,Clock clock){
        this.db=db;this.modules=modules;this.tabs=tabs;this.notifications=notifications;this.clock=clock;
    }
    @Transactional
    public void dispatch(long company,long reservation,boolean changed){
        db.queryForObject("SELECT id FROM companies WHERE id=? FOR UPDATE",Long.class,company);
        if(!modules.companyCanAccessForMutation(company,"scheduling"))return;
        var rows=db.query("""
            SELECT r.status,r.start_at,r.version,s.timezone,uc.id,uc.user_id,uc.role
            FROM scheduling_reservations r
            JOIN scheduling_staff s ON s.company_id=r.company_id AND s.id=r.staff_id
            JOIN user_companies uc ON uc.company_id=s.company_id AND uc.user_id=s.user_id AND uc.status='active'
            WHERE r.company_id=? AND r.id=?
            """,(r,n)->new Pending(r.getString(1),r.getTimestamp(2).toInstant(),r.getLong(3),r.getString(4),
                new AuthSessionUser(r.getLong(6),company,r.getLong(5),"Scheduling recipient",r.getString(7))),company,reservation);
        if(rows.isEmpty())return;var row=rows.getFirst();var actor=row.actor();
        if(!modules.canAccess(actor,"scheduling")||!tabs.canAccess(actor,new TabPermissionRequirement(List.of("scheduling.reservations"))))return;
        if(changed)deliver(company,reservation,row,row.status().equals("REQUESTED")&&row.version()==1?"booking_requested":"booking_updated",Long.toString(row.version()));
        if(row.status().equals("CONFIRMED")&&row.start().isAfter(clock.instant())&&!row.start().isAfter(clock.instant().plusSeconds(86400)))
            deliver(company,reservation,row,"booking_upcoming",row.start().toString());
    }
    private void deliver(long company,long id,Pending row,String type,String key){
        long recipient=row.actor().userCompanyId();
        if(db.queryForObject("SELECT COUNT(*) FROM scheduling_notification_receipts WHERE company_id=? AND reservation_id=? AND recipient_user_company_id=? AND signal_type=? AND signal_key=?",Integer.class,company,id,recipient,type,key)>0)return;
        // The link resolves by reservation ID after native tab and object authorization; no attendee data in the inbox.
        String date=row.start().atZone(ZoneId.of(row.zone())).toLocalDate().toString();
        notifications.publish(new AppNotificationEvent(company,recipient,"scheduling","reservation",id,type,
            "scheduling:"+id+":"+type+":"+key,"Agenda y eventos","","/scheduling/calendar?reservation="+id+"&view=table&from="+date+"&to="+date+"&staff=0&status=&archived=true&page=1"));
        db.update("INSERT INTO scheduling_notification_receipts(company_id,reservation_id,recipient_user_company_id,signal_type,signal_key) VALUES(?,?,?,?,?)",company,id,recipient,type,key);
    }
    private record Pending(String status,Instant start,long version,String zone,AuthSessionUser actor) { }
}
