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
    private final com.indice.erp.sales.SchedulingServiceCatalog catalog;
    private final com.indice.erp.hr.users.HrSchedulingDirectoryService employees;
    private final com.indice.erp.access.module.ModuleAccessService modules;
    private final SchedulingNotificationService notifications;
    private final com.indice.erp.hr.permissions.HrSchedulingAvailabilityService hr;
    public SchedulingConfigurationService(SchedulingRepository repository,KioskRegistryService registry,
        KioskPayloadProtectionService protection,SchedulingResourceAvailabilityService resources,Clock clock,com.indice.erp.access.module.ModuleAccessService modules,SchedulingNotificationService notifications,com.indice.erp.hr.permissions.HrSchedulingAvailabilityService hr,com.indice.erp.sales.SchedulingServiceCatalog catalog,com.indice.erp.hr.users.HrSchedulingDirectoryService employees){
        this.repository=repository;this.registry=registry;this.protection=protection;this.resources=resources;this.clock=clock;this.modules=modules;this.notifications=notifications;this.hr=hr;this.catalog=catalog;this.employees=employees;
    }
    static void validateDays(List<AvailabilityDay> days){
        if(days.size()>28)throw new IllegalArgumentException("scheduling_hours_invalid");
        AvailabilityDay previous=null;
        for(var day:days.stream().sorted(Comparator.comparingInt(AvailabilityDay::dayOfWeek).thenComparing(AvailabilityDay::startTime)).toList()){
            if(day.dayOfWeek()<1||day.dayOfWeek()>7||!day.startTime().isBefore(day.endTime())||day.startTime().getSecond()!=0||day.endTime().getSecond()!=0||previous!=null&&previous.dayOfWeek()==day.dayOfWeek()&&previous.endTime().isAfter(day.startTime()))throw new IllegalArgumentException("scheduling_hours_invalid");
            previous=day;
        }
    }
    public Readiness readiness(long company,boolean publicEnabled){
        String alias="agenda-"+Long.toString(company,36);
        if(repository.aliasTaken(company,alias))alias+="-"+UUID.randomUUID().toString().substring(0,8);
        return new Readiness(publicEnabled,repository.companyName(company),alias,bookingReady(company));
    }
    private boolean bookingReady(long company){
        var staff=repository.activeStaff(company);
        var services=repository.services(company).stream().filter(service->service.active()&&(service.productId()==null||catalog.available(company,service.productId()))).toList();
        boolean sessions=staff.stream().anyMatch(person->!person.days().isEmpty()&&services.stream().anyMatch(service->person.serviceIds().isEmpty()||person.serviceIds().contains(service.id())));
        var activeIds=staff.stream().map(StaffItem::id).toList();
        return sessions||repository.publicEvents(company,clock.instant()).stream().anyMatch(event->activeIds.contains(event.staffId()));
    }
    private void lock(long company){repository.lockCompany(company);if(!modules.companyCanAccessForMutation(company,"scheduling"))throw new SecurityException();}
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public void service(AuthSessionUser actor,Long id,ServiceRequest request) {
        SchedulingAccessService.requireAdministrator(actor);long company=actor.companyId();lock(company);
        if(request.name().isBlank())throw new IllegalArgumentException();
        if(request.days()!=null)validateDays(request.days());
        Long product=request.productId();
        ChargePolicy chargePolicy=request.chargePolicy();
        if(id!=null){
            long serviceId=id;
            var saved=repository.services(company).stream().filter(item->item.id()==serviceId).findFirst().orElseThrow();
            if(product==null)product=saved.productId();
            if(chargePolicy==null)chargePolicy=saved.chargePolicy();
        }
        if(chargePolicy==null)chargePolicy=ChargePolicy.TO_BE_AGREED;
        if(product!=null)catalog.selected(company,product);
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
        repository.jdbc().update("UPDATE scheduling_services SET product_id=?,charge_policy=? WHERE company_id=? AND id=?",product,chargePolicy.name(),company,id);
        if(request.days()!=null){
            repository.jdbc().update("DELETE FROM scheduling_service_availability WHERE company_id=? AND service_id=?",company,id);
            for(var day:request.days())repository.jdbc().update("INSERT INTO scheduling_service_availability(company_id,service_id,day_of_week,start_time,end_time) VALUES(?,?,?,?,?)",company,id,day.dayOfWeek(),day.startTime(),day.endTime());
        }
        repository.audit(company,actor.userId(),"SERVICE",id,"SERVICE_SAVED");
    }
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public void staff(AuthSessionUser actor,Long id,StaffRequest request) {
        SchedulingAccessService.requireAdministrator(actor);long company=actor.companyId();lock(company);
        repository.memberEmail(company,request.userId());ZoneId.of(request.timezone());
        if(request.active()&&!employees.eligible(company,request.userId()))throw new IllegalArgumentException("scheduling_employee_unavailable");
        if(request.days()==null||request.days().size()>28)throw new IllegalArgumentException("Invalid weekly availability.");
        validateDays(request.days());
        if(request.unavailableDates()!=null&&(request.unavailableDates().size()>366||request.unavailableDates().stream().anyMatch(d->d==null||d.isBefore(LocalDate.of(2000,1,1))||d.isAfter(LocalDate.of(2100,1,1)))))throw new IllegalArgumentException();
        if(request.serviceIds()!=null){
            var owned=repository.services(company).stream().map(ServiceItem::id).toList();
            if(request.serviceIds().size()>500||!owned.containsAll(request.serviceIds()))throw new IllegalArgumentException("Unknown company service.");
        }
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
        if(request.unavailableDates()!=null){
            repository.jdbc().update("DELETE FROM scheduling_unavailable_dates WHERE company_id=? AND staff_id=?",company,id);
            for(var date:new TreeSet<>(request.unavailableDates()))repository.jdbc().update("INSERT INTO scheduling_unavailable_dates(company_id,staff_id,unavailable_date) VALUES(?,?,?)",company,id,java.sql.Date.valueOf(date));
        }
        if(request.serviceIds()!=null){
            repository.jdbc().update("DELETE FROM scheduling_staff_services WHERE company_id=? AND staff_id=?",company,id);
            for(var service:new TreeSet<>(request.serviceIds()))repository.jdbc().update("INSERT INTO scheduling_staff_services(company_id,staff_id,service_id) VALUES(?,?,?)",company,id,service);
        }
        if(request.bufferMinutes()!=null)repository.jdbc().update("UPDATE scheduling_staff SET buffer_minutes=? WHERE company_id=? AND id=?",request.bufferMinutes(),company,id);
        repository.audit(company,actor.userId(),"STAFF",id,"STAFF_SAVED");
    }
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public PageItem page(AuthSessionUser actor,PageRequest request) {
        SchedulingAccessService.requireAdministrator(actor);long company=actor.companyId();lock(company);
        if(request.published()&&!bookingReady(company))throw new IllegalArgumentException("scheduling_setup_required");
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
        SchedulingAccessService.requireAdministrator(actor);long company=actor.companyId();lock(company);
        var staff=repository.staff(company).stream().filter(s->s.id()==request.staffId()&&s.active()).findFirst().orElseThrow();
        String email=repository.memberEmail(company,staff.userId());
        if(!request.startAt().isAfter(clock.instant())||request.startAt().isAfter(clock.instant().plusSeconds(366*86400L)))
            throw new IllegalArgumentException("Invalid event date.");
        var existing=id==null?null:repository.event(company,id);
        boolean changesTime=existing==null||existing.staffId()!=staff.id()||!existing.startAt().equals(request.startAt())||existing.durationMinutes()!=request.durationMinutes();
        if(changesTime){
            var zone=ZoneId.of(staff.timezone());var first=request.startAt().atZone(zone).toLocalDate();
            var last=request.startAt().plusSeconds(request.durationMinutes()*60L).minusNanos(1).atZone(zone).toLocalDate();
            if(hr.unavailable(company,staff.userId(),first,last))throw new IllegalStateException("The member is unavailable.");
            resources.requireFree(email,request.startAt(),request.durationMinutes(),null,id,null);
        }
        if(id==null)id=repository.insert("""
            INSERT INTO scheduling_events(company_id,staff_id,title,description,start_at,duration_minutes,capacity,published)
             VALUES(?,?,?,?,?,?,?,?)
            """,company,request.staffId(),request.title().trim(),text(request.description()),Timestamp.from(request.startAt()),
            request.durationMinutes(),request.capacity(),request.published());
        else {
            var current=repository.event(company,id);
            long participants=repository.jdbc().queryForObject("SELECT COUNT(*) FROM scheduling_reservations WHERE company_id=?"
            +" AND event_id=? AND status IN ('REQUESTED','CONFIRMED','PAUSED') AND archived_at IS NULL",Long.class,company,id);
            boolean changesSchedule=current.staffId()!=request.staffId()||!current.startAt().equals(request.startAt())
                ||current.durationMinutes()!=request.durationMinutes();
            if(!current.status().equals("ACTIVE")||participants>0&&changesSchedule)
                throw new IllegalStateException("An event with participants cannot be rescheduled. Cancel it and create a new event.");
            if(request.capacity()<current.confirmedCount())throw new IllegalStateException("Capacity cannot exclude confirmed participants.");
            checked(repository.jdbc().update("""
                UPDATE scheduling_events SET staff_id=?,title=?,description=?,start_at=?,duration_minutes=?,capacity=?,
                 published=?,version=version+1 WHERE company_id=? AND id=? AND version=?
                """,request.staffId(),request.title().trim(),text(request.description()),Timestamp.from(request.startAt()),
                request.durationMinutes(),request.capacity(),request.published(),company,id,request.version()));
        }
        if(request.location()!=null)repository.jdbc().update("UPDATE scheduling_events SET location=? WHERE company_id=? AND id=?",text(request.location()),company,id);
        repository.audit(company,actor.userId(),"EVENT",id,"EVENT_SAVED");
    }
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public void cancelEvent(AuthSessionUser actor,long id,TransitionRequest request) {
        SchedulingAccessService.requireAdministrator(actor);long company=actor.companyId();lock(company);
        var event=repository.event(company,id);
        if(!"CANCELLED".equals(request.status())||text(request.reason()).isEmpty())
            throw new IllegalArgumentException("Cancellation reason required.");
        if(event.version()!=request.version())throw new IllegalStateException("Event changed; reload.");
        if(!event.status().equals("ACTIVE"))throw new IllegalStateException("Event is already cancelled.");
        var ids=repository.jdbc().queryForList("SELECT id FROM scheduling_reservations WHERE company_id=? AND event_id=?"
            +" AND status IN ('REQUESTED','CONFIRMED','PAUSED') AND archived_at IS NULL",Long.class,company,id);
        repository.jdbc().update("UPDATE scheduling_reservations SET status='CANCELLED',paused_from_status=NULL,reason=?,version=version+1"
            +" WHERE company_id=? AND event_id=? AND status IN ('REQUESTED','CONFIRMED','PAUSED') AND archived_at IS NULL",text(request.reason()),company,id);
        for(long reservation:ids){repository.audit(company,actor.userId(),"RESERVATION",reservation,"RESERVATION_EVENT_CANCELLED");notifications.dispatch(company,reservation,true);}
        checked(repository.jdbc().update("UPDATE scheduling_events SET status='CANCELLED',published=0,version=version+1"
            +" WHERE company_id=? AND id=? AND version=?",company,id,request.version()));
        repository.audit(company,actor.userId(),"EVENT",id,"EVENT_CANCELLED");
    }
    static String text(String value){return value==null?"":value.trim();}
    static void checked(int changed){if(changed!=1)throw new IllegalStateException("Record changed; reload before saving.");}
}
