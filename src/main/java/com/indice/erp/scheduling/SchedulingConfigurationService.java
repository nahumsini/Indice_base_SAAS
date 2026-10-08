package com.indice.erp.scheduling;

import static com.indice.erp.scheduling.SchedulingDtos.*;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.kiosk.engine.*;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Isolation;

@Service
public class SchedulingConfigurationService {
    private final SchedulingRepository repository;
    private final KioskRegistryService registry;
    private final KioskPayloadProtectionService protection;
    private final SchedulingResourceAvailabilityService resources;
    private final Clock clock;
    public SchedulingConfigurationService(SchedulingRepository repository,KioskRegistryService registry,
        KioskPayloadProtectionService protection,SchedulingResourceAvailabilityService resources,Clock clock){
        this.repository=repository;this.registry=registry;this.protection=protection;this.resources=resources;this.clock=clock;
    }
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public void service(AuthSessionUser actor,Long id,ServiceRequest request) {
        SchedulingAccessService.requireAdministrator(actor);long company=actor.companyId();repository.lockCompany(company);
        if(id==null)id=repository.insert("""
            INSERT INTO scheduling_services(company_id,name,description,duration_minutes,buffer_minutes,notice_hours,active)
            VALUES(?,?,?,?,?,?,?)
            """,company,request.name().trim(),text(request.description()),request.durationMinutes(),request.bufferMinutes(),
            request.noticeHours(),request.active());
        else checked(repository.jdbc().update("""
            UPDATE scheduling_services SET name=?,description=?,duration_minutes=?,buffer_minutes=?,notice_hours=?,
             active=?,version=version+1 WHERE company_id=? AND id=? AND version=?
            """,request.name().trim(),text(request.description()),request.durationMinutes(),request.bufferMinutes(),
            request.noticeHours(),request.active(),company,id,request.version()));
        repository.audit(company,actor.userId(),"SERVICE",id,"SERVICE_SAVED");
    }
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public void staff(AuthSessionUser actor,Long id,StaffRequest request) {
        SchedulingAccessService.requireAdministrator(actor);long company=actor.companyId();repository.lockCompany(company);
        repository.memberEmail(company,request.userId());ZoneId.of(request.timezone());
        var unique=new HashSet<Integer>();
        for(var day:request.days())if(!unique.add(day.dayOfWeek())||!day.startTime().isBefore(day.endTime())
            ||day.startTime().getSecond()!=0||day.endTime().getSecond()!=0)
            throw new IllegalArgumentException("Invalid weekly availability.");
        if(id==null)id=repository.insert("""
            INSERT INTO scheduling_staff(company_id,user_id,public_name,timezone,active) VALUES(?,?,?,?,?)
            """,company,request.userId(),request.publicName().trim(),request.timezone(),request.active());
        else checked(repository.jdbc().update("""
            UPDATE scheduling_staff SET public_name=?,timezone=?,active=?,version=version+1
            WHERE company_id=? AND id=? AND user_id=? AND version=?
            """,request.publicName().trim(),request.timezone(),request.active(),company,id,request.userId(),request.version()));
        repository.jdbc().update("DELETE FROM scheduling_availability WHERE company_id=? AND staff_id=?",company,id);
        for(var day:request.days())repository.jdbc().update("""
            INSERT INTO scheduling_availability(company_id,staff_id,day_of_week,start_time,end_time) VALUES(?,?,?,?,?)
            """,company,id,day.dayOfWeek(),day.startTime(),day.endTime());
        repository.audit(company,actor.userId(),"STAFF",id,"STAFF_SAVED");
    }
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public PageItem page(AuthSessionUser actor,PageRequest request) {
        SchedulingAccessService.requireAdministrator(actor);long company=actor.companyId();repository.lockCompany(company);
        var previous=repository.page(company);long id;String token;
        if(previous.isEmpty()) {
            token="sch_"+UUID.randomUUID().toString().replace("-","")+UUID.randomUUID().toString().replace("-","");
            id=repository.insert("""
                INSERT INTO scheduling_pages(company_id,alias,title,description,published,protected_token) VALUES(?,?,?,?,?,?)
                """,company,request.alias(),request.title().trim(),text(request.description()),request.published(),protection.protect(token));
        } else {
            id=previous.get().id();token=protection.reveal(repository.protectedToken(company));
            checked(repository.jdbc().update("""
                UPDATE scheduling_pages SET alias=?,title=?,description=?,published=?,version=version+1
                WHERE company_id=? AND id=? AND version=?
                """,request.alias(),request.title().trim(),text(request.description()),request.published(),company,id,request.version()));
        }
        String registryStatus=(previous.isPresent()?previous.get().published():request.published())?"active":"disabled";
        var definition=registry.registerLegacyDefinition(company,"SCHEDULING","booking_page",id,
            "SCHEDULING-PAGE","Booking page",registryStatus,null,null,null,token,false,
            KioskAccessLevel.PUBLIC,"scheduling","en-CA",actor.userId());
        registry.synchronizeCapabilities(definition,SchedulingPublicAdapter.descriptors());
        if(previous.isPresent()&&previous.get().published()!=request.published())
            registry.transition(company,"SCHEDULING",id,request.published()?KioskDefinitionStatus.ACTIVE:
                KioskDefinitionStatus.DISABLED,actor.userId(),"Publication changed");
        // Old clients omit appearance; preserve the saved design instead of resetting it.
        var appearance=request.appearance()!=null?request.appearance():previous.map(PageItem::appearance).orElse(PageAppearance.defaults());
        repository.jdbc().update("""
            UPDATE scheduling_pages SET brand_name=?,accent_color=?,surface_color=?,button_label=?,display_layout=?
            WHERE company_id=? AND id=?
            """,text(appearance.brandName()),appearance.accentColor(),appearance.surfaceColor(),text(appearance.buttonLabel()),appearance.layout(),company,id);
        repository.audit(company,actor.userId(),"PAGE",id,"PAGE_SAVED");
        return repository.page(company).orElseThrow();
    }
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public void event(AuthSessionUser actor,Long id,EventRequest request) {
        SchedulingAccessService.requireAdministrator(actor);long company=actor.companyId();repository.lockCompany(company);
        var staff=repository.staff(company).stream().filter(s->s.id()==request.staffId()&&s.active()).findFirst().orElseThrow();
        String email=repository.memberEmail(company,staff.userId());
        if(!request.startAt().isAfter(clock.instant())||request.startAt().isAfter(clock.instant().plusSeconds(366*86400L)))
            throw new IllegalArgumentException("Invalid event date.");
        resources.requireFree(email,request.startAt(),request.durationMinutes(),null,id,null);
        if(id==null)id=repository.insert("""
            INSERT INTO scheduling_events(company_id,staff_id,title,description,start_at,duration_minutes,capacity,published)
             VALUES(?,?,?,?,?,?,?,?)
            """,company,request.staffId(),request.title().trim(),text(request.description()),Timestamp.from(request.startAt()),
            request.durationMinutes(),request.capacity(),request.published());
        else {
            var current=repository.event(company,id);
            long participants=repository.jdbc().queryForObject("SELECT COUNT(*) FROM scheduling_reservations WHERE company_id=?"
            +" AND event_id=? AND status IN ('REQUESTED','CONFIRMED','PAUSED') AND archived_at IS NULL",Long.class,company,id);
            if(!current.status().equals("ACTIVE")||participants>0)
                throw new IllegalStateException("An event with participants cannot be rescheduled. Cancel it and create a new event.");
            checked(repository.jdbc().update("""
                UPDATE scheduling_events SET staff_id=?,title=?,description=?,start_at=?,duration_minutes=?,capacity=?,
                 published=?,version=version+1 WHERE company_id=? AND id=? AND version=?
                """,request.staffId(),request.title().trim(),text(request.description()),Timestamp.from(request.startAt()),
                request.durationMinutes(),request.capacity(),request.published(),company,id,request.version()));
        }
        repository.audit(company,actor.userId(),"EVENT",id,"EVENT_SAVED");
    }
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public void cancelEvent(AuthSessionUser actor,long id,TransitionRequest request) {
        SchedulingAccessService.requireAdministrator(actor);long company=actor.companyId();repository.lockCompany(company);
        var event=repository.event(company,id);
        if(!"CANCELLED".equals(request.status())||text(request.reason()).isEmpty())
            throw new IllegalArgumentException("Cancellation reason required.");
        if(event.version()!=request.version())throw new IllegalStateException("Event changed; reload.");
        if(!event.status().equals("ACTIVE"))throw new IllegalStateException("Event is already cancelled.");
        var ids=repository.jdbc().queryForList("SELECT id FROM scheduling_reservations WHERE company_id=? AND event_id=?"
            +" AND status IN ('REQUESTED','CONFIRMED','PAUSED') AND archived_at IS NULL",Long.class,company,id);
        repository.jdbc().update("UPDATE scheduling_reservations SET status='CANCELLED',paused_from_status=NULL,reason=?,version=version+1"
            +" WHERE company_id=? AND event_id=? AND status IN ('REQUESTED','CONFIRMED','PAUSED') AND archived_at IS NULL",text(request.reason()),company,id);
        for(long reservation:ids)repository.audit(company,actor.userId(),"RESERVATION",reservation,"RESERVATION_EVENT_CANCELLED");
        checked(repository.jdbc().update("UPDATE scheduling_events SET status='CANCELLED',published=0,version=version+1"
            +" WHERE company_id=? AND id=? AND version=?",company,id,request.version()));
        repository.audit(company,actor.userId(),"EVENT",id,"EVENT_CANCELLED");
    }
    static String text(String value){return value==null?"":value.trim();}
    static void checked(int changed){if(changed!=1)throw new IllegalStateException("Record changed; reload before saving.");}
}
