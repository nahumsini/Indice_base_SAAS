package com.indice.erp.scheduling;

import static com.indice.erp.scheduling.SchedulingDtos.*;
import com.indice.erp.access.module.RequiresModuleAccess;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/scheduling")
@RequiresModuleAccess("scheduling")
public class SchedulingController {
    private final SchedulingAccessService access;
    private final SchedulingRepository repository;
    private final SchedulingConfigurationService configuration;
    private final SchedulingBookingService booking;
    private final SchedulingReservationManagementService management;
    private final com.indice.erp.kiosk.engine.KioskEngineFeatureFlags flags;
    public SchedulingController(SchedulingAccessService access,SchedulingRepository repository,
        SchedulingConfigurationService configuration,SchedulingBookingService booking,com.indice.erp.kiosk.engine.KioskEngineFeatureFlags flags,
        SchedulingReservationManagementService management){
        this.access=access;this.repository=repository;this.configuration=configuration;this.booking=booking;this.flags=flags;this.management=management;
    }
    public record Readiness(boolean publicAccessEnabled) { }
    @GetMapping("/readiness") public Readiness readiness(HttpSession s){
        var actor=access.require(s,"configuration",null,false);SchedulingAccessService.requireAdministrator(actor);
        return new Readiness(flags.registryEnabled()&&flags.sessionsEnabled()&&flags.auditEnabled()&&flags.adapterEnabled("SCHEDULING"));
    }
    @GetMapping("/services") public List<ServiceItem> services(HttpSession session){
        var actor=access.require(session,"configuration",null,false);SchedulingAccessService.requireAdministrator(actor);
        return repository.services(actor.companyId());
    }
    @PostMapping("/services") public void service(HttpSession s,@RequestHeader(value="X-CSRF-Token",required=false)String token,
        @Valid @RequestBody ServiceRequest body){configuration.service(access.require(s,"configuration",token,true),null,body);}
    @PutMapping("/services/{id}") public void service(HttpSession s,@RequestHeader(value="X-CSRF-Token",required=false)String token,
        @PathVariable long id,@Valid @RequestBody ServiceRequest body){configuration.service(access.require(s,"configuration",token,true),id,body);}
    @GetMapping("/staff") public List<StaffItem> staff(HttpSession s){
        var actor=access.require(s,"configuration",null,false);SchedulingAccessService.requireAdministrator(actor);
        return repository.staff(actor.companyId());
    }
    @GetMapping("/members") public List<MemberItem> members(HttpSession s){
        var actor=access.require(s,"configuration",null,false);SchedulingAccessService.requireAdministrator(actor);
        return repository.members(actor.companyId());
    }
    @PostMapping("/staff") public void staff(HttpSession s,@RequestHeader(value="X-CSRF-Token",required=false)String token,
        @Valid @RequestBody StaffRequest body){configuration.staff(access.require(s,"configuration",token,true),null,body);}
    @PutMapping("/staff/{id}") public void staff(HttpSession s,@RequestHeader(value="X-CSRF-Token",required=false)String token,
        @PathVariable long id,@Valid @RequestBody StaffRequest body){configuration.staff(access.require(s,"configuration",token,true),id,body);}
    @GetMapping("/page") public PageItem page(HttpSession s){
        var actor=access.require(s,"configuration",null,false);SchedulingAccessService.requireAdministrator(actor);
        return repository.page(actor.companyId()).orElse(null);}
    @PutMapping("/page") public PageItem page(HttpSession s,@RequestHeader(value="X-CSRF-Token",required=false)String token,
        @Valid @RequestBody PageRequest body){return configuration.page(access.require(s,"configuration",token,true),body);}
    @GetMapping("/events") public List<EventItem> events(HttpSession s){
        var actor=access.require(s,"events",null,false);
        var allowed=repository.staff(actor.companyId()).stream().filter(t->SchedulingAccessService.administrator(actor)
            ||t.userId()==actor.userId()).map(StaffItem::id).toList();
        return repository.events(actor.companyId()).stream().filter(e->allowed.contains(e.staffId())).toList();
    }
    @PostMapping("/events") public void event(HttpSession s,@RequestHeader(value="X-CSRF-Token",required=false)String token,
        @Valid @RequestBody EventRequest body){configuration.event(access.require(s,"events",token,true),null,body);}
    @PutMapping("/events/{id}") public void event(HttpSession s,@RequestHeader(value="X-CSRF-Token",required=false)String token,
        @PathVariable long id,@Valid @RequestBody EventRequest body){configuration.event(access.require(s,"events",token,true),id,body);}
    @PostMapping("/events/{id}/cancel") public void cancelEvent(HttpSession s,@RequestHeader(value="X-CSRF-Token",required=false)String token,
        @PathVariable long id,@Valid @RequestBody TransitionRequest body){configuration.cancelEvent(access.require(s,"events",token,true),id,body);}
    @GetMapping("/reservations") public ReservationPage reservations(HttpSession s,@RequestParam Instant from,
        @RequestParam Instant to,@RequestParam(defaultValue="1")int page,@RequestParam(defaultValue="25")int pageSize,
        @RequestParam(required=false)String status,@RequestParam(required=false)Long staffId,
        @RequestParam(defaultValue="false")boolean includeArchived){
        var actor=access.require(s,"reservations",null,false);range(from,to);
        if(page<1||page>10000||!List.of(10,25,50,100,200).contains(pageSize))throw new IllegalArgumentException("Invalid page.");
        if(status!=null&&!List.of("REQUESTED","CONFIRMED","COMPLETED","NO_SHOW","CANCELLED","PAUSED").contains(status))
            throw new IllegalArgumentException("Invalid status filter.");
        validateStaffFilter(actor,staffId);
        return repository.reservations(actor.companyId(),SchedulingAccessService.administrator(actor)?null:actor.userId(),from,to,page,pageSize,status,staffId,includeArchived);
    }
    @GetMapping("/staff-options") public List<StaffOption> staffOptions(HttpSession s){
        var actor=access.requireAny(s,List.of("calendar","reservations"),null,false);
        return repository.staff(actor.companyId()).stream().filter(t->SchedulingAccessService.administrator(actor)||t.userId()==actor.userId())
            .map(t->new StaffOption(t.id(),t.publicName(),t.timezone(),t.active())).toList();
    }
    private void validateStaffFilter(com.indice.erp.auth.AuthSessionUser actor,Long staffId){
        if(staffId==null)return;
        var staff=repository.staff(actor.companyId()).stream().filter(t->t.id()==staffId).findFirst().orElseThrow();
        SchedulingBookingService.requireOwner(actor,staff);
    }
    @GetMapping("/calendar-grid")
    @org.springframework.transaction.annotation.Transactional(readOnly=true)
    public CalendarWorkspace calendarGrid(HttpSession s,@RequestParam Instant from,@RequestParam Instant to,
        @RequestParam(required=false)Long staffId,@RequestParam(required=false)String status){
        var actor=access.requireAny(s,List.of("calendar","reservations"),null,false);range(from,to);validateStaffFilter(actor,staffId);
        if(to.isAfter(from.plusSeconds(43*86400L)))throw new IllegalArgumentException("Calendar scope is too wide.");
        if(status!=null&&!List.of("REQUESTED","CONFIRMED","COMPLETED","NO_SHOW","CANCELLED","PAUSED").contains(status))throw new IllegalArgumentException("Invalid status.");
        var rows=repository.reservations(actor.companyId(),SchedulingAccessService.administrator(actor)?null:actor.userId(),from,to,1,2000,status,staffId,false);
        var events=repository.calendarEvents(actor.companyId(),SchedulingAccessService.administrator(actor)?null:actor.userId(),from,to,staffId);
        return new CalendarWorkspace(rows.items(),rows.total(),events.items(),events.total());
    }
    @GetMapping("/calendar") public ReservationPage calendar(HttpSession s,@RequestParam Instant from,
        @RequestParam Instant to,@RequestParam(defaultValue="1")int page,@RequestParam(defaultValue="25")int pageSize,
        @RequestParam(required=false)Long staffId,@RequestParam(required=false)String status,@RequestParam(defaultValue="false")boolean includeArchived){
        var actor=access.require(s,"calendar",null,false);range(from,to);
        if(page<1||page>10000||!List.of(10,25,50,100,200).contains(pageSize))throw new IllegalArgumentException("Invalid page.");
        validateStaffFilter(actor,staffId);
        if(status!=null&&!List.of("REQUESTED","CONFIRMED","COMPLETED","NO_SHOW","CANCELLED","PAUSED").contains(status))throw new IllegalArgumentException("Invalid status.");
        return repository.reservations(actor.companyId(),SchedulingAccessService.administrator(actor)?null:actor.userId(),from,to,page,pageSize,status,staffId,includeArchived);
    }
    @GetMapping("/metrics") public Metrics metrics(HttpSession s,@RequestParam Instant from,@RequestParam Instant to){
        var actor=access.require(s,"indicators",null,false);range(from,to);
        return repository.metrics(actor.companyId(),SchedulingAccessService.administrator(actor)?null:actor.userId(),from,to);
    }
    @PostMapping("/reservations") public Submission reserve(HttpSession s,@RequestHeader(value="X-CSRF-Token",required=false)String token,
        @RequestHeader(value="Idempotency-Key",required=false)String requestKey,@Valid @RequestBody ReservationRequest body){
        var actor=access.require(s,"reservations",token,true);
        SchedulingBookingService.requireOwner(actor,booking.staff(actor.companyId(),body.staffId()));
        return booking.requestInternal(actor,body,requestKey);
    }
    @PostMapping("/reservations/{id}/status") public ReservationItem transition(HttpSession s,
        @RequestHeader(value="X-CSRF-Token",required=false)String token,@PathVariable long id,
        @Valid @RequestBody TransitionRequest body){return booking.transition(access.require(s,"reservations",token,true),id,body);}
    @PostMapping("/reservations/{id}/assignment") public ReservationItem reassign(HttpSession s,
        @RequestHeader(value="X-CSRF-Token",required=false)String token,@PathVariable long id,@Valid @RequestBody ReassignRequest body){
        return management.reassign(access.require(s,"reservations",token,true),id,body);
    }
    @PostMapping("/reservations/{id}/management") public ReservationItem manage(HttpSession s,
        @RequestHeader(value="X-CSRF-Token",required=false)String token,@PathVariable long id,@Valid @RequestBody ManageRequest body){
        return management.manage(access.require(s,"reservations",token,true),id,body);
    }
    @GetMapping("/catalog") public PublicWorkspace catalog(HttpSession s){
        var actor=access.requireAny(s,List.of("reservations","events"),null,false);long company=actor.companyId();
        var staff=repository.activeStaff(company).stream().filter(t->(SchedulingAccessService.administrator(actor)
            ||t.userId()==actor.userId())).map(t->new PublicStaff(t.id(),t.publicName(),t.timezone())).toList();
        return new PublicWorkspace("","","",repository.services(company).stream().filter(ServiceItem::active)
            .map(t->new PublicService(t.id(),t.name(),t.description(),t.durationMinutes(),t.noticeHours())).toList(),staff,List.of());
    }
    public record ShareLink(String publicUrl) { }
    @GetMapping("/links") public ShareLink links(HttpSession s){
        var actor=access.requireAny(s,List.of("configuration","events","reservations"),null,false);
        var page=repository.page(actor.companyId());
        return new ShareLink(flags.registryEnabled()&&flags.sessionsEnabled()&&flags.auditEnabled()
            &&flags.adapterEnabled("SCHEDULING")&&page.isPresent()&&page.get().published()?page.get().publicUrl():null);
    }
    @PostMapping("/slots") public SlotResponse slots(HttpSession s,@RequestHeader(value="X-CSRF-Token",required=false)String token,
        @Valid @RequestBody SlotRequest body){var actor=access.require(s,"reservations",token,true);
        SchedulingBookingService.requireOwner(actor,booking.staff(actor.companyId(),body.staffId()));
        return booking.slots(actor.companyId(),body);}
    static void range(Instant from,Instant to){if(!from.isBefore(to)||to.isAfter(from.plusSeconds(366*86400L)))
        throw new IllegalArgumentException("Invalid date scope.");}
}
