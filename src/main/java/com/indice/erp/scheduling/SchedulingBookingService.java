package com.indice.erp.scheduling;

import static com.indice.erp.scheduling.SchedulingDtos.*;
import com.indice.erp.auth.AuthSessionUser;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Isolation;
import com.indice.erp.access.module.ModuleAccessService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.JsonProcessingException;

@Service
public class SchedulingBookingService {
    private final SchedulingRepository repository;
    private final SchedulingResourceAvailabilityService resources;
    private final Clock clock;
    private final ModuleAccessService modules;
    private final ObjectMapper mapper;
    public SchedulingBookingService(SchedulingRepository repository,SchedulingResourceAvailabilityService resources,Clock clock,ModuleAccessService modules,ObjectMapper mapper){
        this.repository=repository;this.resources=resources;this.clock=clock;this.modules=modules;this.mapper=mapper;
    }
    public StaffItem staff(long company,long id) {
        var staff=repository.staff(company).stream().filter(s->s.id()==id&&s.active()).findFirst().orElseThrow();
        repository.memberEmail(company,staff.userId());return staff;
    }
    public ServiceItem service(long company,long id) {
        return repository.services(company).stream().filter(s->s.id()==id&&s.active()).findFirst().orElseThrow();
    }
    public SlotResponse slots(long company,SlotRequest request) {
        var staff=staff(company,request.staffId());var service=service(company,request.serviceId());
        var email=repository.memberEmail(company,staff.userId());
        return new SlotResponse(staff.timezone(),SchedulingSlotPolicy.candidates(service,staff,request.date(),clock.instant())
            .stream().filter(start->!resources.busy(email,start,
                start.plusSeconds((service.durationMinutes()+service.bufferMinutes())*60L),null,null,null)).toList());
    }
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public Submission requestInternal(AuthSessionUser actor,ReservationRequest request,String key) {
        if(key==null||!key.matches("[a-zA-Z0-9-]{16,80}"))throw new IllegalArgumentException("Request key required.");
        long company=actor.companyId();repository.lockCompany(company);requireOwner(actor,staff(company,request.staffId()));
        String hash=SchedulingHash.digest(key),fingerprint;
        try {fingerprint=SchedulingHash.digest(mapper.writeValueAsString(request));}
        catch(JsonProcessingException invalid){throw new IllegalArgumentException("Invalid request.");}
        var previous=repository.jdbc().query("SELECT request_fingerprint,reference,response_status FROM scheduling_capture_replays"
            +" WHERE company_id=? AND actor_user_id=? AND request_key=?",(r,n)->List.of(r.getString(1),r.getString(2),r.getString(3)),company,actor.userId(),hash);
        if(!previous.isEmpty()) {
            if(!previous.getFirst().getFirst().equals(fingerprint))throw new IllegalStateException("Request key conflict.");
            return new Submission(previous.getFirst().get(1),previous.getFirst().get(2),"REVIEW_REQUIRED");
        }
        var submitted=request(company,actor.userId(),request);
        repository.jdbc().update("INSERT INTO scheduling_capture_replays(company_id,actor_user_id,request_key,request_fingerprint,reference,response_status)"
            +" VALUES(?,?,?,?,?,?)",company,actor.userId(),hash,fingerprint,submitted.reference(),submitted.status());
        return submitted;
    }
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public Submission requestPublic(long company,long pageId,ReservationRequest request) {
        repository.lockCompany(company);
        var page=repository.page(company).orElseThrow();
        if(!page.published()||page.id()!=pageId||!modules.companyCanAccessForMutation(company,"scheduling"))
            throw new com.indice.erp.kiosk.engine.KioskUnavailableException();
        return request(company,null,request);
    }
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public Submission request(long company,Long actor,ReservationRequest request) {
        repository.lockCompany(company);var staff=staff(company,request.staffId());
        int duration,buffer;Instant start=request.startAt();
        if((request.serviceId()==null)==(request.eventId()==null))
            throw new IllegalArgumentException("Choose exactly one service or event.");
        if(request.eventId()!=null) {
            var event=repository.event(company,request.eventId());
            if(!event.published()||!event.status().equals("ACTIVE")||event.staffId()!=staff.id())
                throw new NoSuchElementException("Event unavailable.");
            if(!event.startAt().isAfter(clock.instant())||event.confirmedCount()>=event.capacity())
                throw new IllegalStateException("Event unavailable.");
            if(!event.startAt().equals(start))throw new IllegalArgumentException("Invalid event time.");
            var existing=repository.jdbc().query("""
                SELECT reference,status FROM scheduling_reservations WHERE company_id=? AND event_id=? AND attendee_email=?
                  AND status IN ('REQUESTED','CONFIRMED','PAUSED') AND archived_at IS NULL
                """,(r,n)->new Submission(r.getString(1),r.getString(2),"REVIEW_REQUIRED"),company,request.eventId(),email(request.attendeeEmail()));
            if(!existing.isEmpty())return existing.getFirst();
            duration=event.durationMinutes();buffer=0;
        }else {
            var service=service(company,request.serviceId());
            var date=start.atZone(ZoneId.of(staff.timezone())).toLocalDate();
            if(!slots(company,new SlotRequest(service.id(),staff.id(),date)).starts().contains(start))
                throw new IllegalStateException("Requested slot is unavailable.");
            duration=service.durationMinutes();buffer=service.bufferMinutes();
        }
        String reference="SCH-"+UUID.randomUUID().toString().replace("-","").substring(0,24);
        long id=repository.insert("""
            INSERT INTO scheduling_reservations(company_id,staff_id,service_id,event_id,reference,attendee_name,
              attendee_email,attendee_company,attendee_phone,start_at,duration_minutes,buffer_minutes,consent_at)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
            """,company,staff.id(),request.serviceId(),request.eventId(),reference,request.attendeeName().trim(),
            email(request.attendeeEmail()),SchedulingConfigurationService.text(request.attendeeCompany()),
            SchedulingConfigurationService.text(request.attendeePhone()),Timestamp.from(start),duration,buffer,Timestamp.from(clock.instant()));
        repository.audit(company,actor,"RESERVATION",id,"RESERVATION_REQUESTED");
        return new Submission(reference,"REQUESTED","REVIEW_REQUIRED");
    }
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public ReservationItem transition(AuthSessionUser actor,long id,TransitionRequest request) {
        long company=actor.companyId();repository.lockCompany(company);var current=repository.reservation(company,id);
        var staff=repository.staff(company).stream().filter(t->t.id()==current.staffId()).findFirst().orElseThrow();
        requireOwner(actor,staff);
        if(current.archivedAt()!=null)throw new IllegalStateException("Reservation is archived.");
        if(current.version()!=request.version())throw new IllegalStateException("Reservation changed.");
        SchedulingSlotPolicy.transition(current.status(),request.status(),current.startAt(),clock.instant(),request.reason());
        if(current.status().equals(request.status()))return current;
        if(request.status().equals("CONFIRMED")) validateConfirmation(company,current,staff);
        SchedulingConfigurationService.checked(repository.jdbc().update("""
            UPDATE scheduling_reservations SET status=?,reason=?,paused_from_status=NULL,version=version+1 WHERE company_id=? AND id=? AND version=?
            """,request.status(),SchedulingConfigurationService.text(request.reason()),company,id,request.version()));
        repository.audit(company,actor.userId(),"RESERVATION",id,"RESERVATION_"+request.status());
        return repository.reservation(company,id);
    }
    void validateConfirmation(long company,ReservationItem current,StaffItem staff) {
            if(!staff.active())throw new IllegalStateException("Consultant is inactive.");
            if(!current.startAt().isAfter(clock.instant()))throw new IllegalStateException("Session must be in the future.");
            if(current.eventId()!=null) {
                var event=repository.event(company,current.eventId());
                if(!event.status().equals("ACTIVE"))throw new IllegalStateException("Event unavailable.");
                if(event.confirmedCount()>=event.capacity())throw new IllegalStateException("Event capacity reached.");
                if(event.staffId()!=staff.id()||!event.startAt().equals(current.startAt())
                    ||event.durationMinutes()!=current.durationMinutes())throw new IllegalStateException("Event changed; create a new request.");
                resources.requireFree(repository.memberEmail(company,staff.userId()),current.startAt(),current.durationMinutes(),
                    current.id(),event.id(),null);
            }else {
                var service=service(company,current.serviceId());
                int buffer=repository.jdbc().queryForObject("SELECT buffer_minutes FROM scheduling_reservations WHERE company_id=? AND id=?",
                    Integer.class,company,current.id());
                var snapshot=new ServiceItem(service.id(),service.name(),service.description(),current.durationMinutes(),buffer,0,true,service.version());
                var date=current.startAt().atZone(ZoneId.of(staff.timezone())).toLocalDate();
                if(!SchedulingSlotPolicy.candidates(snapshot,staff,date,clock.instant()).contains(current.startAt()))
                    throw new IllegalStateException("Availability changed.");
                resources.requireFree(repository.memberEmail(company,staff.userId()),current.startAt(),current.durationMinutes()+buffer,current.id(),null,null);
            }
    }
    public static void requireOwner(AuthSessionUser actor,StaffItem staff) {
        if(!SchedulingAccessService.administrator(actor)&&staff.userId()!=actor.userId())
            throw new SecurityException("Reservation is outside the operator scope.");
    }
    private static String email(String email){return email.trim().toLowerCase(Locale.ROOT);}
}
